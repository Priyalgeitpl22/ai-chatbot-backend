import { Request, Response } from "express";
import { AddOnService } from "../services/add-on.service";
import { AddOnCode } from "@prisma/client";

// GET ALL
export const getAllAddOns = async (req: Request, res: Response) => {
  const response = await AddOnService.getAll();
  res.status(response.code).json(response);
};

// GET BY ID
export const getAddOnById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ code: 400, message: "Invalid ID" });
  }

  const response = await AddOnService.getById(id);
  res.status(response.code).json(response);
};

// GET BY CODE
export const getAddOnByCode = async (req: Request, res: Response) => {
  const { code } = req.params;

  if (!Object.values(AddOnCode).includes(AddOnCode.EXTRA_USER_SESSIONS)) {
    return res.status(400).json({ code: 400, message: "Invalid code" });
  }

  const response = await AddOnService.getByCode(code as AddOnCode);
  res.status(response.code).json(response);
};

// CREATE
export const createAddOn = async (req: Request, res: Response) => {
  const { code, name, description, priceMonthly, priceYearly, extraUserSessions } = req.body;

  if (!code || !name) {
    return res.status(400).json({ code: 400, message: "code and name are required" });
  }

  const response = await AddOnService.create({
    code,
    name,
    description,
    priceMonthly,
    priceYearly,
    extraUserSessions
  });

  res.status(response.code).json(response);
};

// UPDATE
export const updateAddOn = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const response = await AddOnService.update(id, req.body);
  res.status(response.code).json(response);
};

// DELETE
export const deleteAddOn = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const response = await AddOnService.delete(id);
  res.status(response.code).json(response);
};