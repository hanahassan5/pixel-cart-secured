const checkoutForm = document.querySelector("#checkout-form");
const checkoutAlert = document.querySelector("#checkout-alert");
const checkoutMessage = document.querySelector("#checkout-message");
const checkoutItems = document.querySelector("#checkout-items");
const summarySubtotal = document.querySelector("#summary-subtotal");
const summaryTotal = document.querySelector("#summary-total");
const placeOrderBtn = document.querySelector("#place-order-btn");

async function initCheckout() {
    try {
        // Pre-fill user information if authenticated
        const userRes = await api.me();
        const user = userRes.data?.user || userRes.data || userRes.user;
        if (user && user.name) {
            const nameInput = document.querySelector("#checkout-name");
            if (nameInput && !nameInput.value) {
                nameInput.value = user.name;
            }
        }
    } catch {
        // Guest checkout
    }

    try {
        const cartRes = await api.cart();
        const cart = cartRes.data || cartRes;
        const items = cart.items || [];

        if (items.length === 0) {
            window.location.href = "cart.html";
            return;
        }

        const subtotal = Number(cart.subtotal || 0).toFixed(2);
        if (summarySubtotal) summarySubtotal.textContent = `$${subtotal}`;
        if (summaryTotal) summaryTotal.textContent = `$${subtotal}`;

        if (checkoutItems) {
            checkoutItems.innerHTML = items.map((item) => {
                const itemTotal = (Number(item.price) * item.quantity).toFixed(2);
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem;">
                        <span style="display: flex; align-items: center; gap: 0.5rem;">
                            <span class="badge" style="padding: 0.15rem 0.4rem;">${item.quantity}x</span>
                            <span style="font-weight: 500;">${item.name}</span>
                        </span>
                        <span class="mono text-muted">$${itemTotal}</span>
                    </div>
                `;
            }).join("");
        }
    } catch (err) {
        if (err.message && err.message.toLowerCase().includes("authentication")) {
            window.location.href = "login.html?next=checkout.html";
            return;
        }
        if (checkoutAlert && checkoutMessage) {
            checkoutAlert.style.display = "flex";
            checkoutMessage.textContent = "Unable to load cart preview. Please try again.";
        }
    }
}

checkoutForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (checkoutAlert) checkoutAlert.style.display = "none";
    if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = `<span>Processing Order...</span>`;
    }

    try {
        const response = await api.checkout();
        const orderId = response.data?.id || response.id;
        showToast("Order placed successfully!", "success");
        setTimeout(() => {
            window.location.href = `orders.html?id=${orderId}`;
        }, 600);
    } catch (error) {
        if (checkoutAlert && checkoutMessage) {
            checkoutAlert.style.display = "flex";
            checkoutMessage.textContent = error.message || "Failed to place order. Please try again.";
        }
        if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = `
                <span>Confirm & Place Order</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            `;
        }
    }
});

initCheckout();
