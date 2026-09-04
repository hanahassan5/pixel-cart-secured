export const requireAdmin = (req, res, next) => {
    if (req.session?.user?.role !== "admin") {
        return res.status(403).json({ success: false, error: "Administrator access required" });
    }
    next();
};
