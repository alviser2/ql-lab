import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { healthCheck } from './db.js'

import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import tasksRouter from './routes/tasks.js'
import meetingsRouter from './routes/meetings.js'
import kpiRouter from './routes/kpi.js'
import departmentsRouter from './routes/departments.js'
import adminRouter from './routes/admin.js'

const app = express()
app.disable('x-powered-by')

const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'
const IS_PRODUCTION = NODE_ENV === 'production'
const IS_VERCEL = !!process.env.VERCEL

if (IS_PRODUCTION && !process.env.JWT_SECRET) {
  console.error('[startup] JWT_SECRET is required in production.')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('[startup] DATABASE_URL is required.')
  process.exit(1)
}

const defaultCorsOrigins = IS_PRODUCTION ? '' : 'http://localhost:5173'
const parsedOrigins = (process.env.CORS_ORIGINS || defaultCorsOrigins)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

if (IS_PRODUCTION && parsedOrigins.length === 0) {
  console.error('[startup] CORS_ORIGINS is required in production.')
  process.exit(1)
}

const allowedOrigins = new Set(parsedOrigins)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (allowedOrigins.size === 0) return callback(null, true)
      if (allowedOrigins.has(origin)) return callback(null, true)
      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', async (req, res, next) => {
  try {
    const db = await healthCheck()
    res.json({ status: 'ok', time: new Date().toISOString(), db })
  } catch (err) {
    next(err)
  }
})

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/meetings', meetingsRouter)
app.use('/api/kpi', kpiRouter)
app.use('/api/departments', departmentsRouter)
app.use('/api/admin', adminRouter)

app.use((err, req, res, next) => {
  console.error('[server error]', err)

  if (err?.message === 'ATTENDEE_IDS_INVALID') {
    return res.status(400).json({
      code: 'ATTENDEE_IDS_INVALID',
      message: 'Danh sách người tham dự không hợp lệ',
    })
  }

  return res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: IS_PRODUCTION ? 'Lỗi server' : err?.message || 'Lỗi server',
  })
})

console.log('[startup] env:', {
  nodeEnv: NODE_ENV,
  corsOrigins: parsedOrigins,
  hasJwtSecret: !!process.env.JWT_SECRET,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
})

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`[server-neon] running on http://localhost:${PORT}`)
  })
}

export default app
