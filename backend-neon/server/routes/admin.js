import { Router } from 'express'
import bcrypt from 'bcrypt'
import { genId, query, withTransaction } from '../db.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { badRequest, notFound } from '../lib/http.js'
import { asyncHandler } from '../lib/async.js'

const router = Router()

const PROTECTED_BACKUP_USERNAME = 'admin'

function isProtectedBackupAccount(username) {
  return String(username || '').trim().toLowerCase() === PROTECTED_BACKUP_USERNAME
}

router.use(authenticate, requireRole('r-director'))

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `
      select
        u.id,
        u.username,
        u.full_name,
        u.role_id,
        u.dept_id,
        u.is_active,
        u.created_at,
        u.updated_at,
        r.role_name,
        d.name as dept_name,
        coalesce(
          (
            select json_agg(v.department_id order by v.department_id)
            from vice_director_departments v
            where v.vice_director_id = u.id
          ),
          '[]'::json
        ) as managed_department_ids
      from users u
      join roles r on u.role_id = r.id
      left join departments d on d.id = u.dept_id
      where lower(trim(u.username)) <> $1
      order by u.created_at desc
    `,
      [PROTECTED_BACKUP_USERNAME],
    )

    res.json(rows)
  }),
)

router.post(
  '/users',
  asyncHandler(async (req, res) => {
    const {
      username,
      full_name,
      password,
      role_id,
      dept_id,
      managed_department_ids,
      is_active,
    } = req.body || {}

    if (!username || !full_name || !password || !role_id) {
      return badRequest(res, 'ADMIN_USER_REQUIRED_FIELDS', 'Thiếu username/full_name/password/role_id')
    }

    const roleRs = await query('select id from roles where id = $1 limit 1', [role_id])
    if (roleRs.rowCount === 0) {
      return badRequest(res, 'ROLE_NOT_FOUND', 'role_id không tồn tại')
    }

    if (dept_id) {
      const deptRs = await query('select id from departments where id = $1 limit 1', [dept_id])
      if (deptRs.rowCount === 0) {
        return badRequest(res, 'DEPARTMENT_NOT_FOUND', 'dept_id không tồn tại')
      }
    }

    const normalizedUsername = String(username).trim().toLowerCase()
    const existed = await query('select id from users where username = $1 limit 1', [normalizedUsername])
    if (existed.rowCount > 0) {
      return badRequest(res, 'USERNAME_EXISTS', 'Username đã tồn tại')
    }

    const hash = await bcrypt.hash(String(password), 10)
    const id = genId('u')

    await withTransaction(async (client) => {
      await client.query(
        `
        insert into users (
          id, username, full_name, password_hash, role_id, dept_id, is_active
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          id,
          normalizedUsername,
          String(full_name).trim(),
          hash,
          role_id,
          dept_id || null,
          is_active !== undefined ? !!is_active : true,
        ],
      )

      if (role_id === 'r-vice-director' && Array.isArray(managed_department_ids)) {
        for (const depId of managed_department_ids) {
          // eslint-disable-next-line no-await-in-loop
          await client.query(
            `
            insert into vice_director_departments (vice_director_id, department_id)
            values ($1, $2)
            on conflict (vice_director_id, department_id) do nothing
          `,
            [id, depId],
          )
        }
      }
    })

    const created = await query(
      `
      select id, username, full_name, role_id, dept_id, is_active, created_at
      from users where id = $1
      limit 1
    `,
      [id],
    )

    res.status(201).json(created.rows[0])
  }),
)

router.patch(
  '/users/:id/password',
  asyncHandler(async (req, res) => {
    const { password } = req.body || {}
    if (!password || String(password).length < 6) {
      return badRequest(res, 'PASSWORD_TOO_SHORT', 'Mật khẩu phải có ít nhất 6 ký tự')
    }

    const userRs = await query('select id, username from users where id = $1 limit 1', [req.params.id])
    if (userRs.rowCount === 0) return notFound(res, 'USER_NOT_FOUND', 'User không tồn tại')

    if (isProtectedBackupAccount(userRs.rows[0]?.username)) {
      return badRequest(
        res,
        'PROTECTED_ACCOUNT_FORBIDDEN',
        'Tài khoản admin backup được bảo vệ, không thể đổi mật khẩu tại đây',
      )
    }

    const hash = await bcrypt.hash(String(password), 10)
    await query('update users set password_hash = $1, updated_at = now() where id = $2', [
      hash,
      req.params.id,
    ])

    res.json({ ok: true, message: 'Đã đổi mật khẩu' })
  }),
)

router.patch(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const { role_id, dept_id, managed_department_ids } = req.body || {}

    if (!role_id) {
      return badRequest(res, 'ROLE_REQUIRED', 'Thiếu role_id')
    }

    const userRs = await query('select id, username from users where id = $1 limit 1', [req.params.id])
    if (userRs.rowCount === 0) return notFound(res, 'USER_NOT_FOUND', 'User không tồn tại')

    if (isProtectedBackupAccount(userRs.rows[0]?.username)) {
      return badRequest(
        res,
        'PROTECTED_ACCOUNT_FORBIDDEN',
        'Tài khoản admin backup được bảo vệ, không thể đổi phân quyền',
      )
    }

    const roleRs = await query('select id from roles where id = $1 limit 1', [role_id])
    if (roleRs.rowCount === 0) {
      return badRequest(res, 'ROLE_NOT_FOUND', 'role_id không tồn tại')
    }

    if (dept_id) {
      const deptRs = await query('select id from departments where id = $1 limit 1', [dept_id])
      if (deptRs.rowCount === 0) {
        return badRequest(res, 'DEPARTMENT_NOT_FOUND', 'dept_id không tồn tại')
      }
    }

    await withTransaction(async (client) => {
      await client.query('update users set role_id = $1, dept_id = $2, updated_at = now() where id = $3', [
        role_id,
        dept_id || null,
        req.params.id,
      ])

      await client.query('delete from vice_director_departments where vice_director_id = $1', [
        req.params.id,
      ])

      if (role_id === 'r-vice-director' && Array.isArray(managed_department_ids)) {
        for (const depId of managed_department_ids) {
          // eslint-disable-next-line no-await-in-loop
          await client.query(
            `
            insert into vice_director_departments (vice_director_id, department_id)
            values ($1, $2)
            on conflict (vice_director_id, department_id) do nothing
          `,
            [req.params.id, depId],
          )
        }
      }
    })

    res.json({ ok: true, message: 'Đã cập nhật role' })
  }),
)

router.patch(
  '/users/:id/active',
  asyncHandler(async (req, res) => {
    const { is_active } = req.body || {}
    if (typeof is_active !== 'boolean') {
      return badRequest(res, 'ACTIVE_REQUIRED', 'is_active phải là boolean')
    }

    const userRs = await query('select id, username from users where id = $1 limit 1', [req.params.id])
    if (userRs.rowCount === 0) return notFound(res, 'USER_NOT_FOUND', 'User không tồn tại')

    if (isProtectedBackupAccount(userRs.rows[0]?.username)) {
      return badRequest(
        res,
        'PROTECTED_ACCOUNT_FORBIDDEN',
        'Tài khoản admin backup được bảo vệ, không thể khóa/mở tại đây',
      )
    }

    await query('update users set is_active = $1, updated_at = now() where id = $2', [
      is_active,
      req.params.id,
    ])

    res.json({ ok: true, message: 'Đã cập nhật trạng thái tài khoản' })
  }),
)

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const targetId = req.params.id

    if (req.userId === targetId) {
      return badRequest(res, 'SELF_DELETE_FORBIDDEN', 'Không thể tự xóa tài khoản đang đăng nhập')
    }

    const targetRs = await query(
      'select id, username, role_id, is_active from users where id = $1 limit 1',
      [targetId],
    )
    const target = targetRs.rows[0]

    if (!target) return notFound(res, 'USER_NOT_FOUND', 'User không tồn tại')

    if (isProtectedBackupAccount(target.username)) {
      return badRequest(
        res,
        'PROTECTED_ACCOUNT_FORBIDDEN',
        'Tài khoản admin backup được bảo vệ, không thể xóa',
      )
    }

    if (target.role_id === 'r-director' && target.is_active) {
      const directorCountRs = await query(
        `
        select count(*)::int as c
        from users
        where role_id = 'r-director' and is_active = true and id <> $1
      `,
        [targetId],
      )
      const remainDirectors = directorCountRs.rows[0]?.c || 0
      if (remainDirectors < 1) {
        return badRequest(
          res,
          'LAST_DIRECTOR_FORBIDDEN',
          'Không thể xóa Giám đốc cuối cùng của hệ thống',
        )
      }
    }

    const deletedUsername = `${target.username}__deleted_${Date.now()}`

    await withTransaction(async (client) => {
      await client.query(
        `
        update users
        set
          is_active = false,
          username = $1,
          full_name = concat(full_name, ' (đã xóa)'),
          updated_at = now()
        where id = $2
      `,
        [deletedUsername, targetId],
      )

      await client.query('delete from vice_director_departments where vice_director_id = $1', [targetId])
    })

    res.json({ ok: true, message: 'Đã xóa tài khoản (soft delete)' })
  }),
)

export default router
