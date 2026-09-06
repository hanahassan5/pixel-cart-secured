import ejs from "ejs";
import axios from "axios";
import child_process from "child_process";
import { readFile } from "fs/promises";
import { pool } from "../../DB/DBConnection.js";

export const profile = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?",
            [req.session.user.id]
        );
        res.json({ success: true, data: rows[0] || null });
    } catch (error) {
        next(error);
    }
};

// Vulnerability: CSRF
export const updateProfile = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        const userId = req.session.user.id;

        if (!email || typeof email !== "string") {
            return res.status(400).json({ success: false, error: "Email is required" });
        }

        await pool.query(
            "UPDATE users SET name = COALESCE(?, name), email = ? WHERE id = ?",
            [name || null, email, userId]
        );

        const [rows] = await pool.query(
            "SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?",
            [userId]
        );

        // Keep the session in sync with the newly saved values
        req.session.user = { ...req.session.user, ...rows[0] };

        res.json({ success: true, message: "Account details updated", data: rows[0] });
    } catch (error) {
        next(error);
    }
};

// Vulnerability: SSRF
export const importAvatar = async (req, res, next) => {
    try {
        const { url, method, data } = req.body;
        if (!url || typeof url !== "string") {
            return res.status(400).json({ success: false, error: "Image URL is required" });
        }

        const response = await axios({
            url,
            method: method || "get",
            data,
            responseType: "arraybuffer",
            validateStatus: () => true
        });
        if (response.headers["set-cookie"]) {
            res.setHeader("set-cookie", response.headers["set-cookie"]);
        }
        res.type(response.headers["content-type"] || "application/octet-stream").send(response.data);
    } catch (error) {
        next(error);
    }
};

// Vulnerability: OS Command Injection
export const networkDiagnostics = (req, res, next) => {
    const { host } = req.body;
    if (!host || typeof host !== "string") {
        return res.status(400).json({ success: false, error: "Host or IP is required" });
    }

    const countFlag = process.platform === "win32" ? "-n" : "-c";
    child_process.exec(`ping ${countFlag} 2 ${host}`, (err, stdout) => {
        if (err) return next(err);
        res.type("text/plain").send(stdout);
    });
};

export const invoice = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        const requestedOrderId = req.query.orderId;
        const [orders] = await pool.query(
            requestedOrderId
                ? "SELECT orders.*, users.name AS customer_name, users.email AS customer_email FROM orders JOIN users ON users.id = orders.user_id WHERE orders.id = ? AND orders.user_id = ?"
                : "SELECT orders.*, users.name AS customer_name, users.email AS customer_email FROM orders JOIN users ON users.id = orders.user_id WHERE orders.user_id = ? ORDER BY orders.created_at DESC LIMIT 1",
            requestedOrderId ? [requestedOrderId, userId] : [userId]
        );
        const order = orders[0];

        const [items] = await pool.query(
            "SELECT order_items.quantity, order_items.price, products.name AS product_name FROM order_items JOIN products ON products.id = order_items.product_id WHERE order_items.order_id = ? ORDER BY order_items.id",
            [order.id]
        );

        const invoice = {
            order,
            items: items.map((item) => ({
                ...item,
                subtotal: Math.round(Number(item.price) * 100) * item.quantity
            }))
        };
        invoice.subtotal = invoice.items.reduce((sum, item) => sum + item.subtotal, 0);
        invoice.total = Math.round(Number(order.total_price) * 100);

        const templatePath = new URL("../../views/invoice.ejs", import.meta.url);
        const source = await readFile(templatePath, "utf8");
        // Vulnerability: SSTI
        const template = source.replaceAll("<!-- SSTI_CUSTOMER_NAME -->", req.query.name ?? order.customer_name);
        const html = ejs.render(template, { invoice });

        if (req.query.download === "1") {
            res.attachment(`invoice-${order.id}.html`);
        }
        res.send(html);
    } catch (error) {
        next(error);
    }
};
