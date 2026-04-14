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

// Init DB and seed
const db = getDb()
seed()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '10mb' }))

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
  res.status(500).json({ error: err.message || 'Lỗi server' })
})

app.listen(PORT, () => {
  console.log(`[server] Giao Ban API running on http://localhost:${PORT}`)
  console.log(`[server] Login: director / 123456`)
})
