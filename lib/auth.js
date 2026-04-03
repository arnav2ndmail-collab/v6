// lib/auth.js
import { dbGet, dbSet, dbDel, dbKeys, dbScan } from './db'
import crypto from 'crypto'

export const ADMIN_EMAIL = 'lastnitro51@gmail.com'
export const ADMIN_PASS = 'lastnitro51'

export function hashPass(pass) {
  return crypto.createHash('sha256').update(pass + 'tz_salt_2026').digest('hex')
}

export function genToken() {
  return crypto.randomBytes(32).toString('hex')
}

// ── Users ───────────────────────────────────────────────────────────────────
export async function getUser(username) {
  return await dbGet('user:' + username.toLowerCase())
}

export async function createUser(username, password) {
  const u = username.toLowerCase().trim()
  if (await getUser(u)) return { error: 'Username already taken' }
  const user = { username: u, passwordHash: hashPass(password), createdAt: Date.now() }
  await dbSet('user:' + u, user)
  return { user }
}

export async function validateUser(username, password) {
  const user = await getUser(username)
  if (!user) return null
  if (user.passwordHash !== hashPass(password)) return null
  return user
}

export async function getAllUsers() {
  const keys = await dbScan('user:*')
  const users = await Promise.all(keys.map(k => dbGet(k)))
  return users.filter(Boolean).map(u => ({
    username: u.username, createdAt: u.createdAt
  }))
}

export async function deleteUser(username) {
  const u = username.toLowerCase()
  await dbDel('user:' + u)
  // Delete their sessions
  const sessKeys = await dbScan('sess:*')
  for (const k of sessKeys) {
    const s = await dbGet(k)
    if (s?.username === u) await dbDel(k)
  }
  // Delete their attempts
  const attKeys = await dbScan(`att:${u}:*`)
  for (const k of attKeys) await dbDel(k)
}

// ── Sessions ─────────────────────────────────────────────────────────────────
export async function createSession(username) {
  const token = genToken()
  await dbSet('sess:' + token, { username: username.toLowerCase(), at: Date.now() }, 60 * 60 * 24 * 30)
  return token
}

export async function getSession(token) {
  if (!token) return null
  return await dbGet('sess:' + token)
}

export async function deleteSession(token) {
  if (token) await dbDel('sess:' + token)
}

// ── Admin sessions ────────────────────────────────────────────────────────────
export async function createAdminSession() {
  const token = genToken()
  await dbSet('adminsess:' + token, { admin: true, at: Date.now() }, 86400)
  return token
}

export async function isAdminSession(token) {
  if (!token) return false
  const s = await dbGet('adminsess:' + token)
  return s?.admin === true
}

// ── Attempts ──────────────────────────────────────────────────────────────────
export async function saveAttempt(userId, data) {
  const id = Date.now() + '_' + Math.random().toString(36).slice(2, 7)
  const key = `att:${userId}:${id}`
  await dbSet(key, { ...data, id, userId, savedAt: Date.now() })
  return id
}

export async function getUserAttempts(userId) {
  const keys = await dbScan(`att:${userId}:*`)
  if (!keys.length) return []
  const results = await Promise.all(keys.map(k => dbGet(k)))
  return results.filter(Boolean).sort((a, b) => b.savedAt - a.savedAt)
}

export async function deleteAttempt(userId, attemptId) {
  await dbDel(`att:${userId}:${attemptId}`)
}

export async function getAllAttemptCount() {
  const keys = await dbScan('att:*')
  return keys.length
}
