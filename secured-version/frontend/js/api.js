const DEFAULT_BACKEND_PORT = 3000;

/**
 * Resolves the backend base URL dynamically:
 * - If running via static preview server (e.g. Live Server on port 57950, 5500, etc.)
 *   or file:// protocol, automatically routes to the Express backend (port 3000).
 * - If running directly on the backend port (port 3000), uses standard relative URLs.
 */
function getApiBaseUrl() {
    if (typeof window !== "undefined" && window.API_BASE_URL) {
        return window.API_BASE_URL.replace(/\/+$/, "");
    }

    if (typeof window !== "undefined" && window.location) {
        const { protocol, hostname, port } = window.location;

        if (protocol === "file:") {
            return `http://127.0.0.1:${DEFAULT_BACKEND_PORT}`;
        }

        if (port && port !== String(DEFAULT_BACKEND_PORT) && port !== "80" && port !== "443") {
            const host = hostname && hostname !== "" ? hostname : "127.0.0.1";
            return `http://${host}:${DEFAULT_BACKEND_PORT}`;
        }
    }

    return "";
}

function resolveApiUrl(url) {
    if (!url || typeof url !== "string") return url;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
        return url;
    }
    const base = getApiBaseUrl();
    if (base && url.startsWith("/")) {
        return `${base}${url}`;
    }
    return url;
}

if (typeof window !== "undefined") {
    window.resolveApiUrl = resolveApiUrl;
}

async function apiRequest(url, options = {}) {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = { ...(options.headers || {}) };
    if (!isFormData && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const fullUrl = resolveApiUrl(url);

    const response = await fetch(fullUrl, {
        ...options,
        credentials: "include",
        headers
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("json") ? await response.json() : await response.text();

    if (!response.ok) {
        const errorMessage = (data && (data.error || data.message))
            ? (data.error || data.message)
            : `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }

    return data;
}

const api = {
    url(path) { return resolveApiUrl(path); },
    products(params = "") { return apiRequest(`/api/products${params ? `?${params}` : ""}`); },
    product(id) { return apiRequest(`/api/products/${id}`); },
    reviews(id) { return apiRequest(`/api/products/${id}/reviews`); },
    login(data) { return apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(data) }); },
    register(data) { return apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify(data) }); },
    logout() { return apiRequest("/api/auth/logout", { method: "POST" }); },
    me() { return apiRequest("/api/auth/me"); },
    cart() { return apiRequest("/api/cart"); },
    addToCart(data) { return apiRequest("/api/cart", { method: "POST", body: JSON.stringify(data) }); },
    updateCart(id, quantity) { return apiRequest(`/api/cart/${id}`, { method: "PUT", body: JSON.stringify({ quantity }) }); },
    removeCart(id) { return apiRequest(`/api/cart/${id}`, { method: "DELETE" }); },
    orders() { return apiRequest("/api/orders"); },
    checkout() { return apiRequest("/api/orders", { method: "POST" }); },
    profile() { return apiRequest("/api/users/profile"); },
    addReview(id, data) { return apiRequest(`/api/products/${id}/reviews`, { method: "POST", body: JSON.stringify(data) }); },
    createProduct(formData) { return apiRequest("/api/products", { method: "POST", body: formData }); },
    deleteProduct(id) { return apiRequest(`/api/products/${id}`, { method: "DELETE" }); },
    adminStats() { return apiRequest("/api/admin/stats"); },
    adminUsers() { return apiRequest("/api/admin/users"); },
    adminOrders() { return apiRequest("/api/admin/orders"); },
    updateOrderStatus(id, status) { return apiRequest(`/api/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); },
    adminImage(url) {
        return fetch(resolveApiUrl("/api/admin/image"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });
    },
    adminPing(ip) {
        return fetch(resolveApiUrl("/api/admin/ping"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ip })
        });
    }
};
