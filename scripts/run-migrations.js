#!/usr/bin/env node
/** Simple migration runner (sequential, idempotent-ish). */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const host = process.env.MYSQL_HOST || 'localhost';
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || 'moses2005';
  const database = process.env.MYSQL_DB || 'EcoWell';
  const migDir = path.join(__dirname, '..', 'db', 'migrations');
  const metaTable = '_migrations';

  const conn = await mysql.createConnection({ host, user, password });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await conn.changeUser({ database });
  await conn.query(`CREATE TABLE IF NOT EXISTS ${metaTable} ( id INT PRIMARY KEY AUTO_INCREMENT, filename VARCHAR(255) UNIQUE, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ) ENGINE=InnoDB`);

  const files = fs.readdirSync(migDir).filter(f => /\.sql$/i.test(f)).sort();
  for (const file of files) {
    const [row] = await conn.query(`SELECT 1 FROM ${metaTable} WHERE filename=? LIMIT 1`, [file]);
    if (row.length) { continue; }
    const full = path.join(migDir, file);
    const sql = fs.readFileSync(full, 'utf8');
    const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
    console.log('Applying migration:', file);
    try {
      await conn.beginTransaction();
      for (const stmt of statements) {
        if (stmt.startsWith('--')) continue;
        if (!stmt) continue;
        await conn.query(stmt);
      }
      await conn.query(`INSERT INTO ${metaTable} (filename) VALUES (?)`, [file]);
      await conn.commit();
      console.log('  ✔', file);
    } catch (e) {
      await conn.rollback();
      console.error('  ✖ Failed', file, e.message);
      process.exit(1);
    }
  }
  await conn.end();
  console.log('All migrations applied.');
})();
