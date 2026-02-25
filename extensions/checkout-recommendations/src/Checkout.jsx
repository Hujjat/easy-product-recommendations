import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

export default function () {
  render(<Extension />, document.body);
}

function Extension() {
  const { applyCartLinesChange, query, i18n, lines, settings } = shopify;

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState({});

  const settingsValue = settings.value || {};
  const limit = parseInt(settingsValue.products_to_show) || 4;
  const displayHeading = settingsValue.heading || "You may also like";
  const shouldShowPrice = settingsValue.show_price !== false;

  useEffect(() => {
    const cartLines = lines.value || [];
    if (cartLines.length === 0) {
      setLoading(false);
      return;
    }

    const cartProductIds = cartLines
      .map((line) => line.merchandise?.product?.id)
      .filter(Boolean);

    if (cartProductIds.length === 0) {
      setLoading(false);
      return;
    }

    fetchRecommendations(query, cartProductIds, limit)
      .then((recs) => {
        setRecommendations(recs);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  async function handleAddToCart(variantId, productId) {
    setAdding((prev) => ({ ...prev, [productId]: true }));
    const result = await applyCartLinesChange({
      type: "addCartLine",
      merchandiseId: variantId,
      quantity: 1,
    });
    setAdding((prev) => ({ ...prev, [productId]: false }));
    if (result.type === "error") {
      console.error("Add to cart error:", result.message);
    }
  }

  if (loading) {
    return (
      <s-stack direction="block" gap="base">
        <s-heading>{displayHeading}</s-heading>
        <s-skeleton-paragraph />
      </s-stack>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <s-stack direction="block" gap="base">
      <s-heading>{displayHeading}</s-heading>
      <s-divider />
      {recommendations.map((product) => (
        <s-stack direction="inline" gap="base" key={product.id}>
          {product.imageUrl && (
            <s-image
              src={product.imageUrl}
              alt={product.title}
              fit="cover"
            />
          )}
          <s-stack direction="block" gap="extraTight">
            <s-text emphasis="bold">{product.title}</s-text>
            {shouldShowPrice && product.price && (
              <s-text appearance="subdued">{product.price}</s-text>
            )}
          </s-stack>
          <s-button
            variant="secondary"
            loading={adding[product.id] || undefined}
            onClick={() => handleAddToCart(product.variantId, product.id)}
          >
            Add
          </s-button>
        </s-stack>
      ))}
    </s-stack>
  );
}

async function fetchRecommendations(query, cartProductIds, limit) {
  const allRecs = [];
  const idsToFetch = cartProductIds.slice(0, 3);

  for (const productId of idsToFetch) {
    try {
      const result = await query(
        `query productRecommendations($productId: ID!) {
          productRecommendations(productId: $productId) {
            id
            title
            featuredImage { url }
            priceRange { minVariantPrice { amount currencyCode } }
            variants(first: 1) { nodes { id } }
          }
        }`,
        { variables: { productId } },
      );

      if (result?.data?.productRecommendations) {
        allRecs.push(...result.data.productRecommendations);
      }
    } catch (err) {
      console.error("Failed to fetch recs:", err);
    }
  }

  const seen = new Set(cartProductIds);
  const uniqueRecs = [];

  for (const rec of allRecs) {
    if (!seen.has(rec.id)) {
      seen.add(rec.id);
      uniqueRecs.push({
        id: rec.id,
        title: rec.title,
        imageUrl: rec.featuredImage?.url || null,
        price: rec.priceRange?.minVariantPrice
          ? `$${parseFloat(rec.priceRange.minVariantPrice.amount).toFixed(2)}`
          : null,
        variantId: rec.variants?.nodes?.[0]?.id || null,
      });
    }
    if (uniqueRecs.length >= limit) break;
  }

  return uniqueRecs;
}
