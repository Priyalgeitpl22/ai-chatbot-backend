import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOtpEmail, sendResetPasswordEmail } from '../utils/email.utils';
import { generateOtp, generateRandomToken } from '../utils/otp.utils';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from "multer";
import { uploadImageToS3 } from '../aws/imageUtils';
import { UserRoles } from '../enums';
import { sendOrganizationDetails } from '../middlewares/botMiddleware';
import speakeasy from 'speakeasy';
import { decrypt } from '../utils/encryption.utils';

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() }).single("profilePicture");

export const register = async (req: Request, res: Response): Promise<any> => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ code: 400, message: "File upload failed", error: err });
        }

        const { email, fullName, orgName, industry, country, phone, password } = req.body;

        try {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                if (!existingUser.verified) {
                    await prisma.user.delete({ where: { email } });
                } else {
                    return res.status(400).json({ code: 400, message: "User already exists" });
                }
            }

            const organizationData = {
                name: orgName,
                industry,
                country,
                phone
            }

            const aiOrganization = await sendOrganizationDetails(organizationData, null);

            const organization = await prisma.organization.create({
                data: { aiOrgId: Number(aiOrganization.organisation_id), ...organizationData },
            });

            const hashedPassword = await bcrypt.hash(password, 10);
            const otp = generateOtp();

            let profilePictureUrl: string | null = null;
            if (req.file) {
                profilePictureUrl = await uploadImageToS3(req.file);
            }

            await prisma.user.create({
                data: {
                    email,
                    fullName,
                    role: UserRoles.ADMIN,
                    orgId: organization.id,
                    aiOrgId: Number(aiOrganization.organisation_id),
                    password: hashedPassword,
                    otpCode: otp.code,
                    otpExpiresAt: otp.expiresAt,
                    profilePicture: profilePictureUrl,
                    phone: phone,
                    verified: false
                },
            });

            await sendOtpEmail(email, otp.code);
            res.status(201).json({ code: 200, otpExpireTime: otp.expiresAt, message: "User registered. Please verify your email with OTP." });
        } catch (error) {
            console.error("Error:", error);
            res.status(500).json({ code: 500, message: "Server error", error });
        }
    });
};

export const verifyOtp = async (req: Request, res: Response): Promise<any> => {
    const { email, otp } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ code: 404, message: 'User not found' });

        if (!user.otpCode || user.otpCode !== otp) {
            return res.status(400).json({ code: 400, message: 'Invalid OTP' });
        }

        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
            return res.status(400).json({ code: 400, message: 'OTP has expired' });
        }

        await prisma.user.update({
            where: { email },
            data: { verified: true, otpCode: null, otpExpiresAt: null }
        });

        res.status(200).json({ code: 200, message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ code: 500, message: 'Server error' });
    }
};



export const forgetPassword = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (!existingUser) {
            return res.status(400).json({ message: "User not found" });
        }

        const tokenData = generateRandomToken(32, 3600);

        const resetPasswordLink = `${process.env.FRONTEND_URL}/reset-password?token=${tokenData.token}&email=${email}`;
        await sendResetPasswordEmail(email, existingUser.fullName, resetPasswordLink);

        await prisma.user.update({
            where: { email },
            data: { resetToken: tokenData.token, resetTokenExpires: tokenData.expiresAt },
        });

        res.status(200).json({ code: 200, message: "Reset password mail sent successfully" });
    } catch (err) {
        console.error("Error activating account:", err);
        res.status(500).json({ message: "Error activating account" });
    }
}

export const resetPassword = async (req: Request, res: Response): Promise<any> => {
    try {
        const { token, password, email } = req.body;

        if (!token || !password || !email) {
            return res.status(400).json({ message: "Token, password and email are required" });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.resetToken || user.resetToken !== token)
            return res.status(400).json({ message: "Invalid or expired token" });

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword, resetToken: null, resetTokenExpires: null },
        });

        res.status(200).json({ code: 200, message: "Password changed successfully" });

    } catch (err) {
        console.error("Error activating account:", err);
        res.status(500).json({ message: "Something went wrong" });
    }
};

