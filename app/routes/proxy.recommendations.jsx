import { authenticate } from "../shopify.server";
import { getCustomRecommendations, upsertAnalyticsEntry } from "../utils/metaobjects.server";
import { checkUsageLimit, incrementUsage, getOrCreateShop } from "../utils/billing.server";
import { getCurrentPlan } from "../utils/billing.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id");
  const limit = parseInt(url.searchParams.get("limit") || "4");

  if (!productId) {
    return new Response(JSON.stringify({ recommendations: [], error: "product_id required" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const recommendations = await getCustomRecommendations(admin, productId);
    const limited = recommendations.slice(0, limit);

    return new Response(
      JSON.stringify({
        recommendations: limited,
        source: limited.length > 0 ? "custom" : "none",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return new Response(
      JSON.stringify({ recommendations: [], source: "none", error: "fetch_failed" }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.public.appProxy(request);

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { event_type, source_product_id, recommended_product_id } = body;
  const shopDomain = session.shop;

  if (!event_type || !source_product_id || !recommended_product_id) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: event_type, source_product_id, recommended_product_id" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const validEvents = ["impression", "click", "add_to_cart"];
  if (!validEvents.includes(event_type)) {
    return new Response(
      JSON.stringify({ error: `Invalid event_type. Must be one of: ${validEvents.join(", ")}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    await getOrCreateShop(prisma, shopDomain);

    // Determine plan - default to free for proxy requests
    const shop = await prisma.shop.findUnique({ where: { id: shopDomain } });
    const plan = shop?.plan || "free";

    const usage = await checkUsageLimit(prisma, shopDomain, plan);

    if (!usage.hasCapacity) {
      return new Response(
        JSON.stringify({
          error: "limit_reached",
          used: usage.used,
          limit: usage.limit,
          plan: usage.plan,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    // Track the event
    await upsertAnalyticsEntry(admin, {
      sourceProductId: source_product_id,
      recommendedProductId: recommended_product_id,
      eventType: event_type,
      shopDomain,
    });

    // Increment usage counter
    await incrementUsage(prisma, shopDomain);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error tracking analytics:", error);
    return new Response(
      JSON.stringify({ error: "tracking_failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
