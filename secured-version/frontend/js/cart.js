const cartContainer = document.querySelector("#cart-items");
const cartSummary = document.querySelector("#cart-summary");

async function loadCart() {
    if (!cartContainer || !cartSummary) return;

    cartContainer.innerHTML = `
        <div class="skeleton" style="height: 100px; border-radius: 10px; margin-bottom: 1rem;"></div>
        <div class="skeleton" style="height: 100px; border-radius: 10px; margin-bottom: 1rem;"></div>
    `;
    cartSummary.innerHTML = `<div class="skeleton" style="height: 220px; border-radius: 16px;"></div>`;

    try {
        const response = await api.cart();
        const cart = response.data || response;
        const items = cart.items || [];
        const totalItems = cart.totalItems ?? items.reduce((acc, i) => acc + i.quantity, 0);
        const subtotal = Number(cart.subtotal || 0).toFixed(2);

        updateCartBadge();

        if (items.length > 0) {
            cartContainer.innerHTML = items.map((item) => {
                const itemTotal = (Number(item.price) * Number(item.quantity)).toFixed(2);
                return `
                    <div class="cart-item-card">
                        <div class="cart-item-thumb">
                            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80'">
                        </div>
                        <div class="cart-item-details">
                            <h3><a href="product.html?id=${item.product_id}">${item.name}</a></h3>
                            <div class="cart-item-price">$${Number(item.price).toFixed(2)} each</div>
                        </div>
                        <div class="cart-item-actions">
                            <div class="quantity-stepper">
                                <button type="button" class="quantity-btn cart-qty-minus" data-id="${item.product_id}" data-qty="${item.quantity}">-</button>
                                <input class="quantity-input cart-qty-input" data-id="${item.product_id}" type="number" min="1" max="${item.stock || 20}" value="${item.quantity}" readonly>
                                <button type="button" class="quantity-btn cart-qty-plus" data-id="${item.product_id}" data-qty="${item.quantity}" data-max="${item.stock || 20}">+</button>
                            </div>
                            <div class="cart-item-subtotal">$${itemTotal}</div>
                            <button class="btn-icon-danger remove-item-btn" data-id="${item.product_id}" data-name="${item.name}" aria-label="Remove item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                        </div>
                    </div>
                `;
            }).join("");

            cartSummary.innerHTML = `
                <h3 style="margin-bottom: 1rem;">Order Summary</h3>
                <div class="summary-row">
                    <span>Subtotal (${totalItems} item${totalItems === 1 ? '' : 's'})</span>
                    <span class="mono">$${subtotal}</span>
                </div>
                <div class="summary-row">
                    <span>Estimated Shipping</span>
                    <span class="badge badge-success">FREE</span>
                </div>
                <div class="summary-row">
                    <span>Estimated Sales Tax</span>
                    <span class="mono">$0.00</span>
                </div>
                <div class="summary-row total">
                    <span>Total Amount</span>
                    <span>$${subtotal}</span>
                </div>
                <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
                    <a class="btn btn-primary btn-block btn-lg" href="checkout.html">
                        <span>Proceed to Checkout</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </a>
                    <a class="btn btn-outline btn-block btn-sm" href="products.html">Continue Shopping</a>
                </div>
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 0.5rem; justify-content: center;" class="text-xs text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span>Secured with 256-bit encryption</span>
                </div>
            `;

            // Bind stepper and removal buttons
            document.querySelectorAll(".cart-qty-minus").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const id = btn.dataset.id;
                    const qty = parseInt(btn.dataset.qty, 10);
                    if (qty > 1) {
                        await api.updateCart(id, qty - 1);
                        loadCart();
                    } else {
                        await api.removeCart(id);
                        showToast("Item removed from cart", "info");
                        loadCart();
                    }
                });
            });

            document.querySelectorAll(".cart-qty-plus").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const id = btn.dataset.id;
                    const qty = parseInt(btn.dataset.qty, 10);
                    const max = parseInt(btn.dataset.max, 10) || 20;
                    if (qty < max) {
                        await api.updateCart(id, qty + 1);
                        loadCart();
                    } else {
                        showToast("Maximum available stock reached", "error");
                    }
                });
            });

            document.querySelectorAll(".remove-item-btn").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const id = btn.dataset.id;
                    const name = btn.dataset.name || "Item";
                    await api.removeCart(id);
                    showToast(`Removed <strong>${name}</strong> from cart`, "info");
                    loadCart();
                });
            });

        } else {
            cartContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                    </div>
                    <h3 class="empty-title">Your shopping cart is empty</h3>
                    <p class="empty-desc">Explore our catalog of authentic games and tournament hardware to build your loadout.</p>
                    <a href="products.html" class="btn btn-primary btn-md">Explore Products</a>
                </div>
            `;
            cartSummary.innerHTML = `
                <h3 style="margin-bottom: 0.5rem;">Order Summary</h3>
                <p class="text-muted text-sm">Add items to your cart to see total calculations and checkout options.</p>
            `;
        }
    } catch (error) {
        showState(cartContainer, "Unable to retrieve cart contents. Please sign in or refresh.");
    }
}

loadCart();
