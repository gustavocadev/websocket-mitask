import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const pool = new pg.Pool({
  connectionString: Bun.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
