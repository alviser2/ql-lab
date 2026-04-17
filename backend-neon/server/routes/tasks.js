import { Router } from 'express'
import { genId, query, withTransaction } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { badRequest, forbidden, notFound } from '../lib/http.js'
import { asyncHandler } from '../lib/async.js'
import { canAssignByRole } from '../lib/rbac.js'

const router = Router()

const TASK_SELECT = `
  select
    t.*,
    cu.full_name as creator_name,
    au.full_name as assignee_name,
    mu.full_name as monitor_name,
    ou.full_name as overseer_name,
    ru.full_name as reviewer_name,
    d.name as department_name,
    m.title as meeting_title
  from tasks t
  left join users cu on t.creator_id = cu.id
  left join users au on t.assignee_id = au.id
  left join users mu on t.monitor_id = mu.id
  left join users ou on t.overseen_by_vice_director_id = ou.id
  left join users ru on t.pending_approval_reviewer_id = ru.id
  left join departments d on t.department_id = d.id
  left join meetings m on t.meeting_id = m.id
`

async function getManagedDepts(userId) {
  const { rows } = await query(
    'select department_id from vice_director_departments where vice_director_id = $1',
    [userId],
  )
  return rows.map((r) => r.department_id)
}

async function getUserMeta(userId) {
  const { rows } = await query(
    'select id, role_id, dept_id from users where id = $1 and is_active = true limit 1',
    [userId],
  )
  return rows[0] || null
}

async function getTaskById(taskId) {
  const { rows } = await query(`${TASK_SELECT} where t.id = $1 limit 1`, [taskId])
  return rows[0] || null
}

async function addHistory(taskId, userId, oldStatus, newStatus, comment, client = null) {
  const runner = client ? client.query.bind(client) : query
  await runner(
    `
      insert into task_history (id, task_id, changed_by, old_status, new_status, comment)
      values ($1, $2, $3, $4, $5, $6)
    `,
    [genId('hist'), taskId, userId, oldStatus || null, newStatus || null, comment || null],
  )
}

function isArchivedTask(task) {
  return task?.archived === true
}

async function allDescendantsCompleted(taskId) {
  const { rows } = await query('select id, status from tasks where parent_task_id = $1', [taskId])
  if (rows.length === 0) return true

  for (const child of rows) {
    if (child.status !== 'COMPLETED') return false
    // eslint-disable-next-line no-await-in-loop
    const ok = await allDescendantsCompleted(child.id)
    if (!ok) return false
  }
  return true
}

async function getRootTaskId(taskId) {
  let currentId = taskId
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const rs = await query('select id, parent_task_id from tasks where id = $1 limit 1', [currentId])
    const row = rs.rows[0]
    if (!row || !row.parent_task_id) return currentId
    currentId = row.parent_task_id
  }
}

async function collectSubtreeTaskIds(rootId) {
  const ids = []
  const stack = [rootId]

  while (stack.length > 0) {
    const id = stack.pop()
    if (!id) continue
    ids.push(id)

    // eslint-disable-next-line no-await-in-loop
    const rs = await query('select id from tasks where parent_task_id = $1', [id])
    for (const child of rs.rows) stack.push(child.id)
  }

  return ids
}

async function subtreeReadyForArchive(rootId) {
  const rs = await query('select status, archived from tasks where id = $1 limit 1', [rootId])
  const root = rs.rows[0]
  if (!root || root.archived === true) return false
  if (root.status !== 'COMPLETED') return false
  return allDescendantsCompleted(rootId)
}

async function archiveSubtree(rootId, actorId) {
  const ids = await collectSubtreeTaskIds(rootId)
  if (ids.length === 0) return

  await query(
    `
      update tasks
      set archived = true,
          archived_at = now(),
          archived_by_id = $1,
          pending_approval_reviewer_id = null,
          approval_source = null,
          updated_at = now()
      where id = any($2::text[])
    `,
    [actorId, ids],
  )

  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    await addHistory(
      id,
      actorId,
      'COMPLETED',
      'COMPLETED',
      'Giám đốc chốt cây việc — chuyển lịch sử',
    )
  }
}

