export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Endpoint to seed an admin row into MySQL `admin_accounts` (or `admins`) table.
// Security: protected with x-seed-secret header compared against ADMIN_SEED_SECRET env var.
// Required env: ADMIN_SEED_SECRET, ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD
// Table expectation (minimal): admin_accounts(id PK UUID/char36, email UNIQUE, password_hash, created_at, updated_at)

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SEED_SECRET;
  if (!secret) return NextResponse.json({ error: 'Server missing ADMIN_SEED_SECRET' }, { status: 500 });
  const provided = req.headers.get('x-seed-secret');
  if (provided !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = process.env.ADMIN_SEED_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) return NextResponse.json({ error: 'Missing ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD' }, { status: 500 });

  try {
    // Check existence
    const existing = await query<any>('SELECT id FROM admin_accounts WHERE email=? LIMIT 1', [email]);
    if (existing.length) {
      return NextResponse.json({ status: 'already-exists', id: existing[0].id });
    }
  } catch (e: any) {
    // Fallback alternative table name if schema differs
    if (e?.code === 'ER_NO_SUCH_TABLE') {
      try {
        const existingAlt = await query<any>('SELECT id FROM admins WHERE email=? LIMIT 1', [email]);
        if (existingAlt.length) return NextResponse.json({ status: 'already-exists', id: existingAlt[0].id });
        const hash = await bcrypt.hash(password, 10);
        await query('INSERT INTO admins (id,email,password_hash,created_at,updated_at) VALUES (UUID(),?,?,NOW(),NOW())', [email, hash]);
        return NextResponse.json({ status: 'created', table: 'admins' });
      } catch (inner) {
        console.error('Admin seed fallback failed', inner);
        return NextResponse.json({ error: 'Admin seed failed (fallback)' }, { status: 500 });
      }
    } else {
      console.error('Admin seed existence check failed', e);
      return NextResponse.json({ error: 'Admin seed failed' }, { status: 500 });
    }
  }

  // Insert into primary table
  try {
    const hash = await bcrypt.hash(password, 10);
    await query('INSERT INTO admin_accounts (id,email,password_hash,created_at,updated_at) VALUES (UUID(),?,?,NOW(),NOW())', [email, hash]);
    return NextResponse.json({ status: 'created', table: 'admin_accounts' });
  } catch (e: any) {
    if (e?.code === 'ER_NO_SUCH_TABLE') {
      // Retry with fallback handled earlier (in case race)
      try {
        const hash = await bcrypt.hash(password, 10);
        await query('INSERT INTO admins (id,email,password_hash,created_at,updated_at) VALUES (UUID(),?,?,NOW(),NOW())', [email, hash]);
        return NextResponse.json({ status: 'created', table: 'admins' });
      } catch (inner) {
        console.error('Admin seed insert fallback failed', inner);
        return NextResponse.json({ error: 'Admin seed failed (no table)' }, { status: 500 });
      }
    }
    if (e?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ status: 'already-exists' });
    }
    console.error('Admin seed insert failed', e);
    return NextResponse.json({ error: 'Admin seed failed' }, { status: 500 });
  }
}
