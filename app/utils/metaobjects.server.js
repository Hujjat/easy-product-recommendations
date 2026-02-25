const RECOMMENDATION_TYPE = "$app:recommendation";
const ANALYTICS_TYPE = "$app:recommendation_analytics";

export async function getAllRecommendations(admin, { cursor, search } = {}) {
  let queryFilter = "";
  if (search) {
    queryFilter = `, query: "${search}"`;
  }

  const afterClause = cursor ? `, after: "${cursor}"` : "";

  const response = await admin.graphql(
    `#graphql
    query GetRecommendations($first: Int!) {
      metaobjects(type: "${RECOMMENDATION_TYPE}", first: $first${afterClause}${queryFilter}, sortKey: "updated_at", reverse: true) {
        edges {
          cursor
          node {
            id
            handle
            source_product: field(key: "source_product") {
              reference {
                ... on Product {
                  id
                  title
                  handle
                  featuredImage { url altText }
                }
              }
            }
            recommended_products: field(key: "recommended_products") {
              references(first: 10) {
                edges {
                  node {
                    ... on Product {
                      id
                      title
                      handle
                      featuredImage { url altText }
                      priceRange {
                        minVariantPrice { amount currencyCode }
                      }
                    }
                  }
                }
              }
            }
            priority: field(key: "priority") { value }
            is_active: field(key: "is_active") { value }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
        }
      }
    }`,
    { variables: { first: 20 } },
  );

  const data = await response.json();
  const metaobjects = data.data.metaobjects;

  const recommendations = metaobjects.edges.map(({ node, cursor }) => ({
    id: node.id,
    handle: node.handle,
    cursor,
    sourceProduct: node.source_product?.reference || null,
    recommendedProducts:
      node.recommended_products?.references?.edges.map((e) => e.node) || [],
    priority: node.priority?.value ? parseInt(node.priority.value) : 0,
    isActive: node.is_active?.value === "true",
  }));

  return {
    recommendations,
    pageInfo: metaobjects.pageInfo,
  };
}

export async function getCustomRecommendations(admin, productId) {
  const response = await admin.graphql(
    `#graphql
    query GetCustomRecs {
      metaobjects(type: "${RECOMMENDATION_TYPE}", first: 10) {
        edges {
          node {
            id
            source_product: field(key: "source_product") {
              reference {
                ... on Product { id }
              }
            }
            recommended_products: field(key: "recommended_products") {
              references(first: 10) {
                edges {
                  node {
                    ... on Product {
                      id
                      title
                      handle
                      featuredImage { url altText }
                      priceRange {
                        minVariantPrice { amount currencyCode }
                      }
                      variants(first: 1) {
                        edges {
                          node { id }
                        }
                      }
                    }
                  }
                }
              }
            }
            priority: field(key: "priority") { value }
            is_active: field(key: "is_active") { value }
          }
        }
      }
    }`,
  );

  const data = await response.json();
  const edges = data.data.metaobjects.edges;

  // Filter for matching source product and active status
  const matching = edges
    .filter((e) => {
      const sourceId = e.node.source_product?.reference?.id;
      const isActive = e.node.is_active?.value === "true";
      return isActive && sourceId && sourceId.includes(productId);
    })
    .sort((a, b) => {
      const pA = parseInt(a.node.priority?.value || "0");
      const pB = parseInt(b.node.priority?.value || "0");
      return pB - pA;
    });

  if (matching.length === 0) return [];

  return matching[0].node.recommended_products?.references?.edges.map(
    (e) => e.node,
  ) || [];
}

