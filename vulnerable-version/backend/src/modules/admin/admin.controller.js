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

