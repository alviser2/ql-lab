import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { badRequest } from '../lib/http.js'
import { asyncHandler } from '../lib/async.js'

const router = Router()

router.get(
  '/metrics',
  authenticate,
  asyncHandler(async (req, res) => {
    const { rows } = await query('select * from kpi_metrics order by name asc')
    res.json(rows)
  }),
)

router.get(
  '/users/:userId/monthly/:month/:year',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, month, year } = req.params
    const m = Number(month)
    const y = Number(year)

    if (!Number.isFinite(m) || !Number.isFinite(y) || m < 1 || m > 12) {
      return badRequest(res, 'KPI_INVALID_PERIOD', 'Tháng/năm KPI không hợp lệ')
    }

    const rs = await query(
      `
      select *
      from kpi_results
      where user_id = $1 and month = $2 and year = $3
      limit 1
    `,
      [userId, m, y],
    )

    const result = rs.rows[0]
    if (result) return res.json(result)

    const monthStart = `${y}-${String(m).padStart(2, '0')}-01T00:00:00.000Z`
    const monthEndDate = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0))
    const monthEnd = monthEndDate.toISOString()

    const completedOnTimeRs = await query(
      `
      select count(*)::int as c
      from tasks
      where assignee_id = $1
        and status = 'COMPLETED'
        and completed_at is not null
        and completed_at <= deadline
        and completed_at >= $2
        and completed_at < $3
    `,
      [userId, monthStart, monthEnd],
    )

    const totalCompletedRs = await query(
      `
      select count(*)::int as c
      from tasks
      where assignee_id = $1
        and status = 'COMPLETED'
        and completed_at is not null
        and completed_at >= $2
        and completed_at < $3
    `,
      [userId, monthStart, monthEnd],
    )

    const rejectedRs = await query(
      `
      select count(*)::int as c
      from tasks
      where assignee_id = $1
        and status = 'REJECTED'
        and updated_at >= $2
        and updated_at < $3
    `,
      [userId, monthStart, monthEnd],
    )

    const completedOnTime = completedOnTimeRs.rows[0]?.c || 0
    const totalCompleted = totalCompletedRs.rows[0]?.c || 0
    const rejected = rejectedRs.rows[0]?.c || 0

    const total = totalCompleted || 1
    const scoreOnTime = totalCompleted > 0 ? (completedOnTime / total) * 100 : 0
    const scoreVolume = Math.min(totalCompleted * 10, 100)
    const scoreRedo = Math.max(0, 100 - (rejected / total) * 100)

    const metricsRs = await query('select * from kpi_metrics')
    const metrics = metricsRs.rows

    const wOnTime = Number(metrics.find((m) => String(m.name).includes('hạn'))?.weight ?? 0.4)
    const wVolume = Number(metrics.find((m) => String(m.name).includes('lượng'))?.weight ?? 0.3)
    const wRedo = Number(metrics.find((m) => String(m.name).includes('lại'))?.weight ?? 0.3)

    const autoScore = Math.round(scoreOnTime * wOnTime + scoreVolume * wVolume + scoreRedo * wRedo)

    res.json({
      userId,
      month: m,
      year: y,
      score_auto: autoScore,
      score_manual: null,
      final_grade: null,
    })
  }),
)

router.get(
  '/departments/:deptId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { deptId } = req.params

    const usersRs = await query('select id from users where dept_id = $1 and is_active = true', [deptId])
    const userIds = usersRs.rows.map((u) => u.id)

    if (userIds.length === 0) {
      return res.json({ departmentId: deptId, total: 0, completed: 0, rejected: 0, overdue: 0, userCount: 0 })
    }

    const statsRs = await query(
      `
      select
        count(*)::int as total,
        sum(case when status = 'COMPLETED' then 1 else 0 end)::int as completed,
        sum(case when status = 'REJECTED' then 1 else 0 end)::int as rejected,
        sum(case when deadline < now() and status not in ('COMPLETED','REJECTED') then 1 else 0 end)::int as overdue
      from tasks
      where assignee_id = any($1::text[])
    `,
      [userIds],
    )

    res.json({
      departmentId: deptId,
      ...(statsRs.rows[0] || { total: 0, completed: 0, rejected: 0, overdue: 0 }),
      userCount: userIds.length,
    })
  }),
)

router.get(
  '/departments',
  authenticate,
  asyncHandler(async (req, res) => {
    const { rows } = await query('select * from departments order by name asc')
    res.json(rows)
  }),
)

export default router
