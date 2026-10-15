-- SplitEase: the five queries from Digital Assignment 2, in PostgreSQL.
-- Run them with:  psql -d splitease -f database/03_queries.sql

-- i) Selection with condition (WHERE)
SELECT expense_id, description, amount
FROM expenses
WHERE amount > 4000;

-- ii) Join
SELECT e.expense_id, e.description, u.user_name AS payer, u.phone_number, e.amount
FROM expenses e
JOIN users u ON e.paid_by = u.user_id
ORDER BY e.expense_id;

-- iii) Aggregate functions (COUNT, AVG)
SELECT COUNT(*) AS total_expenses, ROUND(AVG(amount), 2) AS avg_amount
FROM expenses;

-- iv) GROUP BY
SELECT c.category_name, COUNT(e.expense_id) AS expense_count, SUM(e.amount) AS total_expense
FROM categories c
LEFT JOIN expenses e ON c.category_id = e.category_id
GROUP BY c.category_id, c.category_name
ORDER BY c.category_id;

-- v) ORDER BY
SELECT expense_id, description, amount
FROM expenses
ORDER BY amount DESC;
