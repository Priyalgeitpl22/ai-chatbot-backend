import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendOrganizationDetails } from '../middlewares/botMiddleware';
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { SocksProxyAgent } from "socks-proxy-agent"; 
import { sendEmailToVerify } from '../utils/email.utils';


const prisma = new PrismaClient();

export const saveOrganization = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, domain, country, phone } = req.body;

    if (!name || !domain || !country || !phone) {
      return res.status(400).json({
        code: 400,
        message: "All fields (name, domain, country, phone) are required."
      });
    }

    const organization = await prisma.organization.create({
      data: { name, domain, country, phone }
    });

    res.status(200).json({
      code: 200,
      data: organization,
      message: "Organization created successfully"
    });

  } catch (err) {
    console.error('Error saving organization:', err);
    res.status(500).json({
      code: 500,
      message: "Error saving organization"
    });
  }
};

export const getOrganization = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      res.status(400).json({ code: 400, message: "Organization ID is required" });
    }

    const organization = await prisma.organization.findFirst({
      where: { id: orgId as string }
    });

    if (!organization) {
      res.status(404).json({ code: 404, message: "Organization not found" });
    }

    res.status(200).json({
      data: organization,
      message: "Organization details fetched successfully",
      code: 200
    });

  } catch (err) {
    console.error("Error fetching organization details:", err);
    res.status(500).json({ code: 500, message: "Error fetching organization details" });
  }
};

export const updateOrganization = async (req: Request, res: Response): Promise<any> => {
  try {
    const orgId = req.query.orgId as string;
    const { name, domain, country, city, state, zip, industry, phone, address, aiOrgId, description, emailConfig } = req.body;

    if (!orgId) {
      return res.status(400).json({
        code: 400,
        message: "Organization ID is required."
      });
    }

    const existingOrg = await prisma.organization.findUnique({ where: { id: orgId } });

    if (!existingOrg) {
      return res.status(404).json({
        code: 404,
        message: "Organization not found."
      });
    }

    const organizationData = {
      name: name ?? existingOrg.name,
      domain: domain ?? existingOrg.domain,
      address: address ?? existingOrg.address,
      country: country ?? existingOrg.country,
      city: city ?? existingOrg.city,
      state: state ?? existingOrg.state,
      zip: Number(zip) ?? existingOrg.zip,
      industry: industry ?? existingOrg.industry,
      phone: phone ?? existingOrg.phone,
      description: description ?? existingOrg.description,
      emailConfig: emailConfig ?? existingOrg.emailConfig
    }

    const updatedOrganization = await prisma.organization.update({
      where: { id: orgId },
      data: organizationData
    });

    const aiOrganization = await sendOrganizationDetails({ ...organizationData, zip: organizationData.zip.toString() }, aiOrgId);

    res.status(200).json({
      code: 200,
      data: updatedOrganization,
      message: "Organization updated successfully"
    });

  } catch (err) {
    console.error("Error updating organization:", err);
    res.status(500).json({
      code: 500,
      message: "Error updating organization"
    });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<any> => {
  try {
    const orgId = req.query.orgId as string;
    const { host, port, secure, user, pass, proxy, smtpEhloName } = req.body;

    if (!orgId) {
      return res.status(400).json({ code: 400, message: "Organization ID is required." });
    }

    if (!host || !port || !user || !pass) {
      return res.status(400).json({ code: 400, message: "SMTP configuration is incomplete." });
    }

    const transporterOptions: SMTPTransport.Options = {
      host,
      port,
      secure: !!secure,
      auth: {
        user: user,
        pass: pass,
      },
      name: smtpEhloName || undefined, 
    };

    if (proxy) {
      const proxyAgent = new SocksProxyAgent(proxy);
      (transporterOptions as any).agent = proxyAgent; 
    }

    const transporter = nodemailer.createTransport(transporterOptions);

    await transporter.verify();
    await sendEmailToVerify(transporterOptions);

    return res.status(200).json({ code: 200, message:"SMTP Configuration Verified Successfully!" });

  } catch (err: any) {
    console.error("Error verifying SMTP email:", err);
    return res.status(500).json({
      code: 500,
      message: "Error verifying email",
      error: err.message,
    });
  }
};