function taskVisibleToUser(task, userId, userRole, managedDepts, myDeptId) {
  if (userRole === 'r-director') return true

  if (userRole === 'r-vice-director') {
    return (
      task.overseen_by_vice_director_id === userId ||
      task.creator_id === userId ||
      task.assignee_id === userId ||
      managedDepts.includes(task.department_id)
    )
  }

  if (userRole === 'r-dept-head') {
    return (
      task.department_id === myDeptId ||
      task.assignee_id === userId ||
      task.creator_id === userId
    )
  }

  return task.assignee_id === userId
}

function canManageTask(task, actorId, actorRole, managedDepts, myDeptId) {
  if (actorRole === 'r-director') return true
  if (task.creator_id === actorId || task.assigned_by_id === actorId) return true

  if (actorRole === 'r-vice-director') {
    return managedDepts.includes(task.department_id)
  }

  if (actorRole === 'r-dept-head') {
    return !!myDeptId && task.department_id === myDeptId
  }

  return false
}

function canAssigneePatchTask(patch) {
  const allowed = ['status', 'comment']
  const keys = Object.keys(patch || {}).filter((k) => patch[k] !== undefined)
  return keys.length > 0 && keys.every((k) => allowed.includes(k))
}

function isStatusTransitionValid(from, to) {
  if (from === to) return true
  const allowed = {
    NEW: ['IN_PROGRESS', 'COMPLETED'],
    IN_PROGRESS: ['COMPLETED'],
    PENDING_APPROVAL: [],
    COMPLETED: [],
    REJECTED: [],
  }
  return (allowed[from] || []).includes(to)
}

async function listVisibleTasks(userId, userRole, myDeptId, opts = {}) {
  const { includeArchived = false, onlyArchived = false } = opts

  let archiveSql = 'and t.archived = false'
  if (onlyArchived) archiveSql = 'and t.archived = true'
  else if (includeArchived) archiveSql = ''

  if (userRole === 'r-director') {
    const { rows } = await query(`${TASK_SELECT} where 1=1 ${archiveSql} order by t.created_at desc`)
    return rows
  }

  if (userRole === 'r-vice-director') {
    const managed = await getManagedDepts(userId)
    const { rows } = await query(
      `
        ${TASK_SELECT}
        where (
          t.overseen_by_vice_director_id = $1
          or t.creator_id = $1
          or t.assignee_id = $1
          or t.department_id = any($2::text[])
        )
        ${archiveSql}
        order by t.created_at desc
      `,
      [userId, managed],
    )
    return rows
  }

  if (userRole === 'r-dept-head') {
    const { rows } = await query(
      `
        ${TASK_SELECT}
        where (t.department_id = $1 or t.assignee_id = $2 or t.creator_id = $2)
        ${archiveSql}
        order by t.created_at desc
      `,
      [myDeptId || '__none__', userId],
    )
    return rows
  }

  const { rows } = await query(
    `${TASK_SELECT} where t.assignee_id = $1 ${archiveSql} order by t.created_at desc`,
    [userId],
  )
  return rows
}

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req
    const me = await getUserMeta(userId)

    const includeArchived = String(req.query.include_archived || '') === '1'
    const onlyArchived = String(req.query.only_archived || '') === '1'

    const tasks = await listVisibleTasks(userId, userRole, me?.dept_id ?? null, {
      includeArchived,
      onlyArchived,
    })

    res.json(tasks)
  }),
)

