import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'
import { JWT_SECRET } from '../middleware/auth.js'
import { badRequest, notFound, unauthorized } from '../lib/http.js'
import { asyncHandler } from '../lib/async.js'

const router = Router()

async function getManagedDepartmentIds(userId) {
  const { rows } = await query(
    'select department_id from vice_director_departments where vice_director_id = $1',
    [userId],
  )
  return rows.map((r) => r.department_id)
}

async function mapAuthUser(dbUser) {
  const managedDepartmentIds =
    dbUser.role_id === 'r-vice-director'
      ? await getManagedDepartmentIds(dbUser.id)
      : undefined

  return {
    id: dbUser.id,
    name: dbUser.full_name,
    email: `${dbUser.username}@benhvien.vn`,
    role: dbUser.role_id,
    roleName: dbUser.role_name,
    departmentId: dbUser.dept_id,
    managedDepartmentIds,
    title: dbUser.role_name,
  }
}

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password) {
      return badRequest(res, 'AUTH_REQUIRED_FIELDS', 'Nhập username và password')
    }

    const { rows } = await query(
      `
      select u.*, r.role_name, r.level as role_level
      from users u
      join roles r on u.role_id = r.id
      where u.username = $1 and u.is_active = true
      limit 1
    `,
      [String(username).trim()],
    )

    const user = rows[0]
    if (!user) {
      return unauthorized(res, 'AUTH_INVALID_CREDENTIALS', 'Username hoặc password không đúng')
    }

    const ok = await bcrypt.compare(String(password), user.password_hash)
    if (!ok) {
      return unauthorized(res, 'AUTH_INVALID_CREDENTIALS', 'Username hoặc password không đúng')
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role_id, roleName: user.role_name },
      JWT_SECRET,
      { expiresIn: '7d' },
    )

    res.json({ token, user: await mapAuthUser(user) })
  }),
)

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'TOKEN_MISSING', 'Không có token truy cập')
    }

    const token = authHeader.slice(7)
    let payload
    try {
      payload = jwt.verify(token, JWT_SECRET)
    } catch {
      return unauthorized(res, 'TOKEN_INVALID', 'Token không hợp lệ hoặc đã hết hạn')
    }

    const { rows } = await query(
      `
      select u.*, r.role_name, r.level as role_level
      from users u
      join roles r on u.role_id = r.id
      where u.id = $1 and u.is_active = true
      limit 1
    `,
      [payload.userId],
    )

    const user = rows[0]
    if (!user) return notFound(res, 'USER_NOT_FOUND', 'User không tồn tại')

    res.json(await mapAuthUser(user))
  }),
)

export default router