export const changePassword = async (req: Request, res: Response): Promise<any> => {
    const { email, existingPassword, newPassword } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isPasswordValid = await bcrypt.compare(existingPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Existing password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return res.status(403).json({ code: 403, message: 'Invalid user' });

        if (!user.verified) {
            return res.status(403).json({ code: 403, message: 'Please verify your email first.' });
        }

        const isUserValid = await bcrypt.compare(password, user.password)

        if (!isUserValid) {
            return res.status(401).json({ code: 401, message: 'Invalid credentials' });
        }

        
        if (user.enable_2fa && user.two_fa_secret) {
            // Issue a temp token for OTP step
            const tempToken = jwt.sign({ id: user.id, twofa: true }, process.env.JWT_SECRET as string, { expiresIn: '10m' });
            return res.status(200).json({ require2FA: true, tempToken });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

        await prisma.access_token.create({
            data: {
                user_id: user.id,
                active: 1,
                expiry_datetime: new Date(Date.now() + 3600 * 1000),
                token,
            },
        });

        res.status(200).json({ code: 200, token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ code: 500, message: 'Server error' });
    }
};

export const verify2FA = async (req: Request, res: Response): Promise<any> => {
    const { tempToken, otp } = req.body;
    try {
        const payload = jwt.verify(tempToken, process.env.JWT_SECRET as string) as any;
        if (!payload.twofa) throw new Error();
        const user = await prisma.user.findUnique({ where: { id: payload.id } });
        if (!user || !user.enable_2fa || !user.two_fa_secret) return res.status(401).json({ message: 'Unauthorized' });

        const decryptedSecret = decrypt(user.two_fa_secret);
        const isValid = speakeasy.totp.verify({
            secret: decryptedSecret,
            encoding: 'base32',
            token: otp,
        });
        if (!isValid) return res.status(401).json({ message: 'Invalid OTP' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
        await prisma.access_token.create({
            data: {
                user_id: user.id,
                active: 1,
                expiry_datetime: new Date(Date.now() + 3600 * 1000),
                token,
            },
        });
        res.status(200).json({ code: 200, token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (err) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

export const logout = async (req: Request, res: Response): Promise<any> => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(400).json({ code: 400, message: 'No token provided' });
    }

    try {
        await prisma.access_token.updateMany({
            where: { token },
            data: { active: 0 },
        });

        res.status(200).json({ code: 200, message: 'User logged out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, message: 'Server error' });
    }
};

export const activateAccount = async (req: Request, res: Response): Promise<any> => {
    try {
        const { token, password, email } = req.body;

        if (!token || !password || !email) {
            return res.status(400).json({ code: 400, message: "Token, password and email are required" });
        }

        const agent = await prisma.user.findUnique({ where: { email } });

        if (!agent?.activationToken === token)
            return res.status(400).json({ code: 400, message: "Invalid or expired token" });

        if (!agent) {
            return res.status(404).json({ code: 404, message: "Agent not found" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { email: agent.email },
            data: { password: hashedPassword, activationToken: null, activationTokenExpires: null, verified: true },
        });

        res.status(200).json({ code: 200, message: "Account activated successfully" });
    } catch (err) {
        console.error("Error activating account:", err);
        res.status(500).json({ code: 500, message: "Error activating account" });
    }
};

export const resendOtp = async (req: Request, res: Response): Promise<any> => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ code: 404, message: "User not found" });
        if (user.otpExpiresAt && user.otpExpiresAt > new Date()) {
            return res.status(429).json({
                code: 429,
                message: "OTP is still valid. Please wait before requesting a new OTP.",
            });
        }
        const otp = generateOtp();
        await prisma.user.update({
            where: { email },
            data: { otpCode: otp.code, otpExpiresAt: otp.expiresAt },
        });
        await sendOtpEmail(email, otp.code);
        res
            .status(200)
            .json({ code: 200, otp: otp.expiresAt, message: "New OTP sent. Please check your email." });
    } catch (error) {
        res.status(500).json({ code: 500, message: "Server error" });
    }
};

