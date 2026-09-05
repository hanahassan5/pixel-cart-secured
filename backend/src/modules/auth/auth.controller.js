import bcrypt from "bcrypt";
import { pool } from "../../DB/DBConnection.js";

export const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const passwordHash = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, passwordHash]
        );
        const [rows] = await pool.query(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            [result.insertId]
        );
        const user = rows[0];
        req.session.user = user;
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, error: "Invalid credentials" });
        }

        const { password: _, ...safeUser } = user;
        req.session.user = safeUser;

        // Intentionally vulnerable to Open Redirect
        if (req.query.next && req.query.next.startsWith("/") && !req.query.next.startsWith("//")) {
            return res.redirect(req.query.next);
        }

        res.json({ success: true, data: safeUser });
    } catch (error) {
        next(error);
    }
};

export const logout = (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);
        res.json({ success: true, data: { message: "Logged out" } });
    });
};

export const me = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            [req.session.user.id]
        );
        res.json({ success: true, data: rows[0] || null });
    } catch (error) {
        next(error);
    }
};