router.get(
  '/tree',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req
    const me = await getUserMeta(userId)

    const visible = await listVisibleTasks(userId, userRole, me?.dept_id ?? null, {
      includeArchived: false,
    })

    const map = new Map(visible.map((t) => [t.id, { ...t, children: [] }]))
    const roots = []

    map.forEach((node) => {
      const parentKey = node.parent_task_id
      if (!parentKey || !map.has(parentKey)) roots.push(node)
      else map.get(parentKey)?.children?.push(node)
    })

    function sortTree(nodes) {
      nodes.sort((a, b) => String(a.title).localeCompare(String(b.title), 'vi'))
      nodes.forEach((n) => {
        if (n.children?.length) sortTree(n.children)
      })
    }

    sortTree(roots)
    res.json(roots)
  }),
)

router.get(
  '/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req
    const me = await getUserMeta(userId)
    const tasks = await listVisibleTasks(userId, userRole, me?.dept_id ?? null, {
      onlyArchived: true,
    })
    res.json(tasks)
  }),
)

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req

    const task = await getTaskById(req.params.id)
    if (!task) return notFound(res, 'TASK_NOT_FOUND', 'Không tìm thấy công việc')

    const me = await getUserMeta(userId)
    const managed = userRole === 'r-vice-director' ? await getManagedDepts(userId) : []

    const visible = taskVisibleToUser(task, userId, userRole, managed, me?.dept_id ?? null)
    if (!visible) return forbidden(res, 'FORBIDDEN_TASK_VIEW', 'Bạn không có quyền xem công việc này')

    res.json(task)
  }),
)