export async function upsertRecommendation(admin, { handle, sourceProductId, recommendedProductIds, priority, isActive }) {
  const fields = [
    { key: "source_product", value: JSON.stringify(sourceProductId) },
    { key: "recommended_products", value: JSON.stringify(recommendedProductIds) },
    { key: "priority", value: String(priority || 0) },
    { key: "is_active", value: String(isActive !== false) },
  ];

  const response = await admin.graphql(
    `#graphql
    mutation UpsertRecommendation($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
      metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
        metaobject { id handle }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        handle: {
          type: RECOMMENDATION_TYPE,
          handle: handle,
        },
        metaobject: { fields },
      },
    },
  );

  return await response.json();
}

export async function deleteRecommendation(admin, id) {
  const response = await admin.graphql(
    `#graphql
    mutation DeleteRecommendation($id: ID!) {
      metaobjectDelete(id: $id) {
        deletedId
        userErrors { field message }
      }
    }`,
    { variables: { id } },
  );

  return await response.json();
}

export async function toggleRecommendation(admin, id, currentValue) {
  const response = await admin.graphql(
    `#graphql
    mutation ToggleRecommendation($id: ID!, $metaobject: MetaobjectUpdateInput!) {
      metaobjectUpdate(id: $id, metaobject: $metaobject) {
        metaobject { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        id,
        metaobject: {
          fields: [{ key: "is_active", value: String(!currentValue) }],
        },
      },
    },
  );

  return await response.json();
}

export async function upsertAnalyticsEntry(admin, { sourceProductId, recommendedProductId, eventType, shopDomain }) {
  const today = new Date().toISOString().split("T")[0];
  const handle = `${shopDomain}-${sourceProductId}-${recommendedProductId}-${eventType}-${today}`
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase();

  // Try to find existing entry
  const findResponse = await admin.graphql(
    `#graphql
    query FindAnalytics($type: String!, $handle: String!) {
      metaobjectByHandle(handle: { type: $type, handle: $handle }) {
        id
        count: field(key: "count") { value }
      }
    }`,
    {
      variables: {
        type: ANALYTICS_TYPE,
        handle,
      },
    },
  );

  const findData = await findResponse.json();
  const existing = findData.data.metaobjectByHandle;

  if (existing) {
    const currentCount = parseInt(existing.count?.value || "0");
    const response = await admin.graphql(
      `#graphql
      mutation UpdateAnalytics($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          id: existing.id,
          metaobject: {
            fields: [{ key: "count", value: String(currentCount + 1) }],
          },
        },
      },
    );
    return await response.json();
  }

  // Create new entry
  const response = await admin.graphql(
    `#graphql
    mutation CreateAnalytics($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
      metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
        metaobject { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        handle: {
          type: ANALYTICS_TYPE,
          handle,
        },
        metaobject: {
          fields: [
            { key: "source_product_id", value: sourceProductId },
            { key: "recommended_product_id", value: recommendedProductId },
            { key: "event_type", value: eventType },
            { key: "event_date", value: today },
            { key: "count", value: "1" },
            { key: "shop_domain", value: shopDomain },
          ],
        },
      },
    },
  );

  return await response.json();
}

export async function getAnalyticsSummary(admin, shopDomain) {
  const response = await admin.graphql(
    `#graphql
    query GetAnalyticsSummary {
      metaobjects(type: "${ANALYTICS_TYPE}", first: 250) {
        edges {
          node {
            source_product_id: field(key: "source_product_id") { value }
            recommended_product_id: field(key: "recommended_product_id") { value }
            event_type: field(key: "event_type") { value }
            event_date: field(key: "event_date") { value }
            count: field(key: "count") { value }
            shop_domain: field(key: "shop_domain") { value }
          }
        }
      }
    }`,
  );

  const data = await response.json();
  const entries = data.data.metaobjects.edges
    .map((e) => e.node)
    .filter((n) => {
      const domain = n.shop_domain?.value;
      return !shopDomain || domain === shopDomain;
    });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let totalImpressions = 0;
  let totalClicks = 0;
  let totalAddToCarts = 0;
  let recentImpressions = 0;
  let recentClicks = 0;
  let recentAddToCarts = 0;
  const productClickCounts = {};

  for (const entry of entries) {
    const count = parseInt(entry.count?.value || "0");
    const eventType = entry.event_type?.value;
    const eventDate = new Date(entry.event_date?.value);
    const isRecent = eventDate >= thirtyDaysAgo;
    const recProductId = entry.recommended_product_id?.value;

    switch (eventType) {
      case "impression":
        totalImpressions += count;
        if (isRecent) recentImpressions += count;
        break;
      case "click":
        totalClicks += count;
        if (isRecent) recentClicks += count;
        if (recProductId) {
          productClickCounts[recProductId] =
            (productClickCounts[recProductId] || 0) + count;
        }
        break;
      case "add_to_cart":
        totalAddToCarts += count;
        if (isRecent) recentAddToCarts += count;
        break;
    }
  }

  const topProducts = Object.entries(productClickCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([productId, clicks]) => ({ productId, clicks }));

  return {
    allTime: {
      impressions: totalImpressions,
      clicks: totalClicks,
      addToCarts: totalAddToCarts,
    },
    last30Days: {
      impressions: recentImpressions,
      clicks: recentClicks,
      addToCarts: recentAddToCarts,
    },
    topProducts,
  };
}
