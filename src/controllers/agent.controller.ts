import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateRandomToken } from '../utils/otp.utils';
import multer from "multer";
import { getPresignedUrl, uploadImageToS3 } from '../aws/imageUtils';
import { sendActivationEmail } from '../utils/email.utils';

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() }).single("profilePicture");

export const createAgent = async (req: Request, res: Response): Promise<any> => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ code: 400, message: "Error uploading file", error: err.message });
            }

            const { email, fullName, orgId, aiOrgId, schedule, role, phone } = req.body;

            if (!email ) {
                return res.status(400).json({
                    code: 400,
                    message: "Email is required"
                });
            }

            const existingAgent = await prisma.user.findUnique({ where: { email } });
            if (existingAgent) {
                return res.status(400).json({ code: 400, message: "Agent already exists" });
            }

            let profilePictureUrl: string | null = null;
            if (req.file) {
                profilePictureUrl = await uploadImageToS3(req.file);
            }

            const tokenData = generateRandomToken(32, 3600);

            const agent = await prisma.user.create({
                data: {
                    email,
                    fullName,
                    role,
                    orgId,
                    aiOrgId: Number(aiOrgId),
                    phone,
                    password: '12345',
                    activationToken: tokenData.token,
                    activationTokenExpires: tokenData.expiresAt,
                    profilePicture: profilePictureUrl,
                    schedule: schedule
                },
                select: { fullName: true, email: true, id: true, role: true, orgId: true, profilePicture: true, aiOrgId: true }
            });

            let profilePicture;
            if(profilePictureUrl) {
                profilePicture = await getPresignedUrl(profilePictureUrl);
            }

            const activationLink = `${process.env.FRONTEND_URL}/activate-account?token=${tokenData.token}&email=${agent.email}`;
            await sendActivationEmail(agent.email, agent.fullName, activationLink);

            res.status(200).json({
                code: 200,
                data: {...agent, profilePicture},
                message: "Agent created successfully. Activation email sent.",
            });
        });

    } catch (err) {
        console.error("Error saving agent:", err);
        res.status(500).json({
            code: 500,
            message: "Error saving agent",
        });
    }
};

export const getAgents = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orgId } = req.params;

        if (!orgId) {
            res.status(400).json({ code: 400, message: "orgId is required" });
        }

        const agents = await prisma.user.findMany({
            where: { orgId: orgId as string,deletedAt: null },
            select: { fullName: true, email: true, id: true, role: true, orgId: true, profilePicture: true, phone: true, schedule: true, deletedAt:true }
        });

        if (!agents) {
            res.status(404).json({ code: 404, message: "Agent not found" });
        }

        if (agents.length > 0) {
            for (const agent of agents) {
                if (agent.profilePicture) {
                    agent.profilePicture = await getPresignedUrl(agent.profilePicture);
                }
            }
        }

        res.status(200).json({
            data: agents,
            message: "Agent details fetched successfully",
            code: 200
        });

    } catch (err) {
        console.error("Error fetching agent details:", err);
        res.status(500).json({ code: 500, message: "Error fetching agent details" });
    }
};

export const getAgent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (!id) {
            res.status(400).json({ code: 400, message: "agent id is required" });
        }

        const agent = await prisma.user.findFirst({
            where: { id: id as string, role: 'Agent' },
            select: { fullName: true, email: true, id: true, role: true, orgId: true, profilePicture: true, phone: true, schedule: true }
        });

        if (!agent) {
            res.status(404).json({ code: 404, message: "Agent not found" });
        }

        if (agent && agent.profilePicture) {
            agent.profilePicture = await getPresignedUrl(agent.profilePicture);
        }

        res.status(200).json({
            data: agent,
            message: "Agent details fetched successfully",
            code: 200
        });

    } catch (err) {
        console.error("Error fetching agent details:", err);
        res.status(500).json({ code: 500, message: "Error fetching agent details" });
    }
};

export const updateAgent = async (req: Request, res: Response): Promise<any> => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ code: 400, message: "Error uploading file", error: err.message });
            }

            const id = req.query.id as string;

            const { email, fullName, phone, orgId, schedule, role, aiOrgId } = req.body;

            if (!id) {
                return res.status(400).json({ code: 400, message: "Agent ID is required." });
            }

            const existingAgent = await prisma.user.findUnique({ where: { id } });
            if (!existingAgent) {
                return res.status(404).json({ code: 404, message: "Agent not found" });
            }

            let profilePictureUrl: string | null = existingAgent.profilePicture;
            if (req.file) {
                profilePictureUrl = await uploadImageToS3(req.file);
            }

            const updatedAgent = await prisma.user.update({
                where: { id },
                data: {
                    email: email || existingAgent.email,
                    fullName: fullName || existingAgent.fullName,
                    phone: phone || existingAgent.phone,
                    role: role || existingAgent.role,
                    aiOrgId: Number(aiOrgId) || existingAgent.aiOrgId,
                    orgId: orgId || existingAgent.orgId,
                    profilePicture: profilePictureUrl,
                    schedule: schedule || existingAgent.schedule,
                },
                select: { fullName: true, email: true, id: true, role: true, orgId: true, profilePicture: true }
            });

            let profilePicture;
            if(profilePictureUrl) {
                profilePicture = await getPresignedUrl(profilePictureUrl);
            }

            res.status(200).json({
                code: 200,
                data: {...updatedAgent, profilePicture},
                message: "Agent updated successfully.",
            });
        });

    } catch (err) {
        console.error("Error updating agent:", err);
        res.status(500).json({
            code: 500,
            message: "Error updating agent",
        });
    }
};

export const softDeleteAgent = async (req: Request, res: Response): Promise<any> => {
    try {
        const {id} = req.params;

        if (!id) {
            return res.status(400).json({ code: 400, message: "Agent ID is required." });
        }

        const existingAgent = await prisma.user.findUnique({ where: { id } });
        if (!existingAgent) {
            return res.status(404).json({ code: 404, message: "Agent not found." });
        }

        const deletedAgent = await prisma.user.update({
            where: { id },
            data: { deletedAt: new Date() },
            select: { id: true, fullName: true, email: true, deletedAt: true }
        });

        res.status(200).json({
            code: 200,
            data: deletedAgent,
            message: "Agent deleted successfully.",
        });

    } catch (err) {
        console.error("Error soft deleting agent:", err);
        res.status(500).json({ code: 500, message: "Error deleting agent" });
    }
};
