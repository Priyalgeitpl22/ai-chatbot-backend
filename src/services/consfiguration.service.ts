import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateConfigurationInput {
  configurationKey: string;
  configurationValue?: Prisma.InputJsonValue;
  status?: boolean;
  createdById?: string;
}

export interface UpdateConfigurationInput {
  configurationValue?: Prisma.InputJsonValue;
  status?: boolean;
  updatedById?: string;
}

const defaultWhere = { isDeleted: false };

export type SubscriptionOfferId = "1_month_free" | "offer_2" | "offer_3";

export interface SubscriptionOfferTokenConfig {
  [token: string]: {
    offerId: SubscriptionOfferId;
    label: string;
    monthsFree?: number;
    planCode?: string;
  };
}

const SUBSCRIPTION_OFFER_TOKENS_KEY = "subscription_offer_tokens";

export class ConfigurationService {
  static async getSubscriptionOfferByToken(token: string): Promise<SubscriptionOfferTokenConfig[string] | null> {
    const config = await this.getByKey(SUBSCRIPTION_OFFER_TOKENS_KEY);
    const value = config?.configurationValue as SubscriptionOfferTokenConfig | null;
    if (!value || typeof value !== "object") return null;
    const offer = value[token];
    return offer && typeof offer === "object" ? offer : null;
  }

  static async create(data: CreateConfigurationInput) {
    const existing = await prisma.configuration.findFirst({
      where: { configurationKey: data.configurationKey, ...defaultWhere },
    });
    if (existing) {
      throw new Error(`Configuration with key "${data.configurationKey}" already exists`);
    }
    return prisma.configuration.create({
      data: {
        configurationKey: data.configurationKey,
        configurationValue: data.configurationValue ?? undefined,
        status: data.status ?? true,
        createdById: data.createdById ?? undefined,
      },
    });
  }

  static async getByKey(configurationKey: string) {
    return prisma.configuration.findFirst({
      where: { configurationKey, ...defaultWhere },
    });
  }

  static async getByUuid(uuid: string) {
    return prisma.configuration.findFirst({
      where: { uuid, ...defaultWhere },
    });
  }

  static async getAll(includeDeleted = false) {
    const where = includeDeleted ? {} : defaultWhere;
    return prisma.configuration.findMany({
      where,
      orderBy: { configurationKey: "asc" },
    });
  }

  static async update(uuid: string, data: UpdateConfigurationInput) {
    const config = await prisma.configuration.findFirst({
      where: { uuid, ...defaultWhere },
    });
    if (!config) return null;
    return prisma.configuration.update({
      where: { id: config.id },
      data: {
        configurationValue: data.configurationValue,
        status: data.status,
        updatedById: data.updatedById,
      },
    });
  }

  static async delete(uuid: string) {
    const config = await prisma.configuration.findFirst({
      where: { uuid, ...defaultWhere },
    });
    if (!config) return null;
    return prisma.configuration.update({
      where: { id: config.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  static async hardDelete(uuid: string) {
    const config = await prisma.configuration.findFirst({
      where: { uuid },
    });
    if (!config) return null;
    return prisma.configuration.delete({
      where: { id: config.id },
    });
  }
}
