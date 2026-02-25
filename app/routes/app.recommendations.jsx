import { useCallback, useState } from "react";
import { useFetcher, useLoaderData, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import {
  getAllRecommendations,
  upsertRecommendation,
  deleteRecommendation,
  toggleRecommendation,
} from "../utils/metaobjects.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const cursor = url.searchParams.get("cursor") || undefined;

  const { recommendations, pageInfo } = await getAllRecommendations(admin, {
    cursor,
    search,
  });

  return { recommendations, pageInfo, search };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "create":
    case "update": {
      const sourceProductId = formData.get("sourceProductId");
      const recommendedProductIds = JSON.parse(
        formData.get("recommendedProductIds") || "[]",
      );
      const priority = parseInt(formData.get("priority") || "0");
      const isActive = formData.get("isActive") === "true";
      const handle =
        formData.get("handle") ||
        `rec-${sourceProductId.split("/").pop()}-${Date.now()}`;

      const result = await upsertRecommendation(admin, {
        handle,
        sourceProductId,
        recommendedProductIds,
        priority,
        isActive,
      });

      return { success: true, result };
    }

    case "delete": {
      const id = formData.get("id");
      const result = await deleteRecommendation(admin, id);
      return { success: true, result };
    }

    case "toggle": {
      const id = formData.get("id");
      const currentValue = formData.get("currentValue") === "true";
      const result = await toggleRecommendation(admin, id, currentValue);
      return { success: true, result };
    }

    default:
      return { error: "Unknown intent" };
  }
};

