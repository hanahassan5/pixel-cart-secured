const productContainer = document.querySelector("#product");
const reviewsContainer = document.querySelector("#reviews");
const reviewForm = document.querySelector("#review-form");
const breadcrumbProductName = document.querySelector("#breadcrumb-product-name");
const productId = new URLSearchParams(window.location.search).get("id");

let currentProduct = null;

async function loadProductPage() {
    if (!productId) {
        window.location.href = "products.html";
        return;
    }

    if (productContainer) {
        productContainer.innerHTML = `
            <div class="product-detail-layout">
                <div class="skeleton" style="aspect-ratio: 1/1; border-radius: 16px;"></div>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <div class="skeleton" style="height: 16px; width: 25%;"></div>
                    <div class="skeleton" style="height: 36px; width: 85%;"></div>
                    <div class="skeleton" style="height: 18px; width: 40%;"></div>
                    <div class="skeleton" style="height: 32px; width: 30%;"></div>
                    <div class="skeleton" style="height: 80px; width: 100%;"></div>
                    <div class="skeleton" style="height: 44px; width: 60%; margin-top: 1rem;"></div>
                </div>
            </div>
        `;
    }

    try {
        const productResponse = await api.product(productId);
        currentProduct = productResponse.data || productResponse;

        document.title = `${currentProduct.name} | Pixel Cart`;
        if (breadcrumbProductName) {
            breadcrumbProductName.textContent = currentProduct.name;
        }

        const formattedPrice = Number(currentProduct.price).toFixed(2);
        const inStock = (currentProduct.stock ?? 10) > 0;
        const imageUrl = (typeof resolveApiUrl === "function" && currentProduct.image && currentProduct.image.startsWith("/"))
            ? resolveApiUrl(currentProduct.image)
            : (currentProduct.image || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80");

        productContainer.innerHTML = `
            <div class="product-detail-layout">
                <div class="product-detail-gallery">
                    <div class="product-detail-media">
                        <img src="${imageUrl}" alt="${currentProduct.name}" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80'">
                    </div>
                </div>

                <div class="product-detail-info">
                    <div>
                        <span class="badge badge-primary" style="margin-bottom: 0.5rem;">${currentProduct.category || "General"}</span>
                        <h1 class="product-detail-title">${currentProduct.name}</h1>
                    </div>

                    <div class="product-detail-meta">
                        <span class="stock-indicator ${inStock ? '' : 'low-stock'}">
                            ${inStock ? `In Stock (${currentProduct.stock ?? 15} units available)` : 'Backorder'}
                        </span>
                        <span class="text-muted">•</span>
                        <span class="rating-stars" id="product-header-stars">☆☆☆☆☆</span>
                        <strong id="product-header-score" style="color: var(--text-primary); margin-left: 0.25rem;">—</strong>
                        <span id="product-header-count" class="text-muted text-xs" style="margin-left: 0.25rem;">(0 reviews)</span>
                    </div>

                    <div class="product-detail-price">$${formattedPrice}</div>

                    <p class="product-detail-desc">${currentProduct.description || "High-performance gaming product designed for immersive digital experiences."}</p>

                    <div class="product-specs-list">
                        <div class="product-spec-item">
                            <span class="product-spec-label">Delivery Format</span>
                            <span class="product-spec-value">Instant Code / Express Box</span>
                        </div>
                        <div class="product-spec-item">
                            <span class="product-spec-label">Compatibility</span>
                            <span class="product-spec-value">PC / Console / Cross-play</span>
                        </div>
                        <div class="product-spec-item">
                            <span class="product-spec-label">Warranty</span>
                            <span class="product-spec-value">1-Year Official Protection</span>
                        </div>
                        <div class="product-spec-item">
                            <span class="product-spec-label">Item SKU</span>
                            <span class="product-spec-value mono">PX-${currentProduct.id.toString().padStart(4, '0')}</span>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 1.5rem; margin-top: 0.5rem;">
                        <span class="form-label" style="margin: 0;">Quantity:</span>
                        <div class="quantity-stepper">
                            <button type="button" class="quantity-btn" id="qty-minus">-</button>
                            <input type="number" id="product-qty" class="quantity-input" value="1" min="1" max="${currentProduct.stock || 20}" readonly>
                            <button type="button" class="quantity-btn" id="qty-plus">+</button>
                        </div>
                    </div>

                    <div class="product-detail-actions">
                        <button id="add-to-cart-btn" class="btn btn-primary btn-lg" style="flex: 2; min-width: 180px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                            <span>Add to Cart</span>
                        </button>
                        <button id="buy-now-btn" class="btn btn-secondary btn-lg" style="flex: 1; min-width: 140px;">
                            <span>Buy Now</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Quantity controls
        const qtyInput = document.querySelector("#product-qty");
        document.querySelector("#qty-minus")?.addEventListener("click", () => {
            const current = parseInt(qtyInput.value, 10) || 1;
            if (current > 1) qtyInput.value = current - 1;
        });
        document.querySelector("#qty-plus")?.addEventListener("click", () => {
            const current = parseInt(qtyInput.value, 10) || 1;
            const max = parseInt(qtyInput.max, 10) || 20;
            if (current < max) qtyInput.value = current + 1;
        });

        // Add to cart listener
        const addBtn = document.querySelector("#add-to-cart-btn");
        addBtn?.addEventListener("click", async () => {
            const quantity = parseInt(qtyInput.value, 10) || 1;
            addBtn.disabled = true;
            try {
                await api.addToCart({ productId: currentProduct.id, quantity });
                showToast(`Added <strong>${quantity}x ${currentProduct.name}</strong> to your cart!`, "success");
                updateCartBadge();
                addBtn.innerHTML = `<span>✓ Added to Cart</span>`;
                setTimeout(() => {
                    addBtn.innerHTML = `
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                        <span>Add to Cart</span>`;
                    addBtn.disabled = false;
                }, 1600);
            } catch (err) {
                showToast(err.message || "Failed to add to cart", "error");
                addBtn.disabled = false;
            }
        });

        // Buy now listener
        document.querySelector("#buy-now-btn")?.addEventListener("click", async () => {
            const quantity = parseInt(qtyInput.value, 10) || 1;
            try {
                await api.addToCart({ productId: currentProduct.id, quantity });
                window.location.href = "checkout.html";
            } catch (err) {
                showToast(err.message || "Failed to proceed to checkout", "error");
            }
        });

        // Load reviews
        loadReviews();
    } catch (error) {
        showState(productContainer, "Product not found or currently unavailable.");
    }
}

function formatStars(rating) {
    if (rating === null || rating === undefined || isNaN(rating) || rating <= 0) {
        return "☆☆☆☆☆";
    }
    const full = Math.floor(rating);
    const decimal = rating - full;
    let stars = "★".repeat(Math.min(5, full));
    if (stars.length < 5) {
        if (decimal >= 0.75) {
            stars += "★";
        } else if (decimal >= 0.25) {
            stars += "½";
        }
    }
    while (stars.length < 5) {
        stars += "☆";
    }
    return stars;
}

async function loadReviews() {
    if (!reviewsContainer) return;
    try {
        const reviewsResponse = await api.reviews(productId);
        const reviews = reviewsResponse.data || reviewsResponse || [];
        reviewsContainer.innerHTML = "";

        const totalCount = Array.isArray(reviews) ? reviews.length : 0;
        let totalSum = 0;
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        if (totalCount > 0) {
            reviews.forEach((r) => {
                const starVal = Math.min(5, Math.max(1, parseInt(r.rating, 10) || 5));
                counts[starVal] = (counts[starVal] || 0) + 1;
                totalSum += starVal;
            });
        }

        const avgRating = totalCount > 0 ? (totalSum / totalCount) : 0;
        const formattedAvg = totalCount > 0
            ? (Number.isInteger(avgRating) ? avgRating.toFixed(1) : (Math.round(avgRating * 100) / 100).toString())
            : "—";
        const starsDisplay = formatStars(avgRating);

        // Update product header meta
        const headerStars = document.querySelector("#product-header-stars");
        const headerScore = document.querySelector("#product-header-score");
        const headerCount = document.querySelector("#product-header-count");
        if (headerStars) headerStars.textContent = starsDisplay;
        if (headerScore) headerScore.textContent = formattedAvg;
        if (headerCount) headerCount.textContent = `(${totalCount} review${totalCount === 1 ? '' : 's'})`;

        // Update reviews summary card
        const summaryScore = document.querySelector("#summary-avg-score");
        const summaryStars = document.querySelector("#summary-avg-stars");
        const summaryCount = document.querySelector("#summary-review-count");
        if (summaryScore) summaryScore.textContent = formattedAvg;
        if (summaryStars) summaryStars.textContent = starsDisplay;
        if (summaryCount) {
            summaryCount.textContent = totalCount > 0
                ? `Based on ${totalCount} verified review${totalCount === 1 ? '' : 's'}`
                : "No reviews yet";
        }

        // Update star distribution bars
        for (let s = 1; s <= 5; s++) {
            const countElem = document.querySelector(`#dist-count-${s}`);
            const barElem = document.querySelector(`#dist-bar-${s}`);
            const count = counts[s] || 0;
            const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            if (countElem) countElem.textContent = count;
            if (barElem) barElem.style.width = `${pct}%`;
        }

        if (totalCount > 0) {
            reviews.forEach((review) => {
                const card = document.createElement("div");
                card.className = "review-card";

                const username = review.username || "Verified Gamer";
                const userInitial = username.charAt(0).toUpperCase();
                const starVal = Math.min(5, Math.max(1, parseInt(review.rating, 10) || 5));
                const individualStars = "★".repeat(starVal) + "☆".repeat(5 - starVal);
                const dateStr = review.created_at ? new Date(review.created_at).toLocaleDateString() : "Recent";

                card.innerHTML = `
                    <div class="review-card-head">
                        <div class="review-author">
                            <div class="review-avatar">${userInitial}</div>
                            <div>
                                <h4 style="font-size: 0.875rem;">${username}</h4>
                                <span class="text-xs text-muted">${dateStr}</span>
                            </div>
                        </div>
                        <div class="rating-stars">${individualStars}</div>
                    </div>
                    <div class="review-body"></div>
                `;

                // IMPORTANT: Preserves Stored XSS vulnerability required for security testing
                card.querySelector(".review-body").textContent = review.content;
                reviewsContainer.appendChild(card);
            });
        } else {
            reviewsContainer.innerHTML = `
                <div class="empty-state">
                    <h4 class="empty-title">No reviews yet</h4>
                    <p class="empty-desc">Be the first player to review this product and share your experience.</p>
                </div>
            `;
        }
    } catch (error) {
        reviewsContainer.innerHTML = `<p class="text-muted text-sm">Unable to load reviews.</p>`;
    }
}

reviewForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = reviewForm.querySelector("textarea[name='content']").value.trim();
    const rating = parseInt(reviewForm.querySelector("select[name='rating']").value, 10) || 5;
    const submitBtn = document.querySelector("#submit-review-btn");

    if (!content) {
        showToast("Please enter review content", "error");
        return;
    }

    submitBtn.disabled = true;
    try {
        await api.addReview(productId, { content, rating });
        showToast("Review submitted successfully!", "success");
        reviewForm.reset();
        await loadReviews();
    } catch (err) {
        showToast(err.message || "Failed to post review. Please ensure you are logged in.", "error");
    } finally {
        submitBtn.disabled = false;
    }
});

loadProductPage();
