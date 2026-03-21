import { PrismaClient, PlanCode } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      code: PlanCode.FREE,
      name: "Free",
      description: "Basic chat features to get starte",
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
      description: "Reliable chat for growing teams",
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
      description: "Advanced chat with AI and customization.",
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
      description: "Complete solution with full features and support",
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

  // ✅ Upsert Plans (update if exists, create if not)
  for (const data of plans) {
    await prisma.plan.upsert({
      where: { code: data.code },
      update: data,
      create: data,
    });
  }

  console.log("✅ Seeded Plans");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });