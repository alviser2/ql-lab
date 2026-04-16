import { Router } from 'express'
import { query } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { asyncHandler } from '../lib/async.js'

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

export default router
