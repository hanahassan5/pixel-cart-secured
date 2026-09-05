const ordersContainer = document.querySelector("#orders");
const successBanner = document.querySelector("#order-success-banner");

async function loadOrders() {
    if (!ordersContainer) return;

    // Check if coming from a fresh checkout
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("id") && successBanner) {
        successBanner.style.display = "flex";
    }

    ordersContainer.innerHTML = `
        <div class="skeleton" style="height: 60px; border-radius: 8px; margin-bottom: 0.5rem;"></div>
        <div class="skeleton" style="height: 60px; border-radius: 8px; margin-bottom: 0.5rem;"></div>
        <div class="skeleton" style="height: 60px; border-radius: 8px;"></div>
    `;

    try {
        const response = await api.orders();
        const orders = response.data || response;

        if (orders && orders.length > 0) {
            ordersContainer.innerHTML = `
                <div class="orders-table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Order Ref</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Total</th>
                                <th style="text-align: right;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.map((order) => {
                const status = String(order.status || "pending").toLowerCase();
                const badgeClass = (status === "completed" || status === "paid")
                    ? "badge-success"
                    : status === "cancelled"
                        ? "badge-danger"
                        : "badge-warning";

                const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString() : "Recent";
                const total = Number(order.total_price || 0).toFixed(2);

                return `
                                    <tr>
                                        <td><strong class="mono" style="color: var(--text-primary);">#PX-${order.id.toString().padStart(5, '0')}</strong></td>
                                        <td>${dateStr}</td>
                                        <td><span class="badge ${badgeClass}">${status}</span></td>
                                        <td><span class="mono" style="font-weight: 700; color: var(--text-primary);">$${total}</span></td>
                                        <td style="text-align: right;">
                                            <a class="btn btn-outline btn-sm" href="${typeof resolveApiUrl === 'function' ? resolveApiUrl(`/api/users/invoice?orderId=${order.id}&name=Customer`) : `/api/users/invoice?orderId=${order.id}&name=Customer`}" target="_blank">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                                <span>Invoice</span>
                                            </a>
                                        </td>
                                    </tr>
                                `;
            }).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            ordersContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    </div>
                    <h3 class="empty-title">No orders placed yet</h3>
                    <p class="empty-desc">When you purchase games, keys, or accessories, they will appear here with instant digital vouchers and receipts.</p>
                    <a href="products.html" class="btn btn-primary btn-md">Browse Catalog</a>
                </div>
            `;
        }
    } catch (error) {
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <h3 class="empty-title">Unable to retrieve orders</h3>
                <p class="empty-desc">Please ensure you are signed in to your account.</p>
                <a href="login.html" class="btn btn-secondary btn-sm">Sign In</a>
            </div>
        `;
    }
}

loadOrders();
