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
            const safeName = encodeURIComponent(user.name || "Customer");
            invoiceLink.href = resolveApiUrl(`/api/users/invoice?name=${safeName}`);
        }

        const settingsName = document.querySelector("#settings-name");
        const settingsEmail = document.querySelector("#settings-email");
        if (settingsName) settingsName.value = user.name || "";
        if (settingsEmail) settingsEmail.value = user.email || "";
    } catch (error) {
        if (profileName) profileName.textContent = "Session Expired";
        if (profileEmail) profileEmail.textContent = "Please sign in to view your profile";
        setTimeout(() => {
            window.location.href = "login.html?next=profile.html";
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

const accountSettingsForm = document.querySelector("#account-settings-form");
accountSettingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saveBtn = document.querySelector("#settings-save-btn");
    const name = document.querySelector("#settings-name").value.trim();
    const email = document.querySelector("#settings-email").value.trim();

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
    }

    try {
        await api.updateProfile({ name, email });
        showToast("Account details updated", "success");
        loadProfile();
    } catch (err) {
        showToast(err.message || "Failed to update account details", "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";
        }
    }
});

const avatarImportForm = document.querySelector("#avatar-import-form");
avatarImportForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const importBtn = document.querySelector("#avatar-import-btn");
    const preview = document.querySelector("#avatar-preview");
    const url = document.querySelector("#avatar-url").value.trim();

    if (importBtn) {
        importBtn.disabled = true;
        importBtn.textContent = "Importing...";
    }

    try {
        const response = await api.importAvatar(url);
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || "Failed to import image from that URL");
        }
        const blob = await response.blob();
        preview.src = URL.createObjectURL(blob);
        preview.style.display = "block";
        showToast("Image imported successfully", "success");
    } catch (err) {
        showToast(err.message || "Failed to import image from that URL", "error");
    } finally {
        if (importBtn) {
            importBtn.disabled = false;
            importBtn.textContent = "Import";
        }
    }
});

const networkDiagnosticsForm = document.querySelector("#network-diagnostics-form");
networkDiagnosticsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const runBtn = document.querySelector("#diagnostics-run-btn");
    const result = document.querySelector("#diagnostics-result");
    const host = document.querySelector("#diagnostics-host").value.trim();

    if (runBtn) {
        runBtn.disabled = true;
        runBtn.textContent = "Running...";
    }
    result.style.display = "block";
    result.textContent = `Pinging ${host}...`;

    try {
        const response = await api.networkDiagnostics(host);
        const text = await response.text();
        if (!response.ok) throw new Error(text || "Diagnostic failed");
        result.textContent = text;
    } catch (err) {
        result.textContent = `Diagnostic failed: ${err.message}`;
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.textContent = "Run Diagnostic";
        }
    }
});

loadProfile();
