const loginForm = document.querySelector("#login-form");
const registerForm = document.querySelector("#register-form");

function displayAuthError(message) {
    const alertBox = document.querySelector("#auth-alert");
    const msgEl = document.querySelector("#message");
    if (alertBox && msgEl) {
        alertBox.style.display = "flex";
        msgEl.textContent = message || "Authentication failed. Please check your credentials.";
    }
}

// Fixed: Open Redirect
function isSafeNextPath(value) {
    if (!value || typeof value !== "string") return false;
    if (value.startsWith("//")) return false;
    if (value.startsWith("\\") || value.includes("\\")) return false;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
    return true;
}

function safeNextOrDefault(fallback = "index.html") {
    const next = new URLSearchParams(window.location.search).get("next");
    return isSafeNextPath(next) ? next : fallback;
}

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const alertBox = document.querySelector("#auth-alert");
    const submitBtn = document.querySelector("#submit-btn");
    if (alertBox) alertBox.style.display = "none";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Signing in...</span>`;
    }

    try {
        const formData = Object.fromEntries(new FormData(loginForm));
        await api.login(formData);
        showToast("Signed in successfully!", "success");
        const destination = safeNextOrDefault("index.html");
        setTimeout(() => {
            window.location.href = destination;
        }, 400);
    } catch (error) {
        displayAuthError(error.message);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Sign In</span>`;
        }
    }
});

registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const alertBox = document.querySelector("#auth-alert");
    const submitBtn = document.querySelector("#submit-btn");
    if (alertBox) alertBox.style.display = "none";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Creating Account...</span>`;
    }

    try {
        const formData = Object.fromEntries(new FormData(registerForm));
        await api.register(formData);
        showToast("Account created successfully!", "success");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 400);
    } catch (error) {
        displayAuthError(error.message);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Create Account</span>`;
        }
    }
});
