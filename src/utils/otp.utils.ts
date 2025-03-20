import { randomBytes } from 'crypto';

export const generateOtp = (): { code: string, expiresAt: Date } => {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + 90);
  return { code: otpCode, expiresAt };
};

export const generateRandomPassword = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters[randomIndex];
  }
  return password;
};

export const generateRandomToken = (length: number = 32, expiresInSeconds: number = 3600) => {
  const token = randomBytes(length).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  return { token, expiresAt };
};
