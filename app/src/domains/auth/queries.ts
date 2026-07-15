import pool from '@/lib/db';
import type { User } from './types';

export async function getUserByEmail(email: string): Promise<(User & { password_hash: string | null; org_name: string }) | null> {
  const { rows } = await pool.query(
    `SELECT u.*, o.name as org_name
     FROM users u
     JOIN organizations o ON u.organization_id = o.id
     WHERE u.email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function createUserWithOrganization(
  email: string,
  passwordHash: string,
  name: string,
  orgName: string,
): Promise<User & { org_name: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orgResult = await client.query(
      `INSERT INTO organizations (id, name) VALUES (gen_random_uuid(), $1) RETURNING id, name`,
      [orgName],
    );
    const org = orgResult.rows[0];

    const userResult = await client.query(
      `INSERT INTO users (id, organization_id, email, password_hash, name, role)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'admin')
       RETURNING id, organization_id, email, name, role, created_at`,
      [org.id, email, passwordHash, name],
    );

    await client.query('COMMIT');

    return { ...userResult.rows[0], org_name: org.name };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
