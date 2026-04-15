import express from 'express'
import cors from 'cors'
import { getDb } from './db.js'
import { seed } from './db/seed.js'

// Routes
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'
import tasksRouter from './routes/tasks.js'
import meetingsRouter from './routes/meetings.js'
import kpiRouter from './routes/kpi.js'
import departmentsRouter from './routes/departments.js'

const app = express()
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'
const IS_PRODUCTION = NODE_ENV === 'production'

if (IS_PRODUCTION && !process.env.JWT_SECRET) {
  console.error('[startup] JWT_SECRET is required in production.')
  process.exit(1)
}

const defaultCorsOrigins = IS_PRODUCTION ? '' : 'http://localhost:5173'
const parsedOrigins = (process.env.CORS_ORIGINS || defaultCorsOrigins)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const allowedOrigins = new Set(parsedOrigins)

app.use(
  cors({
    origin(origin, callback) {
      // allow non-browser/server-to-server calls
      if (!origin) return callback(null, true)
      if (allowedOrigins.has(origin)) return callback(null, true)
      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '10mb' }))

// Init DB and optional seed
getDb()
const shouldSeed = process.env.SEED_ON_START === 'true' || !IS_PRODUCTION
if (shouldSeed) {
  seed()
}

console.log('[startup] env:', {
  nodeEnv: NODE_ENV,
  dbPath: process.env.DB_PATH || 'server/giao_ban.db',
  corsOrigins: parsedOrigins,
  seedOnStart: shouldSeed,
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/meetings', meetingsRouter)
app.use('/api/kpi', kpiRouter)
app.use('/api/departments', departmentsRouter)

// Error handler
app.use((err, req, res, next) => {
  console.error('[server error]', err)
  res.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Lỗi server',
  })
})

app.listen(PORT, () => {
  console.log(`[server] Giao Ban API running on http://localhost:${PORT}`)
  console.log(`[server] Login: director / 123456`)
})
