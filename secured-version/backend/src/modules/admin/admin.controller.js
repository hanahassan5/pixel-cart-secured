import axios from "axios";
import child_process from "child_process";
import { pool } from "../../DB/DBConnection.js";

export const getStatistics = async (req, res, next) => {
    try {
        const [[users]] = await pool.query("SELECT COUNT(*) AS total FROM users");
        const [[products]] = await pool.query("SELECT COUNT(*) AS total FROM products");
        const [[orders]] = await pool.query("SELECT COUNT(*) AS total FROM orders");
        const [[revenue]] = await pool.query("SELECT COALESCE(SUM(total_price), 0) AS total FROM orders WHERE status != 'cancelled'");
        res.json({
            success: true,
            data: {
                users: users.total,
                products: products.total,
                orders: orders.total,
                revenue: revenue.total
            }
        });
    } catch (error) {
        next(error);
    }
};

export const listUsers = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC");
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

export const listOrders = async (req, res, next) => {
    try {
        const [rows] = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

export const updateOrderStatus = async (req, res, next) => {
    try {
        await pool.query("UPDATE orders SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
        res.json({ success: true, data: { message: "Order updated" } });
    } catch (error) {
        next(error);
    }
};

import { URL } from "url";
import net from "net";

const isPrivateOrLoopback = (hostname) => {
    if (hostname === "localhost") return true;
    if (net.isIP(hostname)) {
        return (
            hostname.startsWith("127.") ||
            hostname.startsWith("10.") ||
            hostname.startsWith("192.168.") ||
            hostname.startsWith("169.254.") ||
            /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
            hostname === "::1"
        );
    }
    return false;
};

export const fetchImage = async (req, res, next) => {
    try {
        let parsed;
        try {
            parsed = new URL(req.body.url);
        } catch {
            return res.status(400).json({ success: false, error: "Invalid URL" });
        }

        if (!["http:", "https:"].includes(parsed.protocol)) {
            return res.status(400).json({ success: false, error: "Only http/https URLs are allowed" });
        }
        if (isPrivateOrLoopback(parsed.hostname)) {
            return res.status(400).json({ success: false, error: "Requests to internal addresses are not allowed" });
        }

        const response = await axios.get(parsed.toString(), {
            responseType: "arraybuffer",
            maxRedirects: 0
        });
        res.type(response.headers["content-type"] || "application/octet-stream").send(response.data);
    } catch (error) {
        next(error);
    }
};

import { execFile } from "child_process";

const IP_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

export const ping = (req, res, next) => {
    const { ip } = req.body;

    if (!ip || typeof ip !== "string" || !IP_REGEX.test(ip)) {
        return res.status(400).json({ success: false, error: "Invalid IP address" });
    }

    const pingCountFlag = process.platform === "win32" ? "-n" : "-c";
    execFile("ping", [pingCountFlag, "2", ip], (err, stdout) => {
        if (err) return next(err);
        res.type("text/plain").send(stdout);
    });
};
