import { PrismaClient, PlanCode, AddOnCode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

  // 1️⃣ Seed Plans
  const plans = [
    {
      code: PlanCode.FREE,
      name: "Free",
      description: "Perfect for testing the AI chatbot.",

      priceMonthly: null,
      priceYearly: null,
      isContactSales: false,

      maxUserSessions: 1000,
      maxDynamicData: 2,
      chatHistoryLimit: 50,
      maxAgents: 3,

      hasApiAccess: false,
      hasCustomBranding: false,
      hasAnalytics: false,
      hasPrioritySupport: false,
    },
    {
      code: PlanCode.STARTER,
      name: "Starter",
      description: "For small businesses using AI chatbot automation.",

      priceMonthly: 29,
      priceYearly: 290,
      isContactSales: false,

      maxUserSessions: 10000,
      maxDynamicData: 10,
      chatHistoryLimit: 200,
      maxAgents: 3,

      hasApiAccess: true,
      hasCustomBranding: false,
      hasAnalytics: false,
      hasPrioritySupport: false,
    },
    {
      code: PlanCode.ENTERPRISE,
      name: "Enterprise",
      description: "Custom AI automation solution for large organizations.",

      priceMonthly: 79,
      priceYearly: 790,
      isContactSales: true,

      maxUserSessions: null,
      maxDynamicData: null,
      chatHistoryLimit: null,
      maxAgents: null,

      hasApiAccess: true,
      hasCustomBranding: true,
      hasAnalytics: true,
      hasPrioritySupport: true,
    },
  ];

  for (const data of plans) {
    await prisma.plan.upsert({
      where: { code: data.code },
      update: data,
      create: data,
    });
  }

  console.log("✅ Seeded AI chatbot plans");



  // 2️⃣ Seed Add-on
  const addOns = [
    {
      code: AddOnCode.EXTRA_USER_SESSIONS,
      name: "Extra User Sessions",
      description: "Add 5000 additional chatbot sessions",

      priceMonthly: 10,
      priceYearly: 100,

      extraUserSessions: 5000,
    },
  ];

  for (const data of addOns) {
    await prisma.addOn.upsert({
      where: { code: data.code },
      update: data,
      create: data,
    });
  }

  console.log("✅ Seeded add-ons");



  // 3️⃣ Link Add-ons to Plans
  const allPlans = await prisma.plan.findMany({
    select: { id: true },
  });

  const addon = await prisma.addOn.findUnique({
    where: { code: AddOnCode.EXTRA_USER_SESSIONS },
    select: { id: true },
  });

  if (addon) {
    for (const plan of allPlans) {
      await prisma.planAddOn.upsert({
        where: {
          planId_addOnId: {
            planId: plan.id,
            addOnId: addon.id,
          },
        },
        update: {},
        create: {
          planId: plan.id,
          addOnId: addon.id,
        },
      });
    }

    console.log("✅ Linked add-ons to plans");
  }
}

main()
  .catch((e: any) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });