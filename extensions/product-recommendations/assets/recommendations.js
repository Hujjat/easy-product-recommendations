(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const containers = document.querySelectorAll(".easy-recs");
    containers.forEach(initRecommendations);
  });

  function initRecommendations(container) {
    const productId = container.dataset.productId;
    const limit = parseInt(container.dataset.limit || "4");
    const layout = container.dataset.layout || "grid";
    const showAtc = container.dataset.showAtc === "true";
    const showPrice = container.dataset.showPrice === "true";
    const showVendor = container.dataset.showVendor === "true";
    const proxyPath = container.dataset.proxyPath || "/apps/easy-recs";
    const recContainer = container.querySelector(".easy-recs__container");

    if (!productId || !recContainer) return;

    fetchRecommendations(proxyPath, productId, limit)
      .then(function (products) {
        if (products.length === 0) {
          recContainer.innerHTML =
            '<p class="easy-recs__empty">No recommendations available</p>';
          return;
        }

        recContainer.innerHTML = "";
        products.forEach(function (product) {
          const card = createProductCard(product, {
            showAtc,
            showPrice,
            showVendor,
          });
          recContainer.appendChild(card);

          // Track impression
          trackEvent(proxyPath, "impression", productId, product.id || product.handle);
        });

        if (layout === "slider") {
          initSlider(recContainer);
        }
      })
      .catch(function (err) {
        console.error("Easy Recs: Error loading recommendations", err);
        recContainer.innerHTML = "";
      });
  }

  function fetchRecommendations(proxyPath, productId, limit) {
    // First try custom recommendations from app proxy
    return fetch(proxyPath + "?product_id=" + productId + "&limit=" + limit)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data.recommendations && data.recommendations.length > 0) {
          return data.recommendations;
        }
        // Fall back to Shopify's native recommendations
        return fetchShopifyRecommendations(productId, limit);
      })
      .catch(function () {
        return fetchShopifyRecommendations(productId, limit);
      });
  }

  function fetchShopifyRecommendations(productId, limit) {
    return fetch(
      "/recommendations/products.json?product_id=" +
        productId +
        "&limit=" +
        limit,
    )
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        return (data.products || []).map(function (p) {
          return {
            id: String(p.id),
            title: p.title,
            handle: p.handle,
            url: "/products/" + p.handle,
            image: p.featured_image,
            price: p.price,
            priceFormatted: formatMoney(p.price),
            vendor: p.vendor,
            variantId: p.variants && p.variants[0] ? p.variants[0].id : null,
          };
        });
      })
      .catch(function () {
        return [];
      });
  }

  function createProductCard(product, options) {
    var card = document.createElement("div");
    card.className = "easy-recs__card";

    var imageUrl =
      product.image ||
      (product.featuredImage && product.featuredImage.url) ||
      "";
    var title = product.title || "";
    var url = product.url || "/products/" + (product.handle || "");
    var price = product.priceFormatted || "";
    var vendor = product.vendor || "";

    // Format price from metaobject data if needed
    if (
      !price &&
      product.priceRange &&
      product.priceRange.minVariantPrice
    ) {
      price = formatMoney(
        parseFloat(product.priceRange.minVariantPrice.amount) * 100,
      );
    }

    var html = "";

    if (imageUrl) {
      html +=
        '<a href="' +
        url +
        '" class="easy-recs__card-image-link">' +
        '<img class="easy-recs__card-image" src="' +
        imageUrl +
        '" alt="' +
        escapeHtml(title) +
        '" loading="lazy" />' +
        "</a>";
    }

    html += '<div class="easy-recs__card-info">';
    html +=
      '<a href="' +
      url +
      '" class="easy-recs__card-title">' +
      escapeHtml(title) +
      "</a>";

    if (options.showVendor && vendor) {
      html +=
        '<p class="easy-recs__card-vendor">' + escapeHtml(vendor) + "</p>";
    }

    if (options.showPrice && price) {
      html += '<p class="easy-recs__card-price">' + price + "</p>";
    }

    if (options.showAtc) {
      html +=
        '<button class="easy-recs__card-atc" data-variant-id="' +
        (product.variantId || "") +
        '" data-product-id="' +
        (product.id || "") +
        '">Add to Cart</button>';
    }

    html += "</div>";
    card.innerHTML = html;

    // Click tracking
    var links = card.querySelectorAll("a");
    links.forEach(function (link) {
      link.addEventListener("click", function () {
        var proxyPath =
          card.closest(".easy-recs")?.dataset.proxyPath || "/apps/easy-recs";
        var sourceId =
          card.closest(".easy-recs")?.dataset.productId || "";
        trackEvent(proxyPath, "click", sourceId, product.id || product.handle);
      });
    });

    // Add to cart handler
    var atcBtn = card.querySelector(".easy-recs__card-atc");
    if (atcBtn) {
      atcBtn.addEventListener("click", function (e) {
        e.preventDefault();
        var variantId = this.dataset.variantId;
        var proxyPath =
          card.closest(".easy-recs")?.dataset.proxyPath || "/apps/easy-recs";
        var sourceId =
          card.closest(".easy-recs")?.dataset.productId || "";

        if (variantId) {
          addToCart(variantId);
          trackEvent(
            proxyPath,
            "add_to_cart",
            sourceId,
            product.id || product.handle,
          );
          this.textContent = "Added!";
          this.disabled = true;
          setTimeout(
            function () {
              this.textContent = "Add to Cart";
              this.disabled = false;
            }.bind(this),
            2000,
          );
        }
      });
    }

    return card;
  }

  function addToCart(variantId) {
    fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: parseInt(variantId), quantity: 1 }],
      }),
    })
      .then(function (res) {
        return res.json();
      })
      .catch(function (err) {
        console.error("Easy Recs: Add to cart failed", err);
      });
  }

  function trackEvent(proxyPath, eventType, sourceProductId, recommendedProductId) {
    fetch(proxyPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: eventType,
        source_product_id: String(sourceProductId),
        recommended_product_id: String(recommendedProductId),
      }),
    }).catch(function () {
      // Silently fail analytics tracking
    });
  }

  function initSlider(container) {
    container.style.overflowX = "auto";
    container.style.scrollBehavior = "smooth";
    container.style.scrollSnapType = "x mandatory";

    var cards = container.querySelectorAll(".easy-recs__card");
    cards.forEach(function (card) {
      card.style.scrollSnapAlign = "start";
      card.style.flexShrink = "0";
    });
  }

  function formatMoney(cents) {
    if (typeof cents === "string") cents = parseFloat(cents);
    return "$" + (cents / 100).toFixed(2);
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
})();
