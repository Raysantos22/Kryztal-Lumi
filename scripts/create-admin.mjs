// Create (or promote) the shop owner's admin login.
// Usage: npm run create-admin   (reads .env.local)
// Needs VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD.
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

export async function createAdmin({ url, serviceKey, email, password, role = 'owner' }) {
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  let userId
  const { data: created, error: createErr } = await db.auth.admin.createUser({ email, password, email_confirm: true })
  if (created?.user) {
    userId = created.user.id
    console.log(`Created auth user ${email}`)
  } else {
    // Probably exists already — look it up.
    for (let page = 1; !userId; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
      if (error) throw error
      userId = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id
      if (data.users.length < 200) break
    }
    if (!userId) throw new Error(`Could not create or find ${email}: ${createErr?.message}`)
    console.log(`Using existing auth user ${email}`)
  }

  const { error } = await db.from('admin_users').upsert({ user_id: userId, role }, { onConflict: 'user_id' })
  if (error) throw error
  // Send new-order alerts to the owner by default (change in Admin → Settings).
  await db.from('store_private').update({ notify_email: email }).eq('id', 1).is('notify_email', null)
  console.log(`✔ ${email} is now ${role} of Kryztal Lumi`)
  return { userId }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Set VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL and ADMIN_PASSWORD (see .env.example).')
    process.exit(1)
  }
  createAdmin({ url: VITE_SUPABASE_URL, serviceKey: SUPABASE_SERVICE_ROLE_KEY, email: ADMIN_EMAIL, password: ADMIN_PASSWORD }).catch((e) => {
    console.error('✖', e.message)
    process.exit(1)
  })
}
