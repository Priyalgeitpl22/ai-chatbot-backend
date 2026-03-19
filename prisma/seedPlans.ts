import { PrismaClient, PlanCode, AddOnCode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {


  const plans = [
    {
      code: PlanCode.FREE,
      name: "Free",
      description: "Basic plan",
  
      priceMonthly: null,
      priceYearly: null,
      isContactSales: false,
  
      maxUserSessions: 100,
      maxAgents: 2,
  
      hasApiAccess: false,
      hasCustomBranding: false,
      hasSupportTickets: false,
      hasRealtimeApiData: false,
      hasAiChat: false,
    },
    {
      code: PlanCode.STARTER,
      name: "Starter",
      description: "10 agents, unlimited chats",
  
      priceMonthly: 10,
      priceYearly: 100,
      isContactSales: false,
  
      maxUserSessions: null,
      maxAgents: 10,
  
      hasApiAccess: false,
      hasCustomBranding: false,
      hasSupportTickets: false,
      hasRealtimeApiData: false,
      hasAiChat: false,
    },
    {
      code: PlanCode.PROFESSIONAL,
      name: "Professional",
      description: "30 agents, AI + branding",
  
      priceMonthly: 30,
      priceYearly: 300,
      isContactSales: false,
  
      maxUserSessions: null,
      maxAgents: 30,
  
      hasApiAccess: false,
      hasCustomBranding: true,
      hasSupportTickets: false,
      hasRealtimeApiData: false,
      hasAiChat: true,
    },
    {
      code: PlanCode.ENTERPRISE,
      name: "Enterprise",
      description: "Unlimited + all features",
  
      priceMonthly: null,
      priceYearly: null,
      isContactSales: true,
  
      maxUserSessions: null,
      maxAgents: null,
  
      hasApiAccess: true,
      hasCustomBranding: true,
      hasSupportTickets: true,
      hasRealtimeApiData: true,
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