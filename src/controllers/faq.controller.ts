import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createFAQ = async (req: any, res: any) => {
  const { question, answer,orgId } = req.body;
  if (!orgId || !question || !answer) {
    return res.status(400).json({ message: 'orgId, question, and answer are required.' });
  }
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { aiEnabled: true },
    });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found.' });
    }
    if (!org.aiEnabled) {
      return res.status(403).json({ message: 'AI is not enabled for this organization.' });
    }
    const faq = await prisma.fAQ.create({
      data: {
        orgId: orgId,
        question,
        answer,
      },
    });
    return res.status(201).json(faq);
  } catch (error) {
    console.error('Error creating FAQ:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};