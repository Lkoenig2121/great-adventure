import pg from "pg";

const { Pool } = pg;

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://greatadventure:greatadventure@localhost:5433/greatadventure";

export const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
});

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return pool.query<T>(text, params);
}
