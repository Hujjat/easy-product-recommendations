import { useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { FREE_PLAN, STANDARD_PLAN, ENTERPRISE_PLAN, PLAN_LIMITS } from "../constants";
import {
  getCurrentPlan,
  checkUsageLimit,
  getOrCreateShop,
} from "../utils/billing.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const currentPlan = await getCurrentPlan(billing);
  await getOrCreateShop(prisma, session.shop);
  const usage = await checkUsageLimit(prisma, session.shop, currentPlan);

  return {
    currentPlan,
    used: usage.used,
    limit: usage.limit,
    remaining: usage.remaining,
    plans: [
      {
        name: FREE_PLAN,
        price: 0,
        limit: PLAN_LIMITS[FREE_PLAN],
        features: [
          "100 recommendations per month",
          "Default Shopify recommendations",
          "Basic analytics",
          "PDP recommendation block",
        ],
      },
      {
        name: STANDARD_PLAN,
        price: 29,
        limit: PLAN_LIMITS[STANDARD_PLAN],
        features: [
          "1,000 recommendations per month",
          "Custom recommendation overrides",
          "Full analytics dashboard",
          "PDP + Checkout blocks",
          "Priority support",
        ],
      },
      {
        name: ENTERPRISE_PLAN,
        price: 59,
        limit: PLAN_LIMITS[ENTERPRISE_PLAN],
        features: [
          "Unlimited recommendations",
          "Custom recommendation overrides",
          "Full analytics dashboard",
          "PDP + Checkout blocks",
          "Priority support",
          "Dedicated account manager",
        ],
      },
    ],
  };
};

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const plan = formData.get("plan");

  if (intent === "subscribe" && (plan === STANDARD_PLAN || plan === ENTERPRISE_PLAN)) {
    await billing.request({
      plan,
      isTest: true,
    });
  }

  if (intent === "cancel") {
    const { appSubscriptions } = await billing.check({
      plans: [STANDARD_PLAN, ENTERPRISE_PLAN],
      isTest: true,
    });

    if (appSubscriptions.length > 0) {
      const subId = appSubscriptions[0].id;
      await billing.cancel({
        subscriptionId: subId,
        isTest: true,
        prorate: true,
      });
    }

    return { success: true, plan: FREE_PLAN };
  }

  return { success: true };
};

export default function PricingPage() {
  const { currentPlan, used, limit, plans } = useLoaderData();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";

  const usagePercent = limit === Infinity ? 0 : Math.round((used / limit) * 100);
  const limitDisplay = limit === Infinity ? "Unlimited" : limit.toLocaleString();

  return (
    <s-page heading="Pricing Plans">
      <s-section>
        <s-card>
          <s-box padding="base">
            <s-stack direction="block" gap="tight">
              <s-text variant="headingMd">Current Usage</s-text>
              <s-text>
                {used.toLocaleString()} / {limitDisplay} recommendations used this billing period
              </s-text>
              {limit !== Infinity && (
                <s-progress-bar progress={usagePercent} />
              )}
              <s-text variant="bodySm" tone="subdued">
                {limit === Infinity
                  ? "Unlimited recommendations available"
                  : `${(limit - used).toLocaleString()} recommendations remaining`}
              </s-text>
            </s-stack>
          </s-box>
        </s-card>
      </s-section>

      <s-section>
        <s-stack direction="inline" gap="base" wrap>
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.name;
            const isUpgrade =
              plans.findIndex((p) => p.name === plan.name) >
              plans.findIndex((p) => p.name === currentPlan);
            const isDowngrade =
              plans.findIndex((p) => p.name === plan.name) <
              plans.findIndex((p) => p.name === currentPlan);

            return (
              <s-card key={plan.name}>
                <s-box padding="base" minWidth="250px">
                  <s-stack direction="block" gap="base">
                    <s-stack direction="block" gap="tight">
                      <s-stack direction="inline" gap="tight" align="center">
                        <s-text variant="headingLg">{plan.name}</s-text>
                        {isCurrent && <s-badge tone="success">Current Plan</s-badge>}
                      </s-stack>
                      <s-text variant="headingXl">
                        ${plan.price}
                        <s-text variant="bodySm" tone="subdued">/month</s-text>
                      </s-text>
                    </s-stack>

                    <s-divider />

                    <s-stack direction="block" gap="tight">
                      {plan.features.map((feature, i) => (
                        <s-stack key={i} direction="inline" gap="tight" align="start">
                          <s-text tone="success">&#10003;</s-text>
                          <s-text>{feature}</s-text>
                        </s-stack>
                      ))}
                    </s-stack>

                    <s-box paddingBlockStart="base">
                      {isCurrent ? (
                        <s-button disabled fullWidth>
                          Current Plan
                        </s-button>
                      ) : isUpgrade ? (
                        <fetcher.Form method="POST">
                          <input type="hidden" name="intent" value="subscribe" />
                          <input type="hidden" name="plan" value={plan.name} />
                          <s-button variant="primary" fullWidth disabled={isSubmitting} type="submit">
                            Upgrade to {plan.name}
                          </s-button>
                        </fetcher.Form>
                      ) : isDowngrade ? (
                        <fetcher.Form method="POST">
                          <input type="hidden" name="intent" value={plan.name === FREE_PLAN ? "cancel" : "subscribe"} />
                          <input type="hidden" name="plan" value={plan.name} />
                          <s-button fullWidth disabled={isSubmitting} type="submit">
                            Downgrade to {plan.name}
                          </s-button>
                        </fetcher.Form>
                      ) : null}
                    </s-box>
                  </s-stack>
                </s-box>
              </s-card>
            );
          })}
        </s-stack>
      </s-section>
    </s-page>
  );
}
