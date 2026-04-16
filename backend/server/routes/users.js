import { Router } from 'express'
import { getDb } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { notFound } from '../lib/http.js'

const router = Router()

router.get('/', authenticate, (req, res) => {
  const db = getDb()
  const users = db.prepare(`
    SELECT u.id, u.full_name, u.username, u.role_id, u.dept_id, u.manager_id,
           r.role_name, r.level as role_level,
           d.name as dept_name, d.code as dept_code
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN departments d ON u.dept_id = d.id
  `).all()
  res.json(users)
})

router.get('/:id', authenticate, (req, res) => {
  const db = getDb()
  const user = db.prepare(`
    SELECT u.id, u.full_name, u.username, u.role_id, u.dept_id, u.manager_id,
           r.role_name, r.level as role_level,
           d.name as dept_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN departments d ON u.dept_id = d.id
    WHERE u.id = ?
  `).get(req.params.id)
  if (!user) return notFound(res, 'USER_NOT_FOUND', 'User không tồn tại')
  res.json(user)
})

router.get('/role/:roleId', authenticate, (req, res) => {
  const db = getDb()
  const users = db.prepare(`
    SELECT u.id, u.full_name, u.username, u.role_id, u.dept_id,
           r.role_name, d.name as dept_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    LEFT JOIN departments d ON u.dept_id = d.id
    WHERE u.role_id = ?
  `).all(req.params.roleId)
  res.json(users)
})

export default router
