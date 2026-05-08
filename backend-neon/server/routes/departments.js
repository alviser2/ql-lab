import { Router } from 'express'
import { genId, query } from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/async.js'
import { badRequest, notFound } from '../lib/http.js'

function toTitleCase(input) {
  return input
    .trim()
    .toLocaleLowerCase('vi-VN')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('vi-VN') + word.slice(1))
    .join(' ')
}

const router = Router()

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      'select id, name, code, type from departments order by name asc',
    )
    res.json(rows)
  }),
)

router.post(
  '/',
  authenticate,
  requireRole('r-director'),
  asyncHandler(async (req, res) => {
    const { name, code, type } = req.body || {}

    if (!name || !code) {
      return badRequest(res, 'DEPARTMENT_REQUIRED_FIELDS', 'Thiếu name/code')
    }

    const normalizedCode = String(code).trim().toUpperCase()
    const normalizedName = String(name).trim()
    const normalizedTypeRaw = type ? String(type).trim() : ''
    const normalizedType = normalizedTypeRaw ? toTitleCase(normalizedTypeRaw) : null

    const existed = await query('select id from departments where code = $1 limit 1', [normalizedCode])
    if (existed.rowCount > 0) {
      return badRequest(res, 'DEPARTMENT_CODE_EXISTS', 'Mã dự án đã tồn tại')
    }

    const id = `dept-${normalizedCode.toLowerCase().replace(/[^a-z0-9]+/g, '-') || genId('dept')}`

    const inserted = await query(
      `
      insert into departments (id, name, code, type)
      values ($1, $2, $3, $4)
      returning id, name, code, type
    `,
      [id, normalizedName, normalizedCode, normalizedType],
    )

    res.status(201).json(inserted.rows[0])
  }),
)

router.delete(
  '/:departmentId',
  authenticate,
  requireRole('r-director'),
  asyncHandler(async (req, res) => {
    const departmentId = String(req.params.departmentId || '').trim()
    if (!departmentId) {
      return badRequest(res, 'DEPARTMENT_ID_REQUIRED', 'Thiếu departmentId')
    }

    const existing = await query(
      'select id, name, code from departments where id = $1 limit 1',
      [departmentId],
    )
    if (existing.rowCount === 0) {
      return notFound(res, 'DEPARTMENT_NOT_FOUND', 'Không tìm thấy dự án')
    }

    const usageRs = await query(
      `
      select
        (select count(*)::int from users where dept_id = $1) as users_count,
        (select count(*)::int from tasks where department_id = $1) as tasks_count,
        (select count(*)::int from meetings where department_id = $1) as meetings_count
    `,
      [departmentId],
    )

    const usage = usageRs.rows[0] || {
      users_count: 0,
      tasks_count: 0,
      meetings_count: 0,
    }

    const usersCount = Number(usage.users_count || 0)
    const tasksCount = Number(usage.tasks_count || 0)
    const meetingsCount = Number(usage.meetings_count || 0)

    if (usersCount > 0 || tasksCount > 0 || meetingsCount > 0) {
      return badRequest(
        res,
        'DEPARTMENT_IN_USE',
        'Không thể xóa dự án đang có dữ liệu liên quan',
        {
          usersCount,
          tasksCount,
          meetingsCount,
        },
      )
    }

    await query('delete from departments where id = $1', [departmentId])

    return res.json({
      deleted: true,
      department: existing.rows[0],
    })
  }),
)

export default router
