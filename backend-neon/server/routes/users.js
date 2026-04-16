import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { notFound } from '../lib/http.js'
import { asyncHandler } from '../lib/async.js'

const router = Router()

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `
      select
        u.id,
        u.full_name,
        u.username,
        u.role_id,
        u.dept_id,
        u.manager_id,
        r.role_name,
        r.level as role_level,
        d.name as dept_name,
        d.code as dept_code
      from users u
      join roles r on u.role_id = r.id
      left join departments d on u.dept_id = d.id
      where u.is_active = true
      order by u.full_name asc
    `,
    )
    res.json(rows)
  }),
)

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `
      select
        u.id,
        u.full_name,
        u.username,
        u.role_id,
        u.dept_id,
        u.manager_id,
        r.role_name,
        r.level as role_level,
        d.name as dept_name,
        d.code as dept_code
      from users u
      join roles r on u.role_id = r.id
      left join departments d on u.dept_id = d.id
      where u.id = $1 and u.is_active = true
      limit 1
    `,
      [req.params.id],
    )

    const user = rows[0]
    if (!user) return notFound(res, 'USER_NOT_FOUND', 'User không tồn tại')
    res.json(user)
  }),
)

router.get(
  '/role/:roleId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `
      select
        u.id,
        u.full_name,
        u.username,
        u.role_id,
        u.dept_id,
        u.manager_id,
        r.role_name,
        d.name as dept_name,
        d.code as dept_code
      from users u
      join roles r on u.role_id = r.id
      left join departments d on u.dept_id = d.id
      where u.role_id = $1 and u.is_active = true
      order by u.full_name asc
    `,
      [req.params.roleId],
    )

    res.json(rows)
  }),
)

export default router