router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req
    const me = await getUserMeta(userId)

    const {
      title,
      description,
      meeting_id,
      parent_task_id,
      priority,
      assignee_id,
      monitor_id,
      deadline,
      department_id,
      thuong_truc_id,
      bo_phan_phoi_hop_ids,
      phuong_phap_lam,
      dukien_ket_qua,
    } = req.body || {}

    if (!title || !deadline) {
      return badRequest(res, 'TASK_REQUIRED_FIELDS', 'Thiếu tiêu đề hoặc deadline')
    }

    if (userRole === 'r-staff') {
      return forbidden(res, 'FORBIDDEN_CREATE', 'Nhân viên không được tạo công việc')
    }

    if (parent_task_id) {
      const parentRs = await query('select id, deadline from tasks where id = $1 limit 1', [parent_task_id])
      const parent = parentRs.rows[0]
      if (!parent) return badRequest(res, 'PARENT_TASK_NOT_FOUND', 'Công việc cha không tồn tại')
      if (new Date(deadline) > new Date(parent.deadline)) {
        return badRequest(res, 'DEADLINE_AFTER_PARENT', 'Hạn công việc con không được sau hạn công việc cha')
      }
    }

    let deptId = department_id || null
    if (!deptId && assignee_id) {
      const assigneeDeptRs = await query('select dept_id from users where id = $1 limit 1', [assignee_id])
      deptId = assigneeDeptRs.rows[0]?.dept_id || null
    }
    if (!deptId) deptId = me?.dept_id || null
    if (!deptId) {
      return badRequest(res, 'DEPARTMENT_REQUIRED', 'Không xác định được khoa/phòng cho công việc')
    }

    const managedByMe = userRole === 'r-vice-director' ? await getManagedDepts(userId) : []

    if (userRole === 'r-dept-head' && deptId !== me?.dept_id) {
      return forbidden(res, 'FORBIDDEN_DEPARTMENT', 'Trưởng khoa chỉ được tạo việc trong khoa của mình')
    }

    if (userRole === 'r-vice-director' && deptId && !managedByMe.includes(deptId)) {
      return forbidden(
        res,
        'FORBIDDEN_DEPARTMENT_SCOPE',
        'Phó giám đốc chỉ được tạo việc trong khoa được phân công',
      )
    }

    if (assignee_id) {
      const assigneeRs = await query(
        'select id, role_id, dept_id from users where id = $1 and is_active = true limit 1',
        [assignee_id],
      )
      const assignee = assigneeRs.rows[0]
      if (!assignee) return badRequest(res, 'ASSIGNEE_NOT_FOUND', 'Người được giao không tồn tại')

      if (!canAssignByRole(userRole, assignee.role_id)) {
        return forbidden(res, 'ASSIGN_OVER_LEVEL', 'Không được giao việc vượt cấp')
      }

      if (userRole === 'r-dept-head' && assignee.dept_id !== me?.dept_id) {
        return forbidden(
          res,
          'ASSIGN_OUT_OF_DEPARTMENT',
          'Trưởng khoa chỉ được giao việc trong khoa của mình',
        )
      }
    }

    let overseerId = null
    if (userRole === 'r-vice-director') {
      overseerId = userId
    } else if (deptId) {
      const viceRs = await query(
        `
        select vice_director_id as id
        from vice_director_departments
        where department_id = $1
        limit 1
      `,
        [deptId],
      )
      overseerId = viceRs.rows[0]?.id || null
    }

    const extendedParts = []
    if (thuong_truc_id) extendedParts.push(`Thường trực: ${thuong_truc_id}`)

    if (Array.isArray(bo_phan_phoi_hop_ids) && bo_phan_phoi_hop_ids.length > 0) {
      const deptNameRs = await query(
        'select id, name from departments where id = any($1::text[])',
        [bo_phan_phoi_hop_ids],
      )
      const nameMap = new Map(deptNameRs.rows.map((r) => [r.id, r.name]))
      const deptNames = bo_phan_phoi_hop_ids.map((did) => nameMap.get(did) || did).join(', ')
      extendedParts.push(`Phối hợp: ${deptNames}`)
    }

    if (phuong_phap_lam) extendedParts.push(`Phương pháp: ${phuong_phap_lam}`)
    if (dukien_ket_qua) extendedParts.push(`Dự kiến kết quả: ${dukien_ket_qua}`)

    const extendedNote = extendedParts.length > 0 ? extendedParts.join(' | ') : null

    const idemKeyRaw = req.headers['x-idempotency-key']
    const idemKey = Array.isArray(idemKeyRaw) ? idemKeyRaw[0] : idemKeyRaw

    const normalizedTitle = String(title).trim()
    const normalizedDescription = description || null
    const normalizedMeetingId = meeting_id || null
    const normalizedParentId = parent_task_id || null
    const normalizedAssigneeId = assignee_id || null
    const normalizedMonitorId = monitor_id || null
    const normalizedPriority = priority || 'MEDIUM'

    const createResult = await withTransaction(async (client) => {
      if (idemKey) {
        const dupRs = await client.query(
          `
          select t.id
          from tasks t
          where t.creator_id = $1
            and t.status = 'NEW'
            and t.archived = false
            and t.created_at > now() - interval '45 seconds'
            and t.title = $2
            and t.description is not distinct from $3
            and t.meeting_id is not distinct from $4
            and t.parent_task_id is not distinct from $5
            and t.priority = $6
            and t.assignee_id is not distinct from $7
            and t.monitor_id is not distinct from $8
            and t.department_id = $9
            and t.deadline = $10::timestamptz
            and t.extended_note is not distinct from $11
          order by t.created_at desc
          limit 1
        `,
          [
            userId,
            normalizedTitle,
            normalizedDescription,
            normalizedMeetingId,
            normalizedParentId,
            normalizedPriority,
            normalizedAssigneeId,
            normalizedMonitorId,
            deptId,
            deadline,
            extendedNote,
          ],
        )

        if (dupRs.rowCount > 0) {
          return { id: dupRs.rows[0].id, duplicated: true }
        }
      }

      const newId = genId('t')
      await client.query(
        `
        insert into tasks (
          id, meeting_id, parent_task_id, title, description, priority,
          creator_id, assignee_id, monitor_id, department_id,
          overseen_by_vice_director_id, assigned_by_id,
          pending_approval_reviewer_id, approval_source,
          deadline, status, report_summary, extended_note
        )
        values (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12,
          null, null,
          $13, 'NEW', null, $14
        )
      `,
        [
          newId,
          normalizedMeetingId,
          normalizedParentId,
          normalizedTitle,
          normalizedDescription,
          normalizedPriority,
          userId,
          normalizedAssigneeId,
          normalizedMonitorId,
          deptId,
          overseerId,
          userId,
          deadline,
          extendedNote,
        ],
      )

      await addHistory(newId, userId, null, 'NEW', 'Tạo công việc', client)
      return { id: newId, duplicated: false }
    })

    const created = await getTaskById(createResult.id)
    if (createResult.duplicated) {
      return res.status(200).json(created)
    }

    res.status(201).json(created)
  }),
)

