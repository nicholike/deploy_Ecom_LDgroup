-- CRITICAL FIX: Add unique constraint to prevent double commission payments
-- This prevents race conditions where multiple requests could create duplicate commissions
-- for the same order/user/level combination

-- Check if any duplicate commissions exist before applying constraint
SELECT
    order_id,
    user_id,
    level,
    COUNT(*) as count
FROM commissions
GROUP BY order_id, user_id, level
HAVING COUNT(*) > 1;

-- If duplicates found above, you need to clean them up BEFORE running this:
-- DELETE FROM commissions WHERE id IN (
--     SELECT id FROM (
--         SELECT id, ROW_NUMBER() OVER (PARTITION BY order_id, user_id, level ORDER BY calculated_at DESC) as rn
--         FROM commissions
--     ) t WHERE rn > 1
-- );

-- Add the unique constraint
-- This ensures only ONE commission can exist per (order_id, user_id, level)
ALTER TABLE commissions
ADD CONSTRAINT unique_commission_order_user_level
UNIQUE (order_id, user_id, level);

-- Verify the constraint was created
SHOW INDEX FROM commissions WHERE Key_name = 'unique_commission_order_user_level';
