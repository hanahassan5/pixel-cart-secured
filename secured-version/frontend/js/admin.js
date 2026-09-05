// Tab Switching Logic
document.querySelectorAll(".admin-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".admin-tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".admin-tab-content").forEach((c) => (c.style.display = "none"));

        btn.classList.add("active");
        const tabKey = btn.dataset.tab;
        const target = document.querySelector(`#tab-${tabKey}`);
        if (target) target.style.display = "block";

        if (tabKey === "products") loadAdminProducts();
        if (tabKey === "orders") loadAdminOrders();
        if (tabKey === "overview") loadAdminStats();
    });
});

// Load Overview Statistics
async function loadAdminStats() {
    try {
        const res = await api.adminStats();
        const stats = res.data || res;
        document.querySelector("#stat-revenue").textContent = `$${Number(stats.revenue || 0).toFixed(2)}`;
        document.querySelector("#stat-orders").textContent = stats.orders || 0;
        document.querySelector("#stat-products").textContent = stats.products || 0;
        document.querySelector("#stat-users").textContent = stats.users || 0;

        loadRecentUsers();
    } catch (err) {
        showToast("Failed to load operations metrics", "error");
    }
}

// Load Users for Overview
async function loadRecentUsers() {
    const container = document.querySelector("#admin-recent-users");
    if (!container) return;

    try {
        const res = await api.adminUsers();
        const users = res.data || res;
        if (users && users.length > 0) {
            container.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Registered</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.slice(0, 8).map((u) => `
                            <tr>
                                <td class="mono">#USR-${u.id}</td>
                                <td><strong>${u.name}</strong></td>
                                <td>${u.email}</td>
                                <td><span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-primary'}">${u.role}</span></td>
                                <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            `;
        } else {
            container.innerHTML = `<p class="text-muted" style="padding: 1rem;">No registered users found.</p>`;
        }
    } catch {
        container.innerHTML = `<p class="text-muted" style="padding: 1rem;">Unable to load user list.</p>`;
    }
}

// Load Products Management Table
async function loadAdminProducts() {
    const container = document.querySelector("#admin-products-table");
    if (!container) return;

    container.innerHTML = `<p class="text-muted">Loading products catalog...</p>`;
    try {
        const res = await api.products("limit=50");
        const products = res.data || res;

        if (products && products.length > 0) {
            container.innerHTML = `
                <div class="orders-table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Preview</th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th style="text-align: right;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map((p) => `
                                <tr>
                                    <td>
                                        <img src="${p.image}" alt="${p.name}" style="width: 48px; height: 36px; object-fit: cover; border-radius: 4px;" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80'">
                                    </td>
                                    <td><strong>${p.name}</strong></td>
                                    <td><span class="badge">${p.category || 'General'}</span></td>
                                    <td class="mono">$${Number(p.price).toFixed(2)}</td>
                                    <td>${p.stock} units</td>
                                    <td style="text-align: right;">
                                        <button class="btn btn-danger btn-sm delete-product-btn" data-id="${p.id}" data-name="${p.name}">
                                            <span>Delete</span>
                                        </button>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;

            container.querySelectorAll(".delete-product-btn").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const id = btn.dataset.id;
                    const name = btn.dataset.name;
                    if (confirm(`Are you sure you want to permanently delete "${name}"?`)) {
                        try {
                            await api.deleteProduct(id);
                            showToast(`Deleted ${name}`, "success");
                            loadAdminProducts();
                            loadAdminStats();
                        } catch (err) {
                            showToast(err.message || "Failed to delete product", "error");
                        }
                    }
                });
            });
        } else {
            container.innerHTML = `<div class="empty-state"><p class="empty-desc">No products found in inventory.</p></div>`;
        }
    } catch (err) {
        container.innerHTML = `<p class="text-muted">Error fetching products.</p>`;
    }
}

