import { FREE_PLAN, STANDARD_PLAN, ENTERPRISE_PLAN, PLAN_LIMITS } from "../constants";

const BILLING_CYCLE_DAYS = 30;

export async function getCurrentPlan(billing) {
  const { hasActivePayment, appSubscriptions } = await billing.check({
    plans: [STANDARD_PLAN, ENTERPRISE_PLAN],
    isTest: true,
  });

  if (!hasActivePayment) return FREE_PLAN;

  const activeSub = appSubscriptions[0];
  return activeSub?.name || FREE_PLAN;
}

export async function getOrCreateShop(prisma, shopDomain) {
  let shop = await prisma.shop.findUnique({ where: { id: shopDomain } });
  if (!shop) {
    shop = await prisma.shop.create({
      data: { id: shopDomain },
    });
  }
  return shop;
}

export async function resetBillingCycleIfNeeded(prisma, shopDomain) {
  const shop = await getOrCreateShop(prisma, shopDomain);
  const now = new Date();
  const cycleStart = new Date(shop.billingCycleStart);
  const daysSinceCycleStart = Math.floor(
    (now - cycleStart) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceCycleStart >= BILLING_CYCLE_DAYS) {
    return await prisma.shop.update({
      where: { id: shopDomain },
      data: {
        recommendationsUsed: 0,
        billingCycleStart: now,
      },
    });
  }

  return shop;
}

export async function checkUsageLimit(prisma, shopDomain, plan) {
  const shop = await resetBillingCycleIfNeeded(prisma, shopDomain);
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS[FREE_PLAN];

  return {
    used: shop.recommendationsUsed,
    limit,
    remaining: Math.max(0, limit - shop.recommendationsUsed),
    plan: plan || shop.plan,
    hasCapacity: shop.recommendationsUsed < limit,
  };
}

export async function incrementUsage(prisma, shopDomain) {
  return await prisma.shop.update({
    where: { id: shopDomain },
    data: {
      recommendationsUsed: { increment: 1 },
    },
  });
}

export async function updateShopPlan(prisma, shopDomain, plan) {
  return await prisma.shop.upsert({
    where: { id: shopDomain },
    update: { plan },
    create: { id: shopDomain, plan },
  });
}