export default function RecommendationsPage() {
  const { recommendations, pageInfo, search } = useLoaderData();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [editingRec, setEditingRec] = useState(null);
  const [sourceProduct, setSourceProduct] = useState(null);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [priority, setPriority] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const isSubmitting = fetcher.state !== "idle";

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target?.value ?? e;
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("cursor");
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  const openProductPicker = useCallback(async (type) => {
    try {
      const selected = await shopify.resourcePicker({
        type: "product",
        multiple: type === "recommended",
        action: "select",
      });

      if (!selected || selected.length === 0) return;

      if (type === "source") {
        setSourceProduct({
          id: selected[0].id,
          title: selected[0].title,
          handle: selected[0].handle,
        });
      } else {
        setRecommendedProducts(
          selected.map((p) => ({
            id: p.id,
            title: p.title,
            handle: p.handle,
          })),
        );
      }
    } catch (err) {
      console.error("Product picker error:", err);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!sourceProduct || recommendedProducts.length === 0) return;

    const formData = new FormData();
    formData.set("intent", editingRec ? "update" : "create");
    formData.set("sourceProductId", sourceProduct.id);
    formData.set(
      "recommendedProductIds",
      JSON.stringify(recommendedProducts.map((p) => p.id)),
    );
    formData.set("priority", priority);
    formData.set("isActive", String(isActive));
    if (editingRec) {
      formData.set("handle", editingRec.handle);
    }

    fetcher.submit(formData, { method: "POST" });
    resetForm();
  }, [sourceProduct, recommendedProducts, priority, isActive, editingRec, fetcher]);

  const resetForm = useCallback(() => {
    setShowForm(false);
    setEditingRec(null);
    setSourceProduct(null);
    setRecommendedProducts([]);
    setPriority("0");
    setIsActive(true);
  }, []);

  const handleEdit = useCallback((rec) => {
    setEditingRec(rec);
    setSourceProduct(rec.sourceProduct);
    setRecommendedProducts(rec.recommendedProducts);
    setPriority(String(rec.priority));
    setIsActive(rec.isActive);
    setShowForm(true);
  }, []);

  return (
    <s-page heading="Recommendations">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
      >
        Add Custom Recommendation
      </s-button>

      <s-section>
        <s-banner tone="info">
          Default recommendations come from Shopify. Add custom recommendations
          here to override defaults for specific products.
        </s-banner>
      </s-section>

      <s-section>
        <s-box padding="base">
          <s-text-field
            label="Search recommendations"
            value={search}
            onInput={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by product name..."
            clearButton
            onClear={() => handleSearchChange("")}
          />
        </s-box>
      </s-section>

      {showForm && (
        <s-section heading={editingRec ? "Edit Recommendation" : "New Custom Recommendation"}>
          <s-card>
            <s-box padding="base">
              <s-stack direction="block" gap="base">
                <s-stack direction="block" gap="tight">
                  <s-text variant="headingSm">Source Product</s-text>
                  {sourceProduct ? (
                    <s-stack direction="inline" gap="tight" align="center">
                      <s-text>{sourceProduct.title}</s-text>
                      <s-button
                        variant="plain"
                        onClick={() => openProductPicker("source")}
                      >
                        Change
                      </s-button>
                    </s-stack>
                  ) : (
                    <s-button onClick={() => openProductPicker("source")}>
                      Select Source Product
                    </s-button>
                  )}
                </s-stack>

                <s-stack direction="block" gap="tight">
                  <s-text variant="headingSm">Recommended Products</s-text>
                  {recommendedProducts.length > 0 ? (
                    <s-stack direction="block" gap="tight">
                      {recommendedProducts.map((p) => (
                        <s-text key={p.id}>{p.title}</s-text>
                      ))}
                      <s-button
                        variant="plain"
                        onClick={() => openProductPicker("recommended")}
                      >
                        Change Selection
                      </s-button>
                    </s-stack>
                  ) : (
                    <s-button onClick={() => openProductPicker("recommended")}>
                      Select Recommended Products
                    </s-button>
                  )}
                </s-stack>

                <s-text-field
                  label="Priority"
                  type="number"
                  value={priority}
                  onInput={(e) => setPriority(e.target.value)}
                  helpText="Higher priority recommendations are shown first"
                />

                <s-checkbox
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                >
                  Active
                </s-checkbox>

                <s-stack direction="inline" gap="tight">
                  <s-button
                    variant="primary"
                    onClick={handleSave}
                    disabled={
                      !sourceProduct ||
                      recommendedProducts.length === 0 ||
                      isSubmitting
                    }
                  >
                    {editingRec ? "Update" : "Save"} Recommendation
                  </s-button>
                  <s-button onClick={resetForm}>Cancel</s-button>
                </s-stack>
              </s-stack>
            </s-box>
          </s-card>
        </s-section>
      )}

      <s-section heading="Custom Recommendations">
        {recommendations.length === 0 ? (
          <s-card>
            <s-box padding="loose">
              <s-stack direction="block" gap="tight" align="center">
                <s-text tone="subdued">
                  No custom recommendations yet. Add one to override default
                  Shopify recommendations for specific products.
                </s-text>
              </s-stack>
            </s-box>
          </s-card>
        ) : (
          <s-stack direction="block" gap="tight">
            {recommendations.map((rec) => (
              <s-card key={rec.id}>
                <s-box padding="base">
                  <s-stack direction="inline" gap="base" align="center" wrap>
                    <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                      <s-stack direction="inline" gap="tight" align="center">
                        <s-text variant="headingSm">
                          {rec.sourceProduct?.title || "Unknown Product"}
                        </s-text>
                        <s-badge tone={rec.isActive ? "success" : undefined}>
                          {rec.isActive ? "Active" : "Inactive"}
                        </s-badge>
                      </s-stack>
                      <s-text tone="subdued">
                        {rec.recommendedProducts.length} recommended product
                        {rec.recommendedProducts.length !== 1 ? "s" : ""} |
                        Priority: {rec.priority}
                      </s-text>
                    </s-stack>

                    <s-stack direction="inline" gap="tight">
                      <s-button
                        variant="plain"
                        onClick={() => handleEdit(rec)}
                      >
                        Edit
                      </s-button>
                      <fetcher.Form method="POST">
                        <input type="hidden" name="intent" value="toggle" />
                        <input type="hidden" name="id" value={rec.id} />
                        <input
                          type="hidden"
                          name="currentValue"
                          value={String(rec.isActive)}
                        />
                        <s-button variant="plain" type="submit">
                          {rec.isActive ? "Deactivate" : "Activate"}
                        </s-button>
                      </fetcher.Form>
                      <fetcher.Form method="POST">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={rec.id} />
                        <s-button variant="plain" tone="critical" type="submit">
                          Delete
                        </s-button>
                      </fetcher.Form>
                    </s-stack>
                  </s-stack>
                </s-box>
              </s-card>
            ))}
          </s-stack>
        )}
      </s-section>

      {(pageInfo.hasNextPage || pageInfo.hasPreviousPage) && (
        <s-section>
          <s-stack direction="inline" gap="tight" align="center">
            {pageInfo.hasPreviousPage && (
              <s-button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete("cursor");
                  setSearchParams(params);
                }}
              >
                First Page
              </s-button>
            )}
            {pageInfo.hasNextPage && (
              <s-button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set("cursor", pageInfo.endCursor);
                  setSearchParams(params);
                }}
              >
                Next Page
              </s-button>
            )}
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}