// Load Orders Management Table
async function loadAdminOrders() {
    const container = document.querySelector("#admin-orders-table");
    if (!container) return;

    container.innerHTML = `<p class="text-muted">Loading orders...</p>`;
    try {
        const res = await api.adminOrders();
        const orders = res.data || res;

        if (orders && orders.length > 0) {
            container.innerHTML = `
                <div class="orders-table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Order Ref</th>
                                <th>User ID</th>
                                <th>Date</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th style="text-align: right;">Update Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.map((o) => `
                                <tr>
                                    <td class="mono"><strong>#PX-${o.id.toString().padStart(5, '0')}</strong></td>
                                    <td class="mono">#USR-${o.user_id}</td>
                                    <td>${o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Recent'}</td>
                                    <td class="mono">$${Number(o.total_price).toFixed(2)}</td>
                                    <td><span class="badge ${(o.status === 'completed' || o.status === 'paid') ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}">${o.status}</span></td>
                                    <td style="text-align: right;">
                                        <select class="form-control status-selector" data-id="${o.id}" style="width: auto; display: inline-block; padding: 0.3rem 0.6rem; font-size: 0.8125rem;">
                                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                                            <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>Processing</option>
                                            <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Completed</option>
                                            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;

            container.querySelectorAll(".status-selector").forEach((select) => {
                select.addEventListener("change", async () => {
                    const id = select.dataset.id;
                    const newStatus = select.value;
                    try {
                        await api.updateOrderStatus(id, newStatus);
                        showToast(`Order #PX-${id.padStart(5, '0')} marked as ${newStatus}`, "success");
                        loadAdminOrders();
                        loadAdminStats();
                    } catch (err) {
                        showToast(err.message || "Failed to update status", "error");
                    }
                });
            });
        } else {
            container.innerHTML = `<div class="empty-state"><p class="empty-desc">No orders found in store history.</p></div>`;
        }
    } catch {
        container.innerHTML = `<p class="text-muted">Error fetching orders.</p>`;
    }
}

// Modal handling for adding products
const addProductModal = document.querySelector("#add-product-modal");
const openModalBtn = document.querySelector("#open-add-product-modal");
const closeModalBtn = document.querySelector("#close-modal-btn");
const cancelModalBtn = document.querySelector("#cancel-modal-btn");
const createProductForm = document.querySelector("#create-product-form");

openModalBtn?.addEventListener("click", () => {
    if (addProductModal) addProductModal.style.display = "flex";
});

function hideProductModal() {
    if (addProductModal) addProductModal.style.display = "none";
    createProductForm?.reset();
}

closeModalBtn?.addEventListener("click", hideProductModal);
cancelModalBtn?.addEventListener("click", hideProductModal);

createProductForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = document.querySelector("#save-product-btn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
    }

    try {
        const formData = new FormData(createProductForm);
        await api.createProduct(formData);
        showToast("Product published successfully!", "success");
        hideProductModal();
        loadAdminProducts();
        loadAdminStats();
    } catch (err) {
        showToast(err.message || "Failed to publish product", "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Create Product";
        }
    }
});

// Security Tool 1: SSRF Image Fetch
const imageForm = document.querySelector("#image-form");
imageForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fetchBtn = document.querySelector("#fetch-btn");
    const imgResult = document.querySelector("#image-result");
    const url = new FormData(imageForm).get("url");

    if (fetchBtn) {
        fetchBtn.disabled = true;
        fetchBtn.textContent = "Fetching...";
    }

    try {
        const response = await fetch(resolveApiUrl("/api/admin/image"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });
        const blob = await response.blob();
        imgResult.src = URL.createObjectURL(blob);
        imgResult.style.display = "block";
        showToast("Resource retrieved via SSRF proxy", "success");
    } catch (err) {
        showToast("Failed to fetch external resource", "error");
    } finally {
        if (fetchBtn) {
            fetchBtn.disabled = false;
            fetchBtn.textContent = "Fetch Remote Resource";
        }
    }
});

// Security Tool 2: Command Injection Ping
const pingForm = document.querySelector("#ping-form");
pingForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pingBtn = document.querySelector("#ping-btn");
    const pingResult = document.querySelector("#ping-result");
    const ip = new FormData(pingForm).get("ip");

    if (pingBtn) {
        pingBtn.disabled = true;
        pingBtn.textContent = "Executing...";
    }
    pingResult.textContent = `Executing ping command for ${ip}...\n`;

    try {
        const response = await fetch(resolveApiUrl("/api/admin/ping"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ip })
        });
        const text = await response.text();
        pingResult.textContent = text;
        showToast("Ping command execution completed", "info");
    } catch (err) {
        pingResult.textContent = `Execution error: ${err.message}`;
        showToast("Ping execution failed", "error");
    } finally {
        if (pingBtn) {
            pingBtn.disabled = false;
            pingBtn.textContent = "Run Ping Diagnostic";
        }
    }
});

// Initial load
loadAdminStats();
