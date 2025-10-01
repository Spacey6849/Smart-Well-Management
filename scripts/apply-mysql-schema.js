#!/usr/bin/env node
/**
 * Applies the MySQL schema located at db/mysql-schema.sql
 * Usage: npm run db:setup
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const host = process.env.MYSQL_HOST || 'localhost';
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || 'moses2005';
  const database = process.env.MYSQL_DB || 'EcoWell';

  const schemaPath = path.join(__dirname, '..', 'db', 'mysql-schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('Schema file not found:', schemaPath);
    process.exit(1);
  }
  const sqlRaw = fs.readFileSync(schemaPath, 'utf8');

  // Split on semicolons not inside quotes (lightweight approach). For simple schema files this is fine.
  const statements = sqlRaw
    .split(/;\s*\n/) // split at line breaks after semicolons
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let conn;
  try {
    conn = await mysql.createConnection({ host, user, password });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await conn.changeUser({ database });
    console.log(`Applying schema to database '${database}' ...`);
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (e) {
        console.warn('Statement failed (continuing):', stmt.slice(0,120) + '...', '\nError:', e.message);
      }
    }
    console.log('Schema application completed.');
  } catch (e) {
    console.error('Failed applying schema:', e.message);
    process.exit(1);
  } finally {
    if (conn) try { await conn.end(); } catch {}
  }
})();
