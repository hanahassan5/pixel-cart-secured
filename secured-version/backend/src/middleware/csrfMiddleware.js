import crypto from "crypto";

// Fixed: CSRF
const CSRF_TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function currentUserId(req) {
    return req.session?.user?.id ?? null;
}

function issueToken(req) {
    const csrf = {
        token: crypto.randomBytes(32).toString("hex"),
        userId: currentUserId(req),
        issuedAt: Date.now()
    };
    req.session.csrf = csrf;
    return csrf;
}

export const ensureCsrfToken = (req, res, next) => {
    const existing = req.session.csrf;
    const isExpired = existing && Date.now() - existing.issuedAt > CSRF_TOKEN_TTL_MS;
    const userChanged = existing && existing.userId !== currentUserId(req);

    const csrf = (!existing || isExpired || userChanged) ? issueToken(req) : existing;

    // Non-httpOnly so legitimate frontend JS (same-origin only) can read it
    // and echo it back; the httpOnly, SameSite=Strict session cookie itself
    // remains fully protected.
    res.cookie("XSRF-TOKEN", csrf.token, {
        httpOnly: false,
        sameSite: "strict",
        secure: false
    });

    next();
};

export const requireCsrfToken = (req, res, next) => {
    const headerToken = req.get("X-CSRF-Token") || req.body?._csrf;
    const csrf = req.session?.csrf;

    if (!csrf || !headerToken) {
        return res.status(403).json({ success: false, error: "Missing CSRF token" });
    }

    if (Date.now() - csrf.issuedAt > CSRF_TOKEN_TTL_MS) {
        return res.status(403).json({ success: false, error: "CSRF token has expired" });
    }

    if (csrf.userId !== currentUserId(req)) {
        return res.status(403).json({ success: false, error: "CSRF token does not match the authenticated session" });
    }

    if (headerToken !== csrf.token) {
        return res.status(403).json({ success: false, error: "Invalid CSRF token" });
    }

    next();
};