router.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req

    const task = await getTaskById(req.params.id)
    if (!task) return notFound(res, 'TASK_NOT_FOUND', 'Không tìm thấy công việc')

    if (isArchivedTask(task)) {
      return badRequest(res, 'TASK_ARCHIVED', 'Công việc đã lưu lịch sử, không thể chỉnh sửa')
    }

    const me = await getUserMeta(userId)
    const managed = userRole === 'r-vice-director' ? await getManagedDepts(userId) : []
    const canManage = canManageTask(task, userId, userRole, managed, me?.dept_id ?? null)

    if (!canManage && task.assignee_id !== userId) {
      return forbidden(res, 'FORBIDDEN_TASK_EDIT', 'Bạn không có quyền cập nhật công việc này')
    }

    const patch = req.body || {}

    if (!canManage && task.assignee_id === userId) {
      if (!canAssigneePatchTask(patch)) {
        return forbidden(
          res,
          'FORBIDDEN_ASSIGNEE_PATCH_SCOPE',
          'Người nhận việc chỉ được cập nhật trạng thái qua luồng báo cáo',
        )
      }

      if (patch.status !== undefined && patch.status !== 'IN_PROGRESS') {
        return forbidden(
          res,
          'FORBIDDEN_ASSIGNEE_STATUS',
          'Người nhận việc chỉ được chuyển trạng thái sang Đang làm',
        )
      }
    }

    if (patch.assignee_id !== undefined || patch.assigneeId !== undefined) {
      return badRequest(res, 'USE_ASSIGN_ENDPOINT', 'Vui lòng dùng API /tasks/:id/assign để giao việc')
    }

    if (patch.deadline !== undefined && patch.parent_task_id) {
      const parentRs = await query('select deadline from tasks where id = $1 limit 1', [
        patch.parent_task_id,
      ])
      const parent = parentRs.rows[0]
      if (parent && new Date(patch.deadline) > new Date(parent.deadline)) {
        return badRequest(res, 'DEADLINE_AFTER_PARENT', 'Hạn công việc con không được sau hạn công việc cha')
      }
    }

    if (patch.status !== undefined) {
      if (!isStatusTransitionValid(task.status, patch.status)) {
        return badRequest(res, 'INVALID_STATUS_FLOW', 'Luồng trạng thái không hợp lệ')
      }

      if (task.assignee_id === userId && patch.status === 'COMPLETED') {
        return forbidden(res, 'USE_REPORT_FLOW', 'Người nhận việc cần gửi báo cáo để xin duyệt hoàn thành')
      }

      if (patch.status === 'COMPLETED' && !(await allDescendantsCompleted(req.params.id))) {
        return badRequest(res, 'CHILDREN_NOT_DONE', 'Cần hoàn thành toàn bộ công việc con trước')
      }
    }

    const fieldMap = {
      title: 'title',
      description: 'description',
      priority: 'priority',
      monitorId: 'monitor_id',
      deadline: 'deadline',
      status: 'status',
      parentId: 'parent_task_id',
      departmentId: 'department_id',
      meeting_id: 'meeting_id',
      parent_task_id: 'parent_task_id',
      monitor_id: 'monitor_id',
      department_id: 'department_id',
    }

    const updates = []
    const values = []

    Object.entries(patch).forEach(([key, val]) => {
      if (val === undefined) return
      if (key === 'comment') return
      const dbField = fieldMap[key]
      if (!dbField) return
      updates.push(`${dbField} = $${values.length + 1}`)
      values.push(val)
    })

    if (patch.extended_note !== undefined) {
      updates.push(`extended_note = $${values.length + 1}`)
      values.push(patch.extended_note)
    }

    if (patch.status === 'COMPLETED') {
      updates.push(`completed_at = $${values.length + 1}`)
      values.push(new Date().toISOString())
    }

    if (patch.status === 'IN_PROGRESS' && task.status === 'NEW') {
      updates.push(`started_at = $${values.length + 1}`)
      values.push(new Date().toISOString())
    }

    if (updates.length === 0) {
      return badRequest(res, 'NO_FIELDS_TO_UPDATE', 'Không có trường hợp lệ để cập nhật')
    }

    updates.push('updated_at = now()')
    await query(`update tasks set ${updates.join(', ')} where id = $${values.length + 1}`, [
      ...values,
      req.params.id,
    ])

    await addHistory(
      req.params.id,
      userId,
      task.status,
      patch.status || task.status,
      patch.comment || null,
    )

    if (userRole === 'r-director') {
      const rootId = await getRootTaskId(req.params.id)
      if (await subtreeReadyForArchive(rootId)) {
        await archiveSubtree(rootId, userId)
      }
    }

    const updated = await getTaskById(req.params.id)
    res.json(updated)
  }),
)

