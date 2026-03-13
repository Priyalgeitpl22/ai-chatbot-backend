import { Request, Response } from "express";
import { AddOnService } from "../services/add-on.service";
import { AddOnCode } from "@prisma/client";

export const getAllAddOns = async (req: Request, res: Response): Promise<void> => {
    try {
        const includePlans = req.query.includePlans === "true";
        const response = await AddOnService.getAll(includePlans);
        res.status(response.code).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ code: 500, message: "Failed to fetch add-ons" });
    }
};

export const getAddOnById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (Number.isNaN(id)) {
            res.status(400).json({ code: 400, message: "Invalid add-on id" });
            return;
        }
        const includePlans = req.query.includePlans === "true";
        const response = await AddOnService.getById(id, includePlans);
        res.status(response.code).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ code: 500, message: "Failed to fetch add-on" });
    }
};

export const getAddOnByCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.params as any;
        const includePlans = req.query.includePlans === "true";
        const response = await AddOnService.getByCode(code, includePlans);
        res.status(response.code).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ code: 500, message: "Failed to fetch add-on" });
    }
};

export const createAddOn = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, name, description, priceMonthly, priceYearly, extraUserSessions } = req.body;
        if (!code || !name) {
            res.status(400).json({ code: 400, message: "code and name are required" });
            return;
        }
        const validCodes = Object.values(AddOnCode);
        if (!validCodes.includes(code)) {
            res.status(400).json({ code: 400, message: `code must be one of: ${validCodes.join(", ")}` });
            return;
        }
        const response = await AddOnService.create({
            code,
            name,
            description: description ?? null,
            priceMonthly: priceMonthly != null ? Number(priceMonthly) : null,
            priceYearly: priceYearly != null ? Number(priceYearly) : null,
            extraUserSessions: extraUserSessions != null ? Number(extraUserSessions) : null,
        });
        res.status(response.code).json(response);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ code: 500, message: err?.message || "Failed to create add-on" });
    }
};

export const updateAddOn = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (Number.isNaN(id)) {
            res.status(400).json({ code: 400, message: "Invalid add-on id" });
            return;
        }
        const { name, description, priceMonthly, priceYearly, emailVerificationLimit } = req.body;
        const response = await AddOnService.update(id, {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(priceMonthly !== undefined && { priceMonthly: priceMonthly == null ? null : Number(priceMonthly) }),
            ...(priceYearly !== undefined && { priceYearly: priceYearly == null ? null : Number(priceYearly) }),
            ...(emailVerificationLimit !== undefined && {
                emailVerificationLimit: emailVerificationLimit == null ? null : Number(emailVerificationLimit),
            }),
        });
        res.status(response.code).json(response);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ code: 500, message: err?.message || "Failed to update add-on" });
    }
};

export const deleteAddOn = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (Number.isNaN(id)) {
            res.status(400).json({ code: 400, message: "Invalid add-on id" });
            return;
        }
        const response = await AddOnService.delete(id);
        res.status(response.code).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ code: 500, message: "Failed to delete add-on" });
    }
};

export const getAddOnPlans = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (Number.isNaN(id)) {
            res.status(400).json({ code: 400, message: "Invalid add-on id" });
            return;
        }
        const planIds = await AddOnService.getPlanIds(id);
        res.status(200).json({ code: 200, data: planIds });
    } catch (err) {
        console.error(err);
        res.status(500).json({ code: 500, message: "Failed to fetch add-on plans" });
    }
};

export const setAddOnPlans = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (Number.isNaN(id)) {
            res.status(400).json({ code: 400, message: "Invalid add-on id" });
            return;
        }
        const { planIds } = req.body;
        if (!Array.isArray(planIds)) {
            res.status(400).json({ code: 400, message: "planIds must be an array" });
            return;
        }
        const response = await AddOnService.setPlans(id, planIds.map(Number).filter((n) => !Number.isNaN(n)));
        res.status(response.code).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ code: 500, message: "Failed to update add-on plans" });
    }
};
