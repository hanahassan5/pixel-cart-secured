const profileName = document.querySelector("#profile-name");
const profileEmail = document.querySelector("#profile-email");
const profileAvatar = document.querySelector("#profile-avatar");
const profileRole = document.querySelector("#profile-role");
const profileAdminLink = document.querySelector("#profile-admin-link");
const invoiceLink = document.querySelector("#invoice-link");
const profileInfoName = document.querySelector("#profile-info-name");
const profileInfoEmail = document.querySelector("#profile-info-email");
const profileInfoRole = document.querySelector("#profile-info-role");
const profileInfoCreated = document.querySelector("#profile-info-created");
const logoutBtn = document.querySelector("#logout");

async function loadProfile() {
    try {
        const response = await api.profile();
        const user = response.data || response;

        if (profileName) profileName.textContent = user.name || "Player";
        if (profileEmail) profileEmail.textContent = user.email || "";

        if (profileInfoName) profileInfoName.textContent = user.name || "Player";
        if (profileInfoEmail) profileInfoEmail.textContent = user.email || "—";
        if (profileInfoRole) profileInfoRole.textContent = (user.role || "user").toUpperCase();
        if (profileInfoCreated) {
            profileInfoCreated.textContent = user.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "Standard";
        }

        if (profileAvatar) {
            const initial = (user.name || "P").charAt(0).toUpperCase();
            profileAvatar.textContent = initial;
        }

        if (profileRole) {
            const role = user.role || "user";
            profileRole.textContent = role.toUpperCase();
            if (role === "admin") {
                profileRole.className = "badge badge-warning";
                if (profileAdminLink) profileAdminLink.style.display = "inline-flex";
            } else {
                profileRole.className = "badge badge-primary";
            }
        }

        if (invoiceLink) {
            // Intentionally preserve the SSTI vulnerability query parameter
            const safeName = encodeURIComponent(user.name || "Customer");
            invoiceLink.href = resolveApiUrl(`/api/users/invoice?name=${safeName}`);
        }
    } catch (error) {
        if (profileName) profileName.textContent = "Session Expired";
        if (profileEmail) profileEmail.textContent = "Please sign in to view your profile";
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);
    }
}

logoutBtn?.addEventListener("click", async () => {
    try {
        await api.logout();
        showToast("Logged out successfully", "info");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 400);
    } catch {
        window.location.href = "index.html";
    }
});

loadProfile();