router.post(
  '/:id/report',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId } = req

    const task = await getTaskById(req.params.id)
    if (!task) return notFound(res, 'TASK_NOT_FOUND', 'Không tìm thấy công việc')

    if (isArchivedTask(task)) {
      return badRequest(res, 'TASK_ARCHIVED', 'Công việc đã lưu lịch sử, không thể chỉnh sửa')
    }

    if (task.assignee_id !== userId) {
      return forbidden(res, 'FORBIDDEN_NOT_ASSIGNEE', 'Chỉ người được giao mới gửi báo cáo')
    }

    if (!['NEW', 'IN_PROGRESS'].includes(task.status)) {
      return badRequest(res, 'INVALID_FOR_REPORT', 'Chỉ gửi báo cáo khi việc ở trạng thái Mới/Đang làm')
    }

    const summary = req.body?.summary || ''
    const reviewerId = task.assigned_by_id || task.creator_id

    await query(
      `
      update tasks
      set status = 'PENDING_APPROVAL',
          report_summary = $1,
          pending_approval_reviewer_id = $2,
          approval_source = 'assigner_report',
          last_rejection_reason = null,
          updated_at = now()
      where id = $3
    `,
      [summary, reviewerId, req.params.id],
    )

    await addHistory(req.params.id, userId, task.status, 'PENDING_APPROVAL', `Báo cáo: ${summary}`)

    const updated = await getTaskById(req.params.id)
    res.json(updated)
  }),
)

