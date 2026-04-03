import { ADMIN_EMAIL, ADMIN_PASS, createAdminSession } from '../../../lib/auth'
import { isDBAvailable } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, password } = req.body || {}
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  if (!isDBAvailable()) {
    // Allow admin login without DB using a simple header token
    return res.status(200).json({ token: 'admin_no_db_' + Buffer.from(ADMIN_EMAIL).toString('base64') })
  }
  const token = await createAdminSession()
  return res.status(200).json({ token })
}
