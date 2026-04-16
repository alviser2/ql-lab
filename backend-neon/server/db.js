import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

export async function query(text, params = []) {
  return pool.query(text, params)
}

export async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await fn(client)
    await client.query('commit')
    return result
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export function genId(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 10)
  const now = Date.now().toString(36)
  return `${prefix}_${now}_${rand}`
}

export async function healthCheck() {
  const { rows } = await query('select now() as now')
  return rows[0]
}

export default pool
