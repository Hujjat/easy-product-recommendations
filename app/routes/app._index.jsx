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
        <s-stack direction="inline" gap="base" wrap>
          <s-card>
            <s-box padding="base" minWidth="200px">
              <s-stack direction="block" gap="tight">
                <s-text tone="subdued">Current Plan</s-text>
                <s-text variant="headingXl">{currentPlan}</s-text>
                <s-link href="/app/pricing">
                  {currentPlan === "Free" ? "Upgrade" : "Manage Plan"}
                </s-link>
              </s-stack>
            </s-box>
          </s-card>

          <s-card>
            <s-box padding="base" minWidth="200px">
              <s-stack direction="block" gap="tight">
                <s-text tone="subdued">Usage This Period</s-text>
                <s-text variant="headingXl">
                  {usage.used.toLocaleString()} / {limitDisplay}
                </s-text>
                {usage.limit !== Infinity && (
                  <s-progress-bar progress={usagePercent} />
                )}
                <s-text variant="bodySm" tone="subdued">
                  {usage.remaining === Infinity
                    ? "Unlimited remaining"
                    : `${usage.remaining.toLocaleString()} remaining`}
                </s-text>
              </s-stack>
            </s-box>
          </s-card>

          <s-card>
            <s-box padding="base" minWidth="200px">
              <s-stack direction="block" gap="tight">
                <s-text tone="subdued">Impressions (30d)</s-text>
                <s-text variant="headingXl">
                  {analytics.last30Days.impressions.toLocaleString()}
                </s-text>
                <s-text variant="bodySm" tone="subdued">
                  {analytics.allTime.impressions.toLocaleString()} all time
                </s-text>
              </s-stack>
            </s-box>
          </s-card>

          <s-card>
            <s-box padding="base" minWidth="200px">
              <s-stack direction="block" gap="tight">
                <s-text tone="subdued">Clicks (30d)</s-text>
                <s-text variant="headingXl">
                  {analytics.last30Days.clicks.toLocaleString()}
                </s-text>
                <s-text variant="bodySm" tone="subdued">
                  {analytics.allTime.clicks.toLocaleString()} all time
                </s-text>
              </s-stack>
            </s-box>
          </s-card>

          <s-card>
            <s-box padding="base" minWidth="200px">
              <s-stack direction="block" gap="tight">
                <s-text tone="subdued">Add to Carts (30d)</s-text>
                <s-text variant="headingXl">
                  {analytics.last30Days.addToCarts.toLocaleString()}
                </s-text>
                <s-text variant="bodySm" tone="subdued">
                  {analytics.allTime.addToCarts.toLocaleString()} all time
                </s-text>
              </s-stack>
            </s-box>
          </s-card>
        </s-stack>
      </s-section>

      {analytics.last30Days.clicks > 0 && (
        <s-section heading="Conversion Rate (30d)">
          <s-card>
            <s-box padding="base">
              <s-stack direction="inline" gap="loose" wrap>
                <s-stack direction="block" gap="tight">
                  <s-text tone="subdued">Click Rate</s-text>
                  <s-text variant="headingLg">
                    {analytics.last30Days.impressions > 0
                      ? (
                          (analytics.last30Days.clicks /
                            analytics.last30Days.impressions) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </s-text>
                  <s-text variant="bodySm" tone="subdued">
                    Clicks / Impressions
                  </s-text>
                </s-stack>
                <s-stack direction="block" gap="tight">
                  <s-text tone="subdued">Cart Rate</s-text>
                  <s-text variant="headingLg">
                    {analytics.last30Days.clicks > 0
                      ? (
                          (analytics.last30Days.addToCarts /
                            analytics.last30Days.clicks) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </s-text>
                  <s-text variant="bodySm" tone="subdued">
                    Add to Carts / Clicks
                  </s-text>
                </s-stack>
              </s-stack>
            </s-box>
          </s-card>
        </s-section>
      )}

      <s-section heading="Top Recommended Products">
        {analytics.topProducts.length === 0 ? (
          <s-card>
            <s-box padding="loose">
              <s-stack direction="block" gap="tight" align="center">
                <s-text tone="subdued">
                  No recommendation data yet. Once customers start interacting
                  with recommendations on your store, analytics will appear here.
                </s-text>
                <s-link href="/app/how-to-use">
                  Learn how to set up recommendations
                </s-link>
              </s-stack>
            </s-box>
          </s-card>
        ) : (
          <s-card>
            <s-box padding="base">
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="base">
                  <s-box minWidth="60px">
                    <s-text variant="headingSm" tone="subdued">Rank</s-text>
                  </s-box>
                  <s-box style={{ flex: 1 }}>
                    <s-text variant="headingSm" tone="subdued">Product ID</s-text>
                  </s-box>
                  <s-box minWidth="80px">
                    <s-text variant="headingSm" tone="subdued">Clicks</s-text>
                  </s-box>
                </s-stack>
                <s-divider />
                {analytics.topProducts.map((product, index) => (
                  <s-stack key={product.productId} direction="inline" gap="base">
                    <s-box minWidth="60px">
                      <s-text variant="headingSm">#{index + 1}</s-text>
                    </s-box>
                    <s-box style={{ flex: 1 }}>
                      <s-text>{product.productId}</s-text>
                    </s-box>
                    <s-box minWidth="80px">
                      <s-text>{product.clicks.toLocaleString()}</s-text>
                    </s-box>
                  </s-stack>
                ))}
              </s-stack>
            </s-box>
          </s-card>
        )}
      </s-section>

      <s-section heading="Quick Start">
        <s-card>
          <s-box padding="base">
            <s-stack direction="block" gap="tight">
              <s-text variant="headingSm">
                Get started with product recommendations
              </s-text>
              <s-stack direction="inline" gap="tight" wrap>
                <s-link href="/app/how-to-use">
                  <s-button>How to Use Guide</s-button>
                </s-link>
                <s-link href="/app/recommendations">
                  <s-button>Manage Recommendations</s-button>
                </s-link>
                <s-link href="/app/pricing">
                  <s-button>View Plans</s-button>
                </s-link>
              </s-stack>
            </s-stack>
          </s-box>
        </s-card>
      </s-section>
    </s-page>
  );
}
