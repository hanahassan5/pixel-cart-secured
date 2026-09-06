const productsGrid = document.querySelector("#products-grid");
const filterForm = document.querySelector("#filter-form");
const resultsCount = document.querySelector("#results-count");
const resetBtn = document.querySelector("#reset-filter");

// Sync form inputs from initial URL parameters
function syncFormWithUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchInput = document.querySelector("#filter-search");
    const categorySelect = document.querySelector("#filter-category");
    const sortSelect = document.querySelector("#filter-sort");

    if (searchInput && urlParams.has("search")) {
        searchInput.value = urlParams.get("search");
    }
    if (categorySelect && urlParams.has("category")) {
        const category = urlParams.get("category");
        categorySelect.value = category;

        // Keep an unknown URL value from silently becoming "all categories".
        if (categorySelect.value !== category) {
            categorySelect.dataset.urlCategory = category;
        }
    }
    if (sortSelect && urlParams.has("sort")) {
        sortSelect.value = urlParams.get("sort");
    }
}

async function loadProducts() {
    if (!productsGrid) return;
    renderSkeletons(productsGrid, 8);
    if (resultsCount) resultsCount.textContent = "Loading catalog...";

    const formData = filterForm ? new FormData(filterForm) : new FormData();
    const params = new URLSearchParams();
    for (const [key, val] of formData.entries()) {
        if (val && String(val).trim()) {
            params.append(key, String(val).trim());
        }
    }

    const categorySelect = document.querySelector("#filter-category");
    const retainedCategory = categorySelect?.dataset.urlCategory;
    if (!params.has("category") && retainedCategory) {
        params.append("category", retainedCategory);
    }

    try {
        const response = await api.products(params.toString());
        const products = response.data || response;

        if (products && products.length) {
            productsGrid.innerHTML = products.map(productCard).join("");
            bindAddToCartButtons(productsGrid);
            if (resultsCount) {
                resultsCount.textContent = `Showing ${products.length} product${products.length === 1 ? "" : "s"}`;
            }
        } else {
            if (resultsCount) resultsCount.textContent = "0 products found";
            productsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </div>
                    <h3 class="empty-title">No products match your criteria</h3>
                    <p class="empty-desc">Try clearing your search query or selecting a different category from the filters above.</p>
                    <button id="empty-reset-btn" class="btn btn-secondary btn-sm">Reset All Filters</button>
                </div>
            `;
            document.querySelector("#empty-reset-btn")?.addEventListener("click", resetFilters);
        }
    } catch (error) {
        if (resultsCount) resultsCount.textContent = "Error loading inventory";
        productsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <h3 class="empty-title">Failed to load catalog</h3>
                <p class="empty-desc">An error occurred while communicating with the store server.</p>
                <button onclick="loadProducts()" class="btn btn-primary btn-sm">Try Again</button>
            </div>
        `;
    }
}

function resetFilters() {
    if (filterForm) filterForm.reset();
    window.history.replaceState({}, "", window.location.pathname);
    loadProducts();
}

filterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    loadProducts();
});

resetBtn?.addEventListener("click", resetFilters);

document.querySelector("#filter-category")?.addEventListener("change", (event) => {
    delete event.currentTarget.dataset.urlCategory;
});

syncFormWithUrl();
loadProducts();
