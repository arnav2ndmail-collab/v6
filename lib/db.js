// lib/db.js — Upstash Redis wrapper
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars
// Free tier: 10,000 requests/day at upstash.com

let _redis = null

async function getRedis() {
  if (_redis) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const { Redis } = await import('@upstash/redis')
    _redis = new Redis({ url, token })
    return _redis
  } catch (e) { return null }
}

export const isDBAvailable = () =>
  !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

export async function dbGet(key) {
  try { const r = await getRedis(); return r ? await r.get(key) : null } catch { return null }
}

export async function dbSet(key, value, exSeconds) {
  try {
    const r = await getRedis(); if (!r) return false
    if (exSeconds) await r.set(key, value, { ex: exSeconds })
    else await r.set(key, value)
    return true
  } catch { return false }
}

export async function dbDel(key) {
  try { const r = await getRedis(); return r ? !!(await r.del(key)) : false } catch { return false }
}

export async function dbKeys(pattern) {
  try { const r = await getRedis(); return r ? (await r.keys(pattern)) || [] : [] } catch { return [] }
}

export async function dbScan(pattern) {
  // Scan all keys matching pattern (handles large datasets)
  try {
    const r = await getRedis(); if (!r) return []
    let cursor = 0, keys = []
    do {
      const [nextCursor, batch] = await r.scan(cursor, { match: pattern, count: 100 })
      cursor = parseInt(nextCursor)
      keys = keys.concat(batch)
    } while (cursor !== 0)
    return keys
  } catch { return [] }
}