router.post(
  '/:id/approve',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req

    const task = await getTaskById(req.params.id)
    if (!task) return notFound(res, 'TASK_NOT_FOUND', 'Không tìm thấy công việc')

    if (isArchivedTask(task)) {
      return badRequest(res, 'TASK_ARCHIVED', 'Công việc đã lưu lịch sử, không thể chỉnh sửa')
    }

    if (task.status !== 'PENDING_APPROVAL') {
      return badRequest(res, 'NOT_PENDING', 'Công việc không ở trạng thái chờ duyệt')
    }

    if (task.pending_approval_reviewer_id && task.pending_approval_reviewer_id !== userId) {
      return forbidden(res, 'FORBIDDEN_NOT_REVIEWER', 'Bạn không phải người duyệt của công việc này')
    }

    const { approve, rejection_reason } = req.body || {}

    if (approve) {
      if (!(await allDescendantsCompleted(req.params.id))) {
        return badRequest(res, 'CHILDREN_NOT_DONE', 'Cần hoàn thành toàn bộ công việc con trước')
      }

      await query(
        `
        update tasks
        set status = 'COMPLETED',
            completed_at = $1,
            pending_approval_reviewer_id = null,
            approval_source = null,
            updated_at = now()
        where id = $2
      `,
        [new Date().toISOString(), req.params.id],
      )

      await addHistory(req.params.id, userId, 'PENDING_APPROVAL', 'COMPLETED', 'Duyệt hoàn thành')

      if (userRole === 'r-director') {
        const rootId = await getRootTaskId(req.params.id)
        if (await subtreeReadyForArchive(rootId)) {
          await archiveSubtree(rootId, userId)
        }
      }
    } else {
      await query(
        `
        update tasks
        set status = 'IN_PROGRESS',
            last_rejection_reason = $1,
            pending_approval_reviewer_id = null,
            approval_source = null,
            report_summary = null,
            updated_at = now()
        where id = $2
      `,
        [rejection_reason || 'Bị từ chối', req.params.id],
      )

      await addHistory(
        req.params.id,
        userId,
        'PENDING_APPROVAL',
        'IN_PROGRESS',
        rejection_reason || 'Bị từ chối',
      )
    }

    const updated = await getTaskById(req.params.id)
    res.json(updated)
  }),
)

router.post(
  '/:id/assign',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req

    const task = await getTaskById(req.params.id)
    if (!task) return notFound(res, 'TASK_NOT_FOUND', 'Không tìm thấy công việc')

    if (isArchivedTask(task)) {
      return badRequest(res, 'TASK_ARCHIVED', 'Công việc đã lưu lịch sử, không thể chỉnh sửa')
    }

    const me = await getUserMeta(userId)
    const managed = userRole === 'r-vice-director' ? await getManagedDepts(userId) : []
    const canManage = canManageTask(task, userId, userRole, managed, me?.dept_id ?? null)

    if (!canManage) {
      return forbidden(res, 'FORBIDDEN_ASSIGN', 'Bạn không có quyền giao lại công việc này')
    }

    const { assignee_id } = req.body || {}

    if (assignee_id) {
      const assigneeRs = await query(
        'select id, role_id, dept_id from users where id = $1 and is_active = true limit 1',
        [assignee_id],
      )
      const assignee = assigneeRs.rows[0]
      if (!assignee) return badRequest(res, 'ASSIGNEE_NOT_FOUND', 'Người được giao không tồn tại')

      if (!canAssignByRole(userRole, assignee.role_id)) {
        return forbidden(res, 'ASSIGN_OVER_LEVEL', 'Không được giao việc vượt cấp')
      }

      if (userRole === 'r-dept-head' && assignee.dept_id !== me?.dept_id) {
        return forbidden(
          res,
          'ASSIGN_OUT_OF_DEPARTMENT',
          'Trưởng khoa chỉ được giao việc trong khoa của mình',
        )
      }

      if (task.department_id && assignee.dept_id && userRole !== 'r-director') {
        if (assignee.dept_id !== task.department_id) {
          return forbidden(
            res,
            'ASSIGN_DIFFERENT_DEPARTMENT',
            'Người được giao cần thuộc cùng khoa với công việc',
          )
        }
      }
    }

    await query(
      `
      update tasks
      set assignee_id = $1,
          assigned_by_id = $2,
          updated_at = now()
      where id = $3
    `,
      [assignee_id || null, userId, req.params.id],
    )

    await addHistory(req.params.id, userId, task.assignee_id, assignee_id || null, 'Giao lại việc')

    const updated = await getTaskById(req.params.id)
    res.json(updated)
  }),
)

export default router
