/**
 * A user's transaction history: every expense they paid or share in, and every
 * payment they made or received, newest first.
 *
 * filters: { type: 'expense' | 'settlement' | null, groupId, search, limit, offset }
 */
export async function listTransactions(db, userId, filters = {}) {
  const { type = null, groupId = null, search = null, limit = 50, offset = 0 } = filters;

  const { rows } = await db.query(
    `SELECT *, COUNT(*) OVER () AS total_count
       FROM (
         SELECT 'expense' AS type,
                e.expense_id AS id,
                e.created_at AS date,
                e.group_id, g.group_name,
                e.description,
                c.category_name,
                e.amount,
                e.paid_by, payer.user_name AS paid_by_name,
                NULL::integer AS paid_to, NULL::varchar AS paid_to_name,
                NULL::varchar AS payment_type,
                mine.share_amount AS my_share,
                mine.status AS my_status,
                (SELECT COALESCE(SUM(s.share_amount), 0)
                   FROM splits s
                  WHERE s.expense_id = e.expense_id AND s.user_id <> e.paid_by) AS lent
           FROM expenses e
           JOIN groups g ON g.group_id = e.group_id
           JOIN categories c ON c.category_id = e.category_id
           JOIN users payer ON payer.user_id = e.paid_by
           LEFT JOIN splits mine ON mine.expense_id = e.expense_id AND mine.user_id = $1
          WHERE e.paid_by = $1 OR mine.split_id IS NOT NULL

         UNION ALL

         SELECT 'settlement',
                st.settlement_id,
                st.settlement_date,
                st.group_id, g.group_name,
                NULL, NULL,
                st.amount,
                st.paid_by, pb.user_name,
                st.paid_to, pt.user_name,
                pm.payment_type,
                NULL, NULL, NULL
           FROM settlements st
           JOIN groups g ON g.group_id = st.group_id
           JOIN users pb ON pb.user_id = st.paid_by
           JOIN users pt ON pt.user_id = st.paid_to
           JOIN payment_method pm ON pm.payment_id = st.payment_id
          WHERE st.paid_by = $1 OR st.paid_to = $1
       ) AS history
      WHERE ($2::text IS NULL OR type = $2)
        AND ($3::integer IS NULL OR group_id = $3)
        AND ($4::text IS NULL OR CONCAT_WS(' ', description, group_name, category_name,
                                           paid_by_name, paid_to_name, payment_type)
                                 ILIKE '%' || $4 || '%')
      ORDER BY date DESC, type DESC, id DESC
      LIMIT $5 OFFSET $6`,
    [userId, type, groupId, search, limit, offset],
  );

  const total = rows[0]?.total_count ?? 0;
  return {
    total,
    transactions: rows.map(({ total_count, ...row }) => row),
  };
}
