import { Router } from 'express'
import { getDb } from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, (req, res) => {
  const db = getDb()
  const departments = db
    .prepare('SELECT id, name, code, type FROM departments ORDER BY name ASC')
    .all()
  res.json(departments)
})

export default router
