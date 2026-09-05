import { pool } from "../../DB/DBConnection.js";

export const listOrders = async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
            [req.session.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

export const getOrder = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        const orderId = req.params.id;

        const [orders] = await pool.query(
            "SELECT * FROM orders WHERE id = ? AND user_id = ?",
            [orderId, userId]
        );
        if (!orders[0]) {
            return res.status(404).json({ success: false, error: "Order not found" });
        }

        const [items] = await pool.query(
            "SELECT order_items.*, products.name, products.image FROM order_items JOIN products ON products.id = order_items.product_id WHERE order_id = ?",
            [orderId]
        );

        res.json({ success: true, data: { ...orders[0], items } });
    } catch (error) {
        next(error);
    }
};

export const checkout = async (req, res, next) => {
    const userId = req.session.user.id;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [cartItems] = await connection.query(
            "SELECT * FROM cart_items WHERE user_id = ?",
            [userId]
        );

        if (!cartItems.length) {
            connection.release();
            return res.status(400).json({ success: false, error: "Your cart is empty" });
        }

        let total = 0;
        const lockedItems = [];

        for (const item of cartItems) {
            const [products] = await connection.query(
                "SELECT id, price, stock FROM products WHERE id = ? FOR UPDATE",
                [item.product_id]
            );
            const product = products[0];
            if (!product || product.stock < item.quantity) {
                throw new Error("A cart item is unavailable");
            }
            total += Number(product.price) * item.quantity;
            lockedItems.push({ ...item, price: product.price });
        }

        const [orderResult] = await connection.query(
            "INSERT INTO orders (user_id, total_price) VALUES (?, ?)",
            [userId, total]
        );

        for (const item of lockedItems) {
            await connection.query(
                "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
                [orderResult.insertId, item.product_id, item.quantity, item.price]
            );
            await connection.query(
                "UPDATE products SET stock = stock - ? WHERE id = ?",
                [item.quantity, item.product_id]
            );
        }

        await connection.query("DELETE FROM cart_items WHERE user_id = ?", [userId]);
        await connection.commit();

        const [orders] = await pool.query("SELECT * FROM orders WHERE id = ?", [orderResult.insertId]);
        const [items] = await pool.query(
            "SELECT order_items.*, products.name, products.image FROM order_items JOIN products ON products.id = order_items.product_id WHERE order_id = ?",
            [orderResult.insertId]
        );

        res.status(201).json({ success: true, data: { ...orders[0], items } });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
