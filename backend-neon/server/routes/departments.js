import { Router } from 'express'
import { genId, query } from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/async.js'
import { badRequest } from '../lib/http.js'

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
    const normalizedType = type ? String(type).trim().toUpperCase() : null

    const allowedTypes = ['LAM_SANG', 'CAN_LAM_SANG', 'HANH_CHINH']
    if (normalizedType && !allowedTypes.includes(normalizedType)) {
      return badRequest(res, 'DEPARTMENT_TYPE_INVALID', 'type không hợp lệ')
    }

    const existed = await query('select id from departments where code = $1 limit 1', [normalizedCode])
    if (existed.rowCount > 0) {
      return badRequest(res, 'DEPARTMENT_CODE_EXISTS', 'Mã khoa đã tồn tại')
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

export default router
