import { PrismaClient, PlanCode, AddOnCode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

  // 1️⃣ Seed Plans
  const plans = [
    {
      code: PlanCode.FREE,
      name: "Free",
      description: "Basic plan for testing",

      priceMonthly: null,
      priceYearly: null,
      isContactSales: false,

      maxUserSessions: 100,
      maxDynamicData: 2,
      chatHistoryLimit: 50,
      maxAgents: 2,

      hasApiAccess: false,
      hasCustomBranding: false,
      hasAnalytics: false,
      hasPrioritySupport: false,
      hasAiChat: false,
    },
    {
      code: PlanCode.STARTER,
      name: "Starter",
      description: "For small teams",

      priceMonthly: 10,
      priceYearly: 100,
      isContactSales: false,

      maxUserSessions: null, // unlimited
      maxDynamicData: 10,
      chatHistoryLimit: 200,
      maxAgents: 10,

      hasApiAccess: false,
      hasCustomBranding: false,
      hasAnalytics: false,
      hasPrioritySupport: false,
      hasAiChat: false,
    },
    {
      code: PlanCode.PROFESSIONAL,
      name: "Professional",
      description: "Growing businesses",

      priceMonthly: 30,
      priceYearly: 300,
      isContactSales: false,

      maxUserSessions: null,
      maxDynamicData: 20,
      chatHistoryLimit: 500,
      maxAgents: 30,

      hasApiAccess: false,
      hasCustomBranding: true,
      hasAnalytics: true,
      hasPrioritySupport: false,
      hasAiChat: true,
    },
    {
      code: PlanCode.ENTERPRISE,
      name: "Enterprise",
      description: "Custom solution for large orgs",

      priceMonthly: null,
      priceYearly: null,
      isContactSales: true,

      maxUserSessions: null,
      maxDynamicData: null,
      chatHistoryLimit: null,
      maxAgents: null,

      hasApiAccess: true,
      hasCustomBranding: true,
      hasAnalytics: true,
      hasPrioritySupport: true,
      hasAiChat: true,
    },
  ];

  for (const data of plans) {
    await prisma.plan.upsert({
      where: { code: data.code },
      update: data,
      create: data,
    });
  }

  console.log("✅ Seeded Plans");

  // 2️⃣ Add-on
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

  console.log("✅ Seeded Add-ons");

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
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });