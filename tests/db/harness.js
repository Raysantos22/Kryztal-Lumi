// Spins up an in-memory Postgres (PGlite) with the Supabase stubs, every
// migration in supabase/migrations (in order) and supabase/seed.sql.
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p) => readFileSync(join(root, ...p), 'utf8')

export const PRODUCT_ID = 'c0000000-0000-4000-8000-000000000001'
export const ZONE = {
  metro: 'a1000000-0000-4000-8000-000000000001',
  luzon: 'a1000000-0000-4000-8000-000000000002',
  visayas: 'a1000000-0000-4000-8000-000000000003',
  mindanao: 'a1000000-0000-4000-8000-000000000004',
}

export async function createDb({ seed = true } = {}) {
  const db = new PGlite()
  await db.exec(read('src', 'lib', 'api', 'demo', 'supabase-stubs.sql'))
  const migrations = readdirSync(join(root, 'supabase', 'migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const file of migrations) {
    try {
      await db.exec(read('supabase', 'migrations', file))
    } catch (e) {
      throw new Error(`Migration ${file} failed: ${e.message}`)
    }
  }
  if (seed) await db.exec(read('supabase', 'seed.sql'))
  return db
}

// Run fn as a given Postgres role / auth user, then reset to superuser.
export async function as(db, role, userId, fn) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ''])
  if (role) await db.exec(`set role ${role}`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub', '', false)")
  }
}

export const CUSTOMER = {
  name: 'Maria Santos',
  phone: '0917 123 4567',
  email: 'maria@example.com',
  address_line: '12 Sampaguita St.',
  barangay: 'San Antonio',
  city: 'Pasig City',
  province: 'Metro Manila',
  zip: '1600',
  landmark: 'Near the chapel',
}
