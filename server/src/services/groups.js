import { toPaise } from '../utils/money.js';

/** The groups a user belongs to, each with its size, spend and the user's balance in it. */
export async function listGroupsForUser(db, userId, balances) {
  const { rows } = await db.query(
    `SELECT g.group_id, g.group_name, g.created_by, g.created_at,
            creator.user_name AS created_by_name,
            (SELECT COUNT(*) FROM user_groups m WHERE m.group_id = g.group_id) AS member_count,
            (SELECT COUNT(*) FROM expenses e WHERE e.group_id = g.group_id) AS expense_count,
            (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.group_id = g.group_id) AS total_spent,
            (SELECT array_agg(u.user_name ORDER BY m.joined_at, u.user_id)
               FROM user_groups m
               JOIN users u ON u.user_id = m.user_id
              WHERE m.group_id = g.group_id) AS member_names
       FROM groups g
       JOIN user_groups mine ON mine.group_id = g.group_id AND mine.user_id = $1
       JOIN users creator ON creator.user_id = g.created_by
      ORDER BY COALESCE(
                 (SELECT MAX(e.created_at) FROM expenses e WHERE e.group_id = g.group_id),
                 g.created_at
               ) DESC,
               g.group_id DESC`,
    [userId],
  );

  const netByGroup = new Map();
  for (const balance of balances) {
    netByGroup.set(balance.group_id, (netByGroup.get(balance.group_id) || 0) + toPaise(balance.net));
  }
  return rows.map((group) => ({
    ...group,
    my_balance: (netByGroup.get(group.group_id) || 0) / 100,
  }));
}
