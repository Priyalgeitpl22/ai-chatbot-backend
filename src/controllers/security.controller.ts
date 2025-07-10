import { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../utils/encryption.utils'

const prisma = new PrismaClient();

export const generateTOTP = async (req: any, res: any) => {
  try {
    const user = req.user;

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organization: true },
    });

    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!userData.organization?.enable_totp_auth) {
      return res.status(403).json({ message: '2FA not enabled for your org' });
    }

    const secret = speakeasy.generateSecret({ name: `Jooper AI (${userData.email})` });
    const encryptedSecret = encrypt(secret.base32);

    await prisma.user.update({
      where: { id: userData.id },
      data: { temp_2fa_secret: encryptedSecret },
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    res.json({ qrCode, secret: secret.base32 });

  } catch (error) {
    console.error('Error in generateTOTP:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


export const verifyTOTP = async (req: any, res: any) => {

  const user = req.user;
  const { token } = req.body;

  const secret = decrypt(user.temp_2fa_secret);


  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1
  });

  if (!verified) return res.status(400).json({ message: 'Invalid OTP' });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      enable_2fa: true,
      two_fa_secret: user.temp_2fa_secret,
      temp_2fa_secret: null
    }
  });

  res.json({ message: '2FA enabled' });
};

export const disableTOTP = async (req: any, res: any) => {
  const user = req.user;
  const { token } = req.body;

  const secret = decrypt(user.two_fa_secret);

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1
  });

  if (!verified) return res.status(400).json({ message: 'Invalid OTP' });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      enable_2fa: false,
      two_fa_secret: null
    }
  });

  res.json({ message: '2FA disabled' });
};

export const userProfile = async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        orgId: user.orgId,
        enable_2fa: user.enable_2fa || false,
      },
    });
  } catch (error) {
    console.error("Error in userProfile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};