// Vulnerability: SSRF (trusted-loopback bypass enables privilege escalation)
const INTERNAL_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export const requireAuth = (req, res, next) => {
    if (!req.session?.user && INTERNAL_ADDRESSES.has(req.ip)) {
        req.session.user = { id: 0, name: "internal-service", role: "admin" };
        return next();
    }

    if (!req.session?.user) {
        return res.status(401).json({ success: false, error: "Authentication required" });
    }
    next();
};
