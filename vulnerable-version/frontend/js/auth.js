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

        // Vulnerability: Open Redirect
        const next = new URLSearchParams(window.location.search).get("next");
        setTimeout(() => {
            window.location.href = next || "index.html";
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
