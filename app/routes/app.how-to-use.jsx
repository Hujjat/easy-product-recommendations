import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function HowToUsePage() {
  return (
    <s-page heading="How to Use">
      <s-section>
        <s-banner tone="info">
          Follow these steps to set up product recommendations on your store.
          It only takes a few minutes!
        </s-banner>
      </s-section>

      <s-section heading="Step 1: Add Recommendations to Your Product Pages">
        <s-card>
          <s-box padding="base">
            <s-stack direction="block" gap="base">
              <s-text>
                Add the Product Recommendations block to your product page
                template in the theme editor.
              </s-text>
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="tight">
                  <s-badge>1</s-badge>
                  <s-text>
                    Go to <s-text emphasis="bold">Online Store &gt; Themes &gt; Customize</s-text>
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight">
                  <s-badge>2</s-badge>
                  <s-text>
                    Navigate to a <s-text emphasis="bold">Product page</s-text> template
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight">
                  <s-badge>3</s-badge>
                  <s-text>
                    Click <s-text emphasis="bold">Add block</s-text> and search for
                    "Product Recommendations"
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight">
                  <s-badge>4</s-badge>
                  <s-text>
                    Configure the settings: choose a layout (Grid, Slider, or
                    List), set colors, toggle price/vendor display, and
                    customize the add-to-cart button
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight">
                  <s-badge>5</s-badge>
                  <s-text>
                    Click <s-text emphasis="bold">Save</s-text> to publish
                  </s-text>
                </s-stack>
              </s-stack>
            </s-stack>
          </s-box>
        </s-card>
      </s-section>

      <s-section heading="Step 2: Add Recommendations to Checkout">
        <s-card>
          <s-box padding="base">
            <s-stack direction="block" gap="base">
              <s-text>
                Display product recommendations during checkout to increase
                average order value.
              </s-text>
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="tight">
                  <s-badge>1</s-badge>
                  <s-text>
                    Go to <s-text emphasis="bold">Settings &gt; Checkout &gt; Customize</s-text>
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight">
                  <s-badge>2</s-badge>
                  <s-text>
                    Click <s-text emphasis="bold">Add block</s-text> and search for
                    "Checkout Recommendations"
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight">
                  <s-badge>3</s-badge>
                  <s-text>
                    Configure the heading text and number of products to show
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight">
                  <s-badge>4</s-badge>
                  <s-text>
                    Click <s-text emphasis="bold">Save</s-text> to publish
                  </s-text>
                </s-stack>
              </s-stack>
              <s-text tone="subdued">
                Checkout recommendations automatically suggest products based
                on what's in the customer's cart.
              </s-text>
            </s-stack>
          </s-box>
        </s-card>
      </s-section>

      <s-section heading="Step 3: Add Custom Recommendations (Optional)">
        <s-card>
          <s-box padding="base">
            <s-stack direction="block" gap="base">
              <s-text>
                By default, recommendations come from Shopify's algorithm. You
                can override these with your own curated recommendations.
              </s-text>
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="tight">
                  <s-badge>1</s-badge>
                  <s-text>
                    Navigate to the{" "}
                    <s-link href="/app/recommendations">Recommendations</s-link>{" "}
                    page in this app
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight">
                  <s-badge>2</s-badge>
                  <s-text>
                    Click <s-text emphasis="bold">Add Custom Recommendation</s-text>
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight">
                  <s-badge>3</s-badge>
                  <s-text>
                    Select the source product (the product page where
                    recommendations will show)
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight">
                  <s-badge>4</s-badge>
                  <s-text>
                    Select the products you want to recommend
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight">
                  <s-badge>5</s-badge>
                  <s-text>
                    Set priority and toggle active status, then save
                  </s-text>
                </s-stack>
              </s-stack>
              <s-text tone="subdued">
                Custom recommendations override Shopify's default algorithm
                for the matching source product.
              </s-text>
            </s-stack>
          </s-box>
        </s-card>
      </s-section>

      <s-section heading="Step 4: Monitor Performance">
        <s-card>
          <s-box padding="base">
            <s-stack direction="block" gap="base">
              <s-text>
                Track how your recommendations are performing on the{" "}
                <s-link href="/app">Home dashboard</s-link>.
              </s-text>
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="tight" align="start">
                  <s-text emphasis="bold">Impressions</s-text>
                  <s-text tone="subdued">
                    — How many times recommendations were shown to customers
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight" align="start">
                  <s-text emphasis="bold">Clicks</s-text>
                  <s-text tone="subdued">
                    — How many times customers clicked on a recommended product
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight" align="start">
                  <s-text emphasis="bold">Add to Carts</s-text>
                  <s-text tone="subdued">
                    — How many times customers added a recommended product to their
                    cart
                  </s-text>
                </s-stack>
              </s-stack>
            </s-stack>
          </s-box>
        </s-card>
      </s-section>

      <s-section heading="Step 5: Choose Your Plan">
        <s-card>
          <s-box padding="base">
            <s-stack direction="block" gap="base">
              <s-text>
                Visit the{" "}
                <s-link href="/app/pricing">Pricing page</s-link> to choose
                the right plan for your store.
              </s-text>
              <s-stack direction="block" gap="tight">
                <s-stack direction="inline" gap="tight" align="start">
                  <s-text emphasis="bold">Free</s-text>
                  <s-text tone="subdued">
                    — 100 recommendations per month, default recommendations
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight" align="start">
                  <s-text emphasis="bold">Standard ($29/mo)</s-text>
                  <s-text tone="subdued">
                    — 1,000 recommendations per month, custom overrides
                  </s-text>
                </s-stack>
                <s-stack direction="inline" gap="tight" align="start">
                  <s-text emphasis="bold">Enterprise ($59/mo)</s-text>
                  <s-text tone="subdued">
                    — Unlimited recommendations, priority support
                  </s-text>
                </s-stack>
              </s-stack>
            </s-stack>
          </s-box>
        </s-card>
      </s-section>

      <s-section heading="Need Help?">
        <s-card>
          <s-box padding="base">
            <s-text>
              If you have any questions or need assistance, contact our support
              team. We're here to help you get the most out of your product
              recommendations.
            </s-text>
          </s-box>
        </s-card>
      </s-section>
    </s-page>
  );
}
