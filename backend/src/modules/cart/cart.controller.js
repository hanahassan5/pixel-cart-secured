import { pool } from "../../DB/DBConnection.js";

const fetchCartData = async (userId) => {
    const [items] = await pool.query(
        "SELECT cart_items.*, products.name, products.price, products.stock, products.image FROM cart_items JOIN products ON products.id = cart_items.product_id WHERE cart_items.user_id = ? ORDER BY cart_items.created_at",
        [userId]
    );
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => total + Number(item.price) * item.quantity, 0);
    return { items, totalItems, subtotal };
};

export const getCart = async (req, res, next) => {
    try {
        const cart = await fetchCartData(req.session.user.id);
        res.json({ success: true, data: cart });
    } catch (error) {
        next(error);
    }
};

export const addToCart = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        const productId = req.body.productId;
        const quantity = Number(req.body.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ success: false, error: "Quantity must be a positive integer" });
        }

        const [products] = await pool.query("SELECT stock FROM products WHERE id = ?", [productId]);
        const product = products[0];
        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        const [existing] = await pool.query(
            "SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?",
            [userId, productId]
        );
        const requested = (existing[0]?.quantity || 0) + quantity;
        if (requested > product.stock) {
            return res.status(400).json({ success: false, error: "Requested quantity exceeds available stock" });
        }

        await pool.query(
            "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)",
            [userId, productId, quantity]
        );

        const cart = await fetchCartData(userId);
        res.status(201).json({ success: true, data: cart });
    } catch (error) {
        next(error);
    }
};

export const updateCart = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        const productId = req.params.productId;
        const quantity = Number(req.body.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ success: false, error: "Quantity must be a positive integer" });
        }

        const [products] = await pool.query("SELECT stock FROM products WHERE id = ?", [productId]);
        const product = products[0];
        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }
        if (quantity > product.stock) {
            return res.status(400).json({ success: false, error: "Requested quantity exceeds available stock" });
        }

        await pool.query(
            "UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?",
            [quantity, userId, productId]
        );

        const cart = await fetchCartData(userId);
        res.json({ success: true, data: cart });
    } catch (error) {
        next(error);
    }
};

export const removeFromCart = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        const productId = req.params.productId;

        await pool.query("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?", [userId, productId]);
        const cart = await fetchCartData(userId);
        res.json({ success: true, data: cart });
    } catch (error) {
        next(error);
    }
};
