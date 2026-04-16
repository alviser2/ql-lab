import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { getDb } from '../db.js'
import { JWT_SECRET } from '../middleware/auth.js'
import { badRequest, notFound, unauthorized } from '../lib/http.js'

const router = Router()

function getManagedDepts(db, userId) {
  const rows = db.prepare('SELECT department_id FROM vice_director_departments WHERE vice_director_id = ?').all(userId)
  return rows.map(r => r.department_id)
}

router.post('/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return badRequest(res, 'AUTH_REQUIRED_FIELDS', 'Nhập username và password')
  }

  const db = getDb()
  const user = db.prepare(`
    SELECT u.*, r.role_name, r.level as role_level
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.username = ?
  `).get(username)

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return unauthorized(res, 'AUTH_INVALID_CREDENTIALS', 'Username hoặc password không đúng')
  }

  const managedDepartmentIds = user.role_id === 'r-vice-director'
    ? getManagedDepts(db, user.id)
    : undefined

  const token = jwt.sign(
    { userId: user.id, role: user.role_id, roleName: user.role_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({
    token,
    user: {
      id: user.id,
      name: user.full_name,
      email: user.username + '@benhvien.vn',
      role: user.role_id,
      roleName: user.role_name,
      departmentId: user.dept_id,
      managedDepartmentIds,
      title: user.role_name,
    }
  })
})

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'TOKEN_MISSING', 'Không có token truy cập')
  }
  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const db = getDb()
    const user = db.prepare(`
      SELECT u.*, r.role_name, r.level as role_level
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).get(payload.userId)

    if (!user) return notFound(res, 'USER_NOT_FOUND', 'User không tồn tại')

    const managedDepartmentIds = user.role_id === 'r-vice-director'
      ? getManagedDepts(db, user.id)
      : undefined

    res.json({
      id: user.id,
      name: user.full_name,
      email: user.username + '@benhvien.vn',
      role: user.role_id,
      roleName: user.role_name,
      departmentId: user.dept_id,
      managedDepartmentIds,
      title: user.role_name,
    })
  } catch {
    unauthorized(res, 'TOKEN_INVALID', 'Token không hợp lệ')
  }
})

export default router
