import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { uploadImageToS3, getPresignedUrl } from '../aws/imageUtils';
import pdfParse from 'pdf-parse';

import mammoth from 'mammoth';
const prisma = new PrismaClient();

export const createFAQ = async (req: any, res: any) => {
  const { faqs, orgId, question, answer, userId } = req.body;

  let faqsArray = [];

  if (faqs && Array.isArray(faqs)) {
    faqsArray = faqs;
  } else if (question && answer && orgId) {
    faqsArray = [{ question, answer }];
  } else {
    return res.status(400).json({ message: 'Either provide faqs array or individual question, answer, and orgId fields.' });
  }

  if (faqsArray.length === 0) {
    return res.status(400).json({ message: 'At least one FAQ is required.' });
  }

  for (const faq of faqsArray) {
    if (!faq.question || !faq.answer) {
      return res.status(400).json({ message: 'Each FAQ must have question and answer fields.' });
    }
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

    const user = req.user;

    if (!user || user.orgId !== orgId) {
      return res.status(400).json({ message: 'User does not belong to this organization.' });
    }

    const currentUserId = user.id;

    const createdFaqs = await prisma.fAQ.createMany({
      data: faqsArray.map(faq => ({
        orgId: orgId,
        question: faq.question,
        answer: faq.answer,
        userId: currentUserId
      })),
    });

    const createdFaqsList = await prisma.fAQ.findMany({
      where: {
        orgId: orgId,
        userId: currentUserId,
        createdAt: {
          gte: new Date(Date.now() - 1000)
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: faqsArray.length
    });

    return res.status(201).json({
      message: `Successfully created ${createdFaqs.count} FAQs`,
      faqs: createdFaqsList
    });
  } catch (error) {
    console.error('Error creating FAQs:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const getFAQsByOrgId = async (req: any, res: any) => {
  const { orgId } = req.params;

  if (!orgId) {
    return res.status(400).json({ message: 'Organization ID is required.' });
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

    const user = req.user;

    if (!user || user.orgId !== orgId) {
      return res.status(403).json({ message: 'User does not belong to this organization.' });
    }

    const isAdmin = req.user && req.user.role === 'Admin';
    const faqs = await prisma.fAQ.findMany({
      where: {
        orgId: orgId,
        ...(isAdmin ? {} : { enabled: true })
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        question: true,
        answer: true,
        enabled: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    return res.status(200).json({
      message: `Successfully retrieved ${faqs.length} FAQs`,
      faqs: faqs
    });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};



export const uploadFaqFile = async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let fileContent = '';
    if (req.file.mimetype === 'application/pdf') {
      fileContent = (await pdfParse(req.file.buffer)).text;
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      fileContent = (await mammoth.extractRawText({ buffer: req.file.buffer })).value;
    } else {
      fileContent = 'Preview not supported for this file type.';
    }

    const fileUrl = await uploadImageToS3(req.file);

    const uploadedFile = await prisma.fAQ.create({
      data: {
        fileName: req.file.originalname,
        fileUrl: fileUrl,
        answer: req.body.answer || '',
        question: req.body.question || '',
        uploadedBy: req.user.id,
        uploadedAt: new Date(),
        orgId: req.user.orgId || req.body.orgId || undefined,
        fileContent: fileContent,
      },
    });


    return res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        id: uploadedFile.id,
        fileName: uploadedFile.fileName,
        fileUrl: uploadedFile.fileUrl,
        question: uploadedFile.question,
        answer: uploadedFile.answer,
        uploadedBy: uploadedFile.uploadedBy,
        uploadedAt: uploadedFile.uploadedAt,
        fileContent: uploadedFile.fileContent,
        type: req.file.mimetype
      }
    });
  } catch (error: any) {
    console.error('File upload error:', error.message);
    res.status(500).json({ message: 'File upload failed' });
  }
};

export const getPresignedUrlHandler = async (req: any, res: any) => {
  try {
    const fileKey = req.params.fileKey;

    if (!fileKey) {
      return res.status(400).json({ message: "File key is required" });
    }

    const url = await getPresignedUrl(fileKey);
    console.log(url);


    return res.status(200).json({ url });
  } catch (error) {
    console.error("Presigned URL handler error:", error);
    return res.status(500).json({ message: "Failed to generate presigned URL" });
  }
};

export const updateFAQStatus = async (req: any, res: any) => {
  const { id } = req.params;
  const { enabled } = req.body;

  // Check if user is admin
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }

  try {
    const updatedFAQ = await prisma.fAQ.update({
      where: { id: id },
      data: { enabled: Boolean(enabled) },
    });

    return res.status(200).json({ message: 'FAQ status updated', faq: updatedFAQ });
  } catch (error) {
    console.error('Error updating FAQ status:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};