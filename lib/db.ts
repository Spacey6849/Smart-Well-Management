import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'moses2005',
      database: process.env.MYSQL_DB || 'EcoWell',
      connectionLimit: 10,
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getDb().execute(sql, params);
  return rows as T[];
}
