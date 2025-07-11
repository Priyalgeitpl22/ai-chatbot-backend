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
      include: {
        organization: true,
        twoFactorAuth: true
      },
    });

    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!userData.organization?.enable_totp_auth && userData.role !== 'Admin') {
      return res.status(403).json({ message: '2FA not enabled for your org' });
    }

    const secret = speakeasy.generateSecret({ name: `Jooper AI (${userData.email})` });
    const encryptedSecret = encrypt(secret.base32);

    if (userData.twoFactorAuth) {
      await prisma.twoFactorAuth.update({
        where: { userId: userData.id },
        data: {
          tempSecret: encryptedSecret,
          isAuthenticatorAppAdded: true,
          authenticatorAppAddedAt: new Date()
        }
      });
    } else {
      await prisma.twoFactorAuth.create({
        data: {
          userId: userData.id,
          tempSecret: encryptedSecret,
          isAuthenticatorAppAdded: true,
          authenticatorAppAddedAt: new Date()
        }
      });
    }

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    res.json({ qrCode, secret: secret.base32 });

  } catch (error) {
    console.error('Error in generateTOTP:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const verifyTOTP = async (req: any, res: any) => {
  try {
    const user = req.user;
    const { token } = req.body;

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: user.id }
    });

    if (!twoFactorAuth || !twoFactorAuth.tempSecret) {
      return res.status(400).json({ message: 'No pending 2FA setup found' });
    }

    const secret = decrypt(twoFactorAuth.tempSecret);

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) return res.status(400).json({ message: 'Invalid OTP', code: 400 });

    await prisma.twoFactorAuth.update({
      where: { userId: user.id },
      data: {
        isEnabled: true,
        secret: twoFactorAuth.tempSecret,
        tempSecret: null,
        enabledAt: new Date()
      }
    });

    await prisma.organization.update({
      where: { id: user.orgId },
      data: {
        enable_totp_auth: true
      }
    });

    res.json({ message: '2FA enabled', code: 200 });
  } catch (error) {
    console.error('Error in verifyTOTP:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const disableTOTP = async (req: any, res: any) => {
  try {
    const user = req.user;
    const { token } = req.body;

    const twoFactorAuth = await prisma.twoFactorAuth.findFirst({
      where: { userId: user.id }
    });

    if (!twoFactorAuth || !twoFactorAuth.secret) {
      return res.status(400).json({ message: '2FA not enabled for this user', code: 400 });
    }

    const secret = decrypt(twoFactorAuth.secret);

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) return res.status(400).json({ message: 'Invalid OTP', code: 400 });

    await prisma.twoFactorAuth.update({
      where: { userId: user.id },
      data: {
        isEnabled: false,
        secret: null,
        tempSecret: null,
        enabledAt: null,
        authenticatorAppAddedAt: null
      }
    });

    if(user.role === 'Admin') {
      await prisma.organization.update({
        where: { id: user.orgId },
        data: { enable_totp_auth: false }
      });

      const orgUsers = await prisma.user.findMany({
        where: { orgId: user.orgId },
        select: { id: true }
      });

      for (const orgUser of orgUsers) {
        await prisma.twoFactorAuth.updateMany({
          where: { userId: orgUser.id },
          data: {
            isEnabled: false,
            secret: null,
            tempSecret: null,
            enabledAt: null,
            authenticatorAppAddedAt: null
          }
        });
      }
    }

    res.json({ message: '2FA disabled', code: 200 });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const userProfile = async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        twoFactorAuth: true
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
        enable_2fa: user.twoFactorAuth?.isEnabled || false,
        authenticatorAppAdded: user.twoFactorAuth?.isAuthenticatorAppAdded || false,
        twoFAEnabledAt: user.twoFactorAuth?.enabledAt,
        authenticatorAppAddedAt: user.twoFactorAuth?.authenticatorAppAddedAt
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const get2FAStatus = async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId }
    });

    res.json({
      isEnabled: twoFactorAuth?.isEnabled || false,
      isAuthenticatorAppAdded: twoFactorAuth?.isAuthenticatorAppAdded || false,
      enabledAt: twoFactorAuth?.enabledAt,
      authenticatorAppAddedAt: twoFactorAuth?.authenticatorAppAddedAt,
      hasBackupCodes: twoFactorAuth?.backupCodes && twoFactorAuth.backupCodes.length > 0
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const generateBackupCodes = async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId }
    });

    if (!twoFactorAuth?.isEnabled) {
      return res.status(400).json({ message: '2FA must be enabled to generate backup codes' });
    }

    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );

    const hashedCodes = backupCodes.map(code => encrypt(code));

    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { backupCodes: hashedCodes }
    });

    res.json({
      backupCodes,
      message: 'Backup codes generated successfully. Store them safely!'
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};