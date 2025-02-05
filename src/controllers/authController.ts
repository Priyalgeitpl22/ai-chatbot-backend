import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendOtpEmail } from '../utils/email.utils';
import { generateOtp } from '../utils/otp.utils';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const register = async (req: Request, res: Response): Promise<any> => {
    const { email, fullName, orgName, domain, country, phone, password } = req.body;
    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const organization = await prisma.organization.create({
            data: { name: orgName, domain, country, phone }
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        const otp = generateOtp();

        await prisma.user.create({
            data: {
                email,
                fullName,
                orgId: organization.id,
                password: hashedPassword,
                otpCode: otp.code,
                otpExpiresAt: otp.expiresAt,
            }
        });

        await sendOtpEmail(email, otp.code);
        res.status(201).json({ message: 'User registered. Please verify your email with OTP.' });
    } catch (error) {
        res.status(500).json({ message: error });
    }
};

export const verifyOtp = async (req: Request, res: Response): Promise<any> => {
    const { email, otp } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.otpCode || user.otpCode !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        await prisma.user.update({
            where: { email },
            data: { verified: true, otpCode: null, otpExpiresAt: null }
        });

        res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<any> => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const otp = generateOtp();
        await prisma.user.update({
            where: { email },
            data: { resetToken: otp.code, resetTokenExpires: otp.expiresAt }
        });

        await sendOtpEmail(email, otp.code);
        res.status(200).json({ message: 'Password reset OTP sent' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
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

        if (!user) return res.status(403).json({ message: 'Invalid user' });

        if (!user.verified) {
            return res.status(403).json({ message: 'Please verify your email first.' });
        }

        const isUserValid = await bcrypt.compare(password, user.password)

        if (!isUserValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
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

        res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const logout = async (req: Request, res: Response): Promise<any> => {
    const token = req.headers.authorization?.split(" ")[1]; 

    if (!token) {
        return res.status(400).json({ message: 'No token provided' });
    }

    try {
        await prisma.access_token.updateMany({
            where: { token },
            data: { active: 0 },
        });

        res.status(200).json({ message: 'User logged out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

