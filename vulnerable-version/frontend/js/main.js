// Toast notification system
function showToast(message, type = "success") {
    let container = document.querySelector("#toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icon = type === "success"
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
        : type === "error"
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        toast.style.transition = "all 200ms ease";
        setTimeout(() => toast.remove(), 200);
    }, 3200);
}

function renderSkeletons(container, count = 6) {
    if (!container) return;
    container.innerHTML = Array(count).fill(0).map(() => `
        <div class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
                <div class="skeleton" style="height: 14px; width: 35%;"></div>
                <div class="skeleton" style="height: 20px; width: 80%;"></div>
                <div class="skeleton" style="height: 14px; width: 60%;"></div>
                <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <div class="skeleton" style="height: 24px; width: 30%;"></div>
                    <div class="skeleton" style="height: 34px; width: 35%; border-radius: 8px;"></div>
                </div>
            </div>
        </div>
    `).join("");
}

function showState(container, message) {
    if (container) {
        container.innerHTML = `<div class="empty-state"><p class="empty-desc">${message}</p></div>`;
    }
}

function productCard(product) {
    const formattedPrice = Number(product.price).toFixed(2);
    const category = product.category || "General";
    const imageUrl = (typeof resolveApiUrl === "function" && product.image && product.image.startsWith("/"))
        ? resolveApiUrl(product.image)
        : (product.image || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80");
    return `
    <article class="product-card">
        <a class="product-card-media" href="product.html?id=${product.id}">
            <span class="badge product-card-badge">${category}</span>
            <img src="${imageUrl}" alt="${product.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80'">
        </a>
        <div class="product-card-body">
            <h3 class="product-card-title">
                <a href="product.html?id=${product.id}">${product.name}</a>
            </h3>
            <p class="product-card-desc">${product.description || ""}</p>
            <div class="product-card-footer">
                <span class="product-price">$${formattedPrice}</span>
                <button class="add-to-cart-btn add-button" data-product-id="${product.id}" data-product-name="${product.name}">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                    <span>Add to cart</span>
                </button>
            </div>
        </div>
    </article>`;
}

function bindAddToCartButtons(container) {
    const scope = container || document;
    scope.querySelectorAll(".add-button").forEach((button) => {
        button.addEventListener("click", async (e) => {
            e.preventDefault();
            const productId = button.dataset.productId;
            const productName = button.dataset.productName || "Product";
            button.disabled = true;
            try {
                await api.addToCart({ productId, quantity: 1 });
                button.classList.add("added");
                button.innerHTML = `<span>✓ Added</span>`;
                showToast(`Added <strong>${productName}</strong> to cart!`, "success");
                updateCartBadge();
                setTimeout(() => {
                    button.classList.remove("added");
                    button.innerHTML = `
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                        <span>Add to cart</span>`;
                    button.disabled = false;
                }, 1600);
            } catch (err) {
                showToast(err.message || "Failed to add to cart", "error");
                button.disabled = false;
            }
        });
    });
}

async function updateCartBadge() {
    try {
        const res = await api.cart();
        const cart = res.data || res;
        const count = cart.totalItems ?? (cart.items ? cart.items.reduce((sum, i) => sum + i.quantity, 0) : 0);
        document.querySelectorAll(".cart-badge").forEach((badge) => {
            badge.textContent = count;
            badge.style.display = count > 0 ? "flex" : "none";
        });
    } catch {
        // Guest or empty cart
    }
}

async function setupHeaderAndAuth() {
    // Mobile navigation toggle
    const toggle = document.querySelector(".mobile-toggle");
    const menu = document.querySelector(".nav-menu");
    if (toggle && menu) {
        toggle.addEventListener("click", () => menu.classList.toggle("open"));
    }

    // Live search in navbar (Enter submits to products catalog)
    const navSearch = document.querySelector(".nav-search input");
    if (navSearch) {
        navSearch.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && navSearch.value.trim()) {
                window.location.href = `products.html?search=${encodeURIComponent(navSearch.value.trim())}`;
            }
        });
    }

    // Check user auth state
    try {
        const res = await api.me();
        const user = res.data?.user || res.data || res.user;
        if (user && user.id) {
            const authLink = document.querySelector("#nav-auth-link");
            if (authLink) {
                authLink.href = "profile.html";
                authLink.textContent = user.name.split(" ")[0];
            }
            if (user.role === "admin") {
                const navLinks = document.querySelector(".nav-menu");
                if (navLinks && !document.querySelector("#nav-admin-link")) {
                    const adminLink = document.createElement("a");
                    adminLink.id = "nav-admin-link";
                    adminLink.className = "nav-link";
                    adminLink.href = "admin.html";
                    adminLink.textContent = "Admin";
                    navLinks.appendChild(adminLink);
                }
            }
        }
    } catch {
        // Unauthenticated: send the player to sign in, remembering where they were
        const authLink = document.querySelector("#nav-auth-link");
        if (authLink) {
            const currentPage = window.location.pathname.split("/").pop() || "index.html";
            authLink.href = `login.html?next=${encodeURIComponent(currentPage + window.location.search)}`;
        }
    }

    updateCartBadge();
}

async function loadFeaturedProducts() {
    const container = document.querySelector("#products");
    if (!container) return;
    renderSkeletons(container, 6);
    try {
        const response = await api.products("limit=6");
        const products = response.data || response;
        if (products && products.length) {
            container.innerHTML = products.map(productCard).join("");
            bindAddToCartButtons(container);
        } else {
            showState(container, "No featured products available at this moment.");
        }
    } catch (error) {
        showState(container, "Unable to load inventory. Please refresh.");
    }
}

// Global search input listener on home page
const heroSearch = document.querySelector("#search");
if (heroSearch) {
    heroSearch.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && heroSearch.value.trim()) {
            window.location.href = `products.html?search=${encodeURIComponent(heroSearch.value.trim())}`;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupHeaderAndAuth();
    loadFeaturedProducts();
});
