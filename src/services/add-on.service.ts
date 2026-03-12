import { AddOnCode, PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const addOnSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  priceMonthly: true,
  priceYearly: true,
  extraUserSessions: true,
  createdAt: true,
  updatedAt: true,
};

export type AddOnResponse = Prisma.AddOnGetPayload<{ select: typeof addOnSelect }>;

export class AddOnService {
  static async getAll(includePlans = false) {
    const addOns = await prisma.addOn.findMany({
      select: includePlans
        ? { ...addOnSelect, plans: { include: { plan: { select: { id: true, code: true, name: true } } } } }
        : addOnSelect,
    });
    if (!addOns?.length) {
      return { code: 404, message: "No add-ons found" };
    }
    return { code: 200, message: "Add-ons fetched successfully", data: addOns };
  }

  static async getById(id: number, includePlans = false) {
    const addOn = await prisma.addOn.findUnique({
      where: { id },
      select: includePlans
        ? { ...addOnSelect, plans: { include: { plan: { select: { id: true, code: true, name: true } } } } }
        : addOnSelect,
    });
    if (!addOn) {
      return { code: 404, message: "Add-on not found" };
    }
    return { code: 200, message: "Add-on fetched successfully", data: addOn };
  }

  static async getByCode(code: string, includePlans = false) {
    const addOn = await prisma.addOn.findUnique({
      where: { code: code as AddOnCode },
      select: includePlans
        ? { ...addOnSelect, plans: { include: { plan: { select: { id: true, code: true, name: true } } } } }
        : addOnSelect,
    });
    if (!addOn) {
      return { code: 404, message: "Add-on not found" };
    }
    return { code: 200, message: "Add-on fetched successfully", data: addOn };
  }

  static async create(body: {
    code: AddOnCode;
    name: string;
    description?: string | null;
    priceMonthly?: number | null;
    priceYearly?: number | null;
    extraUserSessions?: number | null;
  }) {
    try {
      const addOn = await prisma.addOn.create({
        data: {
          code: body.code,
          name: body.name,
          description: body.description ?? null,
          priceMonthly: body.priceMonthly != null ? body.priceMonthly : null,
          priceYearly: body.priceYearly != null ? body.priceYearly : null,
          extraUserSessions: body.extraUserSessions ?? null,
        },
        select: addOnSelect,
      });
      return { code: 201, message: "Add-on created successfully", data: addOn };
    } catch (e: any) {
      if (e?.code === "P2002") {
        return { code: 400, message: "Add-on with this code already exists" };
      }
      throw e;
    }
  }

  static async update(
    id: number,
    body: {
      name?: string;
      description?: string | null;
      priceMonthly?: number | null;
      priceYearly?: number | null;
      extraUserSessions?: number | null;
    }
  ) {
    const existing = await prisma.addOn.findUnique({ where: { id } });
    if (!existing) {
      return { code: 404, message: "Add-on not found" };
    }
    const addOn = await prisma.addOn.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.priceMonthly !== undefined && { priceMonthly: body.priceMonthly }),
        ...(body.priceYearly !== undefined && { priceYearly: body.priceYearly }),
        ...(body.extraUserSessions !== undefined && { extraUserSessions: body.extraUserSessions }),
      },
      select: addOnSelect,
    });
    return { code: 200, message: "Add-on updated successfully", data: addOn };
  }

  static async delete(id: number) {
    const existing = await prisma.addOn.findUnique({ where: { id } });
    if (!existing) {
      return { code: 404, message: "Add-on not found" };
    }
    await prisma.addOn.delete({ where: { id } });
    return { code: 200, message: "Add-on deleted successfully" };
  }

  /** Get plan IDs linked to this add-on */
  static async getPlanIds(addOnId: number) {
    const links = await prisma.planAddOn.findMany({
      where: { addOnId },
      select: { planId: true },
    });
    return links.map((l) => l.planId);
  }

  /** Set which plans this add-on is available for (replaces existing links) */
  static async setPlans(addOnId: number, planIds: number[]) {
    const existing = await prisma.addOn.findUnique({ where: { id: addOnId } });
    if (!existing) {
      return { code: 404, message: "Add-on not found" };
    }
    const validPlans = await prisma.plan.findMany({ where: { id: { in: planIds } }, select: { id: true } });
    const ids = validPlans.map((p) => p.id);

    await prisma.planAddOn.deleteMany({ where: { addOnId } });
    if (ids.length > 0) {
      await prisma.planAddOn.createMany({ data: ids.map((planId) => ({ planId, addOnId })) });
    }

    const links = await prisma.planAddOn.findMany({
      where: { addOnId },
      include: { plan: { select: { id: true, code: true, name: true } } },
    });
    return { code: 200, message: "Add-on plans updated successfully", data: links };
  }
}
