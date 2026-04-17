import { Router } from 'express'
import { getDb } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { badRequest } from '../lib/http.js'

const router = Router()

router.get('/metrics', authenticate, (req, res) => {
  const db = getDb()
  const metrics = db.prepare('SELECT * FROM kpi_metrics').all()
  res.json(metrics)
})

router.get('/users/:userId/monthly/:month/:year', authenticate, (req, res) => {
  const db = getDb()
  const { userId, month, year } = req.params
  const m = parseInt(month)
  const y = parseInt(year)

  if (!Number.isFinite(m) || !Number.isFinite(y) || m < 1 || m > 12) {
    return badRequest(res, 'KPI_INVALID_PERIOD', 'Tháng/năm KPI không hợp lệ')
  }

  const result = db.prepare(`
    SELECT * FROM kpi_results WHERE user_id = ? AND month = ? AND year = ?
  `).get(userId, m, y)

  if (!result) {
    // Calculate auto score
    const completedOnTime = db.prepare(`
      SELECT COUNT(*) as c FROM tasks
      WHERE assignee_id = ? AND status = 'COMPLETED'
        AND completed_at <= deadline
        AND strftime('%m', completed_at) = ? AND strftime('%Y', completed_at) = ?
    `).get(userId, String(month).padStart(2, '0'), year)

    const totalCompleted = db.prepare(`
      SELECT COUNT(*) as c FROM tasks
      WHERE assignee_id = ? AND status = 'COMPLETED'
        AND strftime('%m', completed_at) = ? AND strftime('%Y', completed_at) = ?
    `).get(userId, String(month).padStart(2, '0'), year)

    const rejected = db.prepare(`
      SELECT COUNT(*) as c FROM tasks
      WHERE assignee_id = ? AND status = 'REJECTED'
        AND strftime('%m', updated_at) = ? AND strftime('%Y', updated_at) = ?
    `).get(userId, String(month).padStart(2, '0'), year)

    const total = totalCompleted.c || 1
    const scoreOnTime = totalCompleted.c > 0 ? (completedOnTime.c / total) * 100 : 0
    const scoreVolume = Math.min(total * 10, 100)
    const scoreRedo = Math.max(0, 100 - (rejected.c / total) * 100)

    const metrics = db.prepare('SELECT * FROM kpi_metrics').all()
    const autoScore = Math.round(
      scoreOnTime * (metrics.find(m => m.name.includes('hạn'))?.weight || 0.4) +
      scoreVolume * (metrics.find(m => m.name.includes('lượng'))?.weight || 0.3) +
      scoreRedo * (metrics.find(m => m.name.includes('lại'))?.weight || 0.3)
    )

    return res.json({
      userId,
      month: m,
      year: y,
      score_auto: autoScore,
      score_manual: null,
      final_grade: null,
    })
  }

  res.json(result)
})

router.get('/departments/:deptId', authenticate, (req, res) => {
  const db = getDb()
  const { deptId } = req.params

  const users = db.prepare('SELECT id FROM users WHERE dept_id = ?').all(deptId)
  const userIds = users.map(u => u.id)

  if (userIds.length === 0) return res.json({ departmentId: deptId, tasks: [], scores: {} })

  const placeholders = userIds.map(() => '?').join(',')

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN deadline < datetime('now') AND status NOT IN ('COMPLETED','REJECTED') THEN 1 ELSE 0 END) as overdue
    FROM tasks
    WHERE assignee_id IN (${placeholders})
  `).all(...userIds)

  res.json({
    departmentId: deptId,
    ...stats[0],
    userCount: userIds.length,
  })
})

router.get('/departments', authenticate, (req, res) => {
  const db = getDb()
  const depts = db.prepare('SELECT * FROM departments').all()
  res.json(depts)
})

export default router
