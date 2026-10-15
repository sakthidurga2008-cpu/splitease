import { forbidden, notFound } from '../utils/httpError.js';

/** Loads a group and checks the user belongs to it. Throws 404/403 otherwise. */
export async function requireMembership(db, groupId, userId) {
  const { rows } = await db.query(
    `SELECT g.group_id, g.group_name, g.created_by, g.created_at,
            (ug.user_id IS NOT NULL) AS is_member
       FROM groups g
       LEFT JOIN user_groups ug ON ug.group_id = g.group_id AND ug.user_id = $2
      WHERE g.group_id = $1`,
    [groupId, userId],
  );
  const group = rows[0];
  if (!group) throw notFound('That group does not exist.');
  if (!group.is_member) throw forbidden('You are not a member of this group.');
  return group;
}

/** The ids of everyone in a group. */
export async function memberIds(db, groupId) {
  const { rows } = await db.query('SELECT user_id FROM user_groups WHERE group_id = $1', [groupId]);
  return rows.map((row) => row.user_id);
}
