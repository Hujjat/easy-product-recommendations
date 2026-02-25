import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { PLAN_LIMITS } from "../constants";
import { getCurrentPlan, checkUsageLimit, getOrCreateShop } from "../utils/billing.server";
import { getAnalyticsSummary } from "../utils/metaobjects.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const currentPlan = await getCurrentPlan(billing);
  await getOrCreateShop(prisma, session.shop);
  const usage = await checkUsageLimit(prisma, session.shop, currentPlan);
  const analytics = await getAnalyticsSummary(admin, session.shop);

  return {
    currentPlan,
    usage,
    analytics,
  };
};

export default function DashboardPage() {
  const { currentPlan, usage, analytics } = useLoaderData();

  const limitDisplay =
    usage.limit === Infinity ? "Unlimited" : usage.limit.toLocaleString();
  const usagePercent =
    usage.limit === Infinity ? 0 : Math.round((usage.used / usage.limit) * 100);

  return (
    <s-page heading="Dashboard">
      <s-section heading="Overview">
        <s-grid gridTemplateColumns="repeat(5, 1fr)" gap="base">
          <s-box
            padding="large"
            background="base"
            border="base"
            borderRadius="base"
          >
            <s-stack gap="small">
              <s-paragraph color="subdued">Current Plan</s-paragraph>
              <s-heading>{currentPlan}</s-heading>
              <s-link href="/app/pricing">
                {currentPlan === "Free" ? "Upgrade" : "Manage Plan"}
              </s-link>
            </s-stack>
          </s-box>

          <s-box
            padding="large"
            background="base"
            border="base"
            borderRadius="base"
          >
            <s-stack gap="small">
              <s-paragraph color="subdued">Usage This Period</s-paragraph>
              <s-heading>
                {usage.used.toLocaleString()} / {limitDisplay}
              </s-heading>
              <s-paragraph color="subdued">
                {usage.remaining === Infinity
                  ? "Unlimited remaining"
                  : `${usage.remaining.toLocaleString()} remaining`}
              </s-paragraph>
            </s-stack>
          </s-box>

          <s-box
            padding="large"
            background="base"
            border="base"
            borderRadius="base"
          >
            <s-stack gap="small">
              <s-paragraph color="subdued">Impressions (30d)</s-paragraph>
              <s-heading>
                <s-text fontVariantNumeric="tabular-nums">
                  {analytics.last30Days.impressions.toLocaleString()}
                </s-text>
              </s-heading>
              <s-paragraph color="subdued">
                {analytics.allTime.impressions.toLocaleString()} all time
              </s-paragraph>
            </s-stack>
          </s-box>

          <s-box
            padding="large"
            background="base"
            border="base"
            borderRadius="base"
          >
            <s-stack gap="small">
              <s-paragraph color="subdued">Clicks (30d)</s-paragraph>
              <s-heading>
                <s-text fontVariantNumeric="tabular-nums">
                  {analytics.last30Days.clicks.toLocaleString()}
                </s-text>
              </s-heading>
              <s-paragraph color="subdued">
                {analytics.allTime.clicks.toLocaleString()} all time
              </s-paragraph>
            </s-stack>
          </s-box>

          <s-box
            padding="large"
            background="base"
            border="base"
            borderRadius="base"
          >
            <s-stack gap="small">
              <s-paragraph color="subdued">Add to Carts (30d)</s-paragraph>
              <s-heading>
                <s-text fontVariantNumeric="tabular-nums">
                  {analytics.last30Days.addToCarts.toLocaleString()}
                </s-text>
              </s-heading>
              <s-paragraph color="subdued">
                {analytics.allTime.addToCarts.toLocaleString()} all time
              </s-paragraph>
            </s-stack>
          </s-box>
        </s-grid>
      </s-section>

      {analytics.last30Days.clicks > 0 && (
        <s-section heading="Conversion Rates (30d)">
          <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="base">
            <s-box
              padding="large"
              background="base"
              border="base"
              borderRadius="base"
            >
              <s-stack gap="small">
                <s-paragraph color="subdued">Click Rate</s-paragraph>
                <s-heading>
                  <s-text fontVariantNumeric="tabular-nums">
                    {analytics.last30Days.impressions > 0
                      ? (
                          (analytics.last30Days.clicks /
                            analytics.last30Days.impressions) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </s-text>
                </s-heading>
                <s-paragraph color="subdued">Clicks / Impressions</s-paragraph>
              </s-stack>
            </s-box>

            <s-box
              padding="large"
              background="base"
              border="base"
              borderRadius="base"
            >
              <s-stack gap="small">
                <s-paragraph color="subdued">Cart Rate</s-paragraph>
                <s-heading>
                  <s-text fontVariantNumeric="tabular-nums">
                    {analytics.last30Days.clicks > 0
                      ? (
                          (analytics.last30Days.addToCarts /
                            analytics.last30Days.clicks) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </s-text>
                </s-heading>
                <s-paragraph color="subdued">
                  Add to Carts / Clicks
                </s-paragraph>
              </s-stack>
            </s-box>
          </s-grid>
        </s-section>
      )}

      <s-section heading="Top Recommended Products">
        {analytics.topProducts.length === 0 ? (
          <s-box padding="large">
            <s-stack gap="base">
              <s-paragraph color="subdued">
                No recommendation data yet. Once customers start interacting
                with recommendations on your store, analytics will appear here.
              </s-paragraph>
              <s-link href="/app/how-to-use">
                Learn how to set up recommendations
              </s-link>
            </s-stack>
          </s-box>
        ) : (
          <s-section padding="none">
            <s-table>
              <s-table-header-row>
                <s-table-header listSlot="primary">Rank</s-table-header>
                <s-table-header listSlot="labeled">Product ID</s-table-header>
                <s-table-header listSlot="inline">Clicks</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {analytics.topProducts.map((product, index) => (
                  <s-table-row key={product.productId}>
                    <s-table-cell>
                      <s-text type="strong">#{index + 1}</s-text>
                    </s-table-cell>
                    <s-table-cell>{product.productId}</s-table-cell>
                    <s-table-cell>
                      <s-text fontVariantNumeric="tabular-nums">
                        {product.clicks.toLocaleString()}
                      </s-text>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          </s-section>
        )}
      </s-section>

      <s-section heading="Quick Start">
        <s-paragraph>
          Get started with product recommendations
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-button href="/app/how-to-use">How to Use Guide</s-button>
          <s-button href="/app/recommendations">
            Manage Recommendations
          </s-button>
          <s-button href="/app/pricing">View Plans</s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}
