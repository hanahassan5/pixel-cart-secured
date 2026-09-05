INSERT INTO users (name, email, password, role)
VALUES
    ('Demo Player', 'demo@example.com', '$2b$10$1KBqFIHbii/ECQ6pDwnPQecGkfVX.sAQ4NExDiTqquK2y7IYli0V6', 'user'),
    ('Store Admin', 'admin@example.com', '$2b$10$1KBqFIHbii/ECQ6pDwnPQecGkfVX.sAQ4NExDiTqquK2y7IYli0V6', 'admin')
ON DUPLICATE KEY UPDATE name = VALUES(name), password = VALUES(password), role = VALUES(role);

INSERT INTO products (name, description, price, stock, category, image)
SELECT seed.name, seed.description, seed.price, seed.stock, seed.category, seed.image
FROM (
    SELECT 'Nebula Run' AS name, 'A cinematic space adventure built for fearless explorers.' AS description, 59.99 AS price, 24 AS stock, 'Games' AS category, 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=900' AS image
    UNION ALL SELECT 'Shadow Circuit', 'Race through neon streets in a competitive arcade racer.', 39.99, 18, 'Games', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=900'
    UNION ALL SELECT 'Titanfall Arena', 'Tactical multiplayer action with a precision edge.', 69.99, 12, 'Games', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=900'
    UNION ALL SELECT 'Arcade Controller', 'A wired, responsive controller for classic sessions.', 29.99, 50, 'Controllers', 'https://images.unsplash.com/photo-1603481546238-487240415921?w=900'
    UNION ALL SELECT 'Pulse Headset', 'Low-latency audio with a clear detachable microphone.', 84.99, 16, 'Headsets', 'https://images.unsplash.com/photo-1599669454699-248893623440?w=900'
    UNION ALL SELECT 'Mech Keyboard', 'Hot-swappable mechanical keys in a compact layout.', 109.99, 9, 'Keyboards', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900'
    UNION ALL SELECT 'Vector Mouse', 'Lightweight optical mouse with programmable controls.', 44.99, 31, 'Mice', 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=900'
    UNION ALL SELECT 'Nova Console Stand', 'A clean vertical stand for your current-gen console.', 34.99, 20, 'Accessories', 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=900'
    UNION ALL SELECT 'Pro Capture Kit', 'Stream-ready 1080p capture with zero-fuss setup.', 129.99, 7, 'Accessories', 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=900'
    UNION ALL SELECT 'Drift Racing Wheel', 'Force-feedback wheel for committed virtual drivers.', 199.99, 5, 'Controllers', 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=900'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name = seed.name);

INSERT INTO reviews (product_id, user_id, content, rating)
SELECT products.id, users.id, 'Feels brilliant in hand and the response is instant.', 5
FROM products CROSS JOIN users
WHERE products.name = 'Arcade Controller' AND users.email = 'demo@example.com'
  AND NOT EXISTS (SELECT 1 FROM reviews WHERE reviews.product_id = products.id AND reviews.user_id = users.id);
