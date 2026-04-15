import { Router } from 'express'
import { getDb, genId } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { badRequest, forbidden, notFound } from '../lib/http.js'

const router = Router()

const roleRank = {
  'r-director': 4,
  'r-vice-director': 3,
  'r-dept-head': 2,
  'r-staff': 1,
}

function addHistory(db, taskId, userId, oldStatus, newStatus, comment) {
  db.prepare(`
    INSERT INTO task_history (id, task_id, changed_by, old_status, new_status, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    genId('hist'),
    taskId,
    userId,
    oldStatus || null,
    newStatus || null,
    comment || null,
  )
}

function enrichTask(task) {
  if (!task) return null
  const db = getDb()
  const creator = db.prepare('SELECT full_name FROM users WHERE id = ?').get(task.creator_id)
  const assignee = task.assignee_id
    ? db.prepare('SELECT full_name FROM users WHERE id = ?').get(task.assignee_id)
    : null
  const monitor = task.monitor_id
    ? db.prepare('SELECT full_name FROM users WHERE id = ?').get(task.monitor_id)
    : null
  const overseer = task.overseen_by_vice_director_id
    ? db.prepare('SELECT full_name FROM users WHERE id = ?').get(task.overseen_by_vice_director_id)
    : null
  const reviewer = task.pending_approval_reviewer_id
    ? db.prepare('SELECT full_name FROM users WHERE id = ?').get(task.pending_approval_reviewer_id)
    : null
  const dept = task.department_id
    ? db.prepare('SELECT name FROM departments WHERE id = ?').get(task.department_id)
    : null
  const meeting = task.meeting_id
    ? db.prepare('SELECT title FROM meetings WHERE id = ?').get(task.meeting_id)
    : null

  return {
    ...task,
    creatorName: creator?.full_name || task.creator_id,
    assigneeName: assignee?.full_name || null,
    monitorName: monitor?.full_name || null,
    overseerName: overseer?.full_name || null,
    reviewerName: reviewer?.full_name || null,
    departmentName: dept?.name || null,
    meetingTitle: meeting?.title || null,
  }
}

function allDescendantsCompleted(taskId, db) {
  const children = db.prepare('SELECT id, status FROM tasks WHERE parent_task_id = ?').all(taskId)
  if (children.length === 0) return true
  return children.every((child) => {
    if (child.status !== 'COMPLETED') return false
    return allDescendantsCompleted(child.id, db)
  })
}

function isArchivedTask(task) {
  return Number(task?.archived ?? 0) === 1
}

function getRootTaskId(taskId, db) {
  let currentId = taskId
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = db.prepare('SELECT id, parent_task_id FROM tasks WHERE id = ?').get(currentId)
    if (!row || !row.parent_task_id) return currentId
    currentId = row.parent_task_id
  }
}

function collectSubtreeTaskIds(rootId, db) {
  const ids = []
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()
    if (!id) continue
    ids.push(id)
    const children = db.prepare('SELECT id FROM tasks WHERE parent_task_id = ?').all(id)
    for (const child of children) stack.push(child.id)
  }
  return ids
}

function subtreeReadyForArchive(rootId, db) {
  const root = db.prepare('SELECT status, archived FROM tasks WHERE id = ?').get(rootId)
  if (!root || isArchivedTask(root)) return false
  if (root.status !== 'COMPLETED') return false
  return allDescendantsCompleted(rootId, db)
}

function archiveSubtree(rootId, actorId, db) {
  const ids = collectSubtreeTaskIds(rootId, db)
  if (!ids.length) return

  const now = new Date().toISOString()
  const placeholders = ids.map(() => '?').join(',')

  db.prepare(`
    UPDATE tasks
    SET archived = 1,
        archived_at = ?,
        archived_by_id = ?,
        pending_approval_reviewer_id = NULL,
        approval_source = NULL,
        updated_at = datetime('now')
    WHERE id IN (${placeholders})
  `).run(now, actorId, ...ids)

  for (const id of ids) {
    addHistory(
      db,
      id,
      actorId,
      'COMPLETED',
      'COMPLETED',
      'Giám đốc chốt cây việc — chuyển lịch sử',
    )
  }
}

function getManagedDepts(db, userId) {
  const rows = db
    .prepare('SELECT department_id FROM vice_director_departments WHERE vice_director_id = ?')
    .all(userId)
  return rows.map((r) => r.department_id)
}

function getUserMeta(db, userId) {
  return db.prepare('SELECT id, role_id, dept_id FROM users WHERE id = ?').get(userId)
}

function canAssignByRole(assignerRole, assigneeRole) {
  return (roleRank[assignerRole] ?? 0) >= (roleRank[assigneeRole] ?? 0)
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

function listVisibleTasks(db, userId, userRole, myDeptId, opts = {}) {
  const { includeArchived = false, onlyArchived = false } = opts

  let rows = []

  if (userRole === 'r-director') {
    rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all()
  } else if (userRole === 'r-vice-director') {
    const managed = getManagedDepts(db, userId)
    const placeholders = managed.length > 0 ? managed.map(() => '?').join(',') : "'__none__'"
    rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE overseen_by_vice_director_id = ?
           OR creator_id = ?
           OR assignee_id = ?
           OR department_id IN (${placeholders})
        ORDER BY created_at DESC
      `)
      .all(userId, userId, userId, ...managed)
  } else if (userRole === 'r-dept-head') {
    rows = db
      .prepare(`
        SELECT * FROM tasks
        WHERE department_id = ? OR assignee_id = ? OR creator_id = ?
        ORDER BY created_at DESC
      `)
      .all(myDeptId || '__none__', userId, userId)
  } else {
    rows = db
      .prepare('SELECT * FROM tasks WHERE assignee_id = ? ORDER BY created_at DESC')
      .all(userId)
  }

  if (onlyArchived) {
    return rows.filter((r) => isArchivedTask(r))
  }

  if (includeArchived) return rows

  return rows.filter((r) => !isArchivedTask(r))
}

router.get('/', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req
  const me = getUserMeta(db, userId)
  const includeArchived = String(req.query.include_archived || '') === '1'
  const onlyArchived = String(req.query.only_archived || '') === '1'
  const tasks = listVisibleTasks(db, userId, userRole, me?.dept_id ?? null, {
    includeArchived,
    onlyArchived,
  })
  res.json(tasks.map(enrichTask))
})

router.get('/tree', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req
  const me = getUserMeta(db, userId)
  const visible = listVisibleTasks(db, userId, userRole, me?.dept_id ?? null, {
    includeArchived: false,
  }).map(enrichTask)

  const map = new Map(visible.map((t) => [t.id, { ...t, children: [] }]))
  const roots = []

  map.forEach((node) => {
    const parentKey = node.parent_task_id
    if (!parentKey || !map.has(parentKey)) {
      roots.push(node)
    } else {
      map.get(parentKey)?.children?.push(node)
    }
  })

  function sortTree(nodes) {
    nodes.sort((a, b) => a.title.localeCompare(b.title, 'vi'))
    nodes.forEach((n) => {
      if (n.children?.length) sortTree(n.children)
    })
  }

  sortTree(roots)
  res.json(roots)
})

router.get('/history', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req
  const me = getUserMeta(db, userId)
  const tasks = listVisibleTasks(db, userId, userRole, me?.dept_id ?? null, {
    onlyArchived: true,
  })
  res.json(tasks.map(enrichTask))
})

router.get('/:id', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  if (!task) return notFound(res, 'TASK_NOT_FOUND', 'Không tìm thấy công việc')

  const me = getUserMeta(db, userId)
  const managed = userRole === 'r-vice-director' ? getManagedDepts(db, userId) : []
  const visible = taskVisibleToUser(task, userId, userRole, managed, me?.dept_id ?? null)
  if (!visible) return forbidden(res, 'FORBIDDEN_TASK_VIEW', 'Bạn không có quyền xem công việc này')

  res.json(enrichTask(task))
})

router.post('/', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req
  const me = getUserMeta(db, userId)

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
  } = req.body

  if (!title || !deadline) {
    return badRequest(res, 'TASK_REQUIRED_FIELDS', 'Thiếu tiêu đề hoặc deadline')
  }

  if (userRole === 'r-staff') {
    return forbidden(res, 'FORBIDDEN_CREATE', 'Nhân viên không được tạo công việc')
  }

  if (parent_task_id) {
    const parent = db.prepare('SELECT id, deadline FROM tasks WHERE id = ?').get(parent_task_id)
    if (!parent) return badRequest(res, 'PARENT_TASK_NOT_FOUND', 'Công việc cha không tồn tại')
    if (new Date(deadline) > new Date(parent.deadline)) {
      return badRequest(res, 'DEADLINE_AFTER_PARENT', 'Hạn công việc con không được sau hạn công việc cha')
    }
  }

  let deptId = department_id || null
  if (!deptId && assignee_id) {
    const assignee = db.prepare('SELECT dept_id FROM users WHERE id = ?').get(assignee_id)
    deptId = assignee?.dept_id || null
  }
  if (!deptId) deptId = me?.dept_id || null

  const managedByMe = userRole === 'r-vice-director' ? getManagedDepts(db, userId) : []

  if (userRole === 'r-dept-head' && deptId !== me?.dept_id) {
    return forbidden(res, 'FORBIDDEN_DEPARTMENT', 'Trưởng khoa chỉ được tạo việc trong khoa của mình')
  }

  if (userRole === 'r-vice-director' && deptId && !managedByMe.includes(deptId)) {
    return forbidden(res, 'FORBIDDEN_DEPARTMENT_SCOPE', 'Phó giám đốc chỉ được tạo việc trong khoa được phân công')
  }

  if (assignee_id) {
    const assignee = db.prepare('SELECT id, role_id, dept_id FROM users WHERE id = ?').get(assignee_id)
    if (!assignee) return badRequest(res, 'ASSIGNEE_NOT_FOUND', 'Người được giao không tồn tại')

    if (!canAssignByRole(userRole, assignee.role_id)) {
      return forbidden(res, 'ASSIGN_OVER_LEVEL', 'Không được giao việc vượt cấp')
    }

    if (userRole === 'r-dept-head' && assignee.dept_id !== me?.dept_id) {
      return forbidden(res, 'ASSIGN_OUT_OF_DEPARTMENT', 'Trưởng khoa chỉ được giao việc trong khoa của mình')
    }
  }

  let overseerId = null
  if (userRole === 'r-vice-director') {
    overseerId = userId
  } else if (deptId) {
    const vice = db.prepare(`
      SELECT v.vice_director_id AS id
      FROM vice_director_departments v
      WHERE v.department_id = ?
      LIMIT 1
    `).get(deptId)
    overseerId = vice?.id || null
  }

  const extendedParts = []
  if (thuong_truc_id) extendedParts.push(`Thường trực: ${thuong_truc_id}`)
  if (bo_phan_phoi_hop_ids && bo_phan_phoi_hop_ids.length) {
    const deptNames = bo_phan_phoi_hop_ids
      .map((did) => db.prepare('SELECT name FROM departments WHERE id = ?').get(did)?.name || did)
      .join(', ')
    extendedParts.push(`Phối hợp: ${deptNames}`)
  }
  if (phuong_phap_lam) extendedParts.push(`Phương pháp: ${phuong_phap_lam}`)
  if (dukien_ket_qua) extendedParts.push(`Dự kiến kết quả: ${dukien_ket_qua}`)
  const extended_note = extendedParts.length > 0 ? extendedParts.join(' | ') : null

  const id = genId('t')
  db.prepare(`
    INSERT INTO tasks (
      id, meeting_id, parent_task_id, title, description, priority,
      creator_id, assignee_id, monitor_id, department_id,
      overseen_by_vice_director_id, assigned_by_id,
      pending_approval_reviewer_id, approval_source,
      deadline, status, report_summary, extended_note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', NULL, ?)
  `).run(
    id,
    meeting_id || null,
    parent_task_id || null,
    title,
    description || null,
    priority || 'MEDIUM',
    userId,
    assignee_id || null,
    monitor_id || null,
    deptId,
    overseerId,
    userId,
    null,
    null,
    deadline,
    extended_note,
  )

  const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  addHistory(db, id, userId, null, 'NEW', 'Tạo công việc')
  res.status(201).json(enrichTask(created))
})

router.patch('/:id', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)

  if (!task) return notFound(res, 'TASK_NOT_FOUND', 'Không tìm thấy công việc')
  if (isArchivedTask(task)) {
    return badRequest(res, 'TASK_ARCHIVED', 'Công việc đã lưu lịch sử, không thể chỉnh sửa')
  }

  const me = getUserMeta(db, userId)
  const managed = userRole === 'r-vice-director' ? getManagedDepts(db, userId) : []
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
    const parent = db.prepare('SELECT deadline FROM tasks WHERE id = ?').get(patch.parent_task_id)
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

    if (patch.status === 'COMPLETED' && !allDescendantsCompleted(req.params.id, db)) {
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
    updates.push(`${dbField} = ?`)
    values.push(val)
  })

  if (patch.extended_note !== undefined) {
    updates.push('extended_note = ?')
    values.push(patch.extended_note)
  }

  if (patch.status === 'COMPLETED') {
    updates.push('completed_at = ?')
    values.push(new Date().toISOString())
  }

  if (patch.status === 'IN_PROGRESS' && task.status === 'NEW') {
    updates.push('started_at = ?')
    values.push(new Date().toISOString())
  }

  if (updates.length === 0) {
    return badRequest(res, 'NO_FIELDS_TO_UPDATE', 'Không có trường hợp lệ để cập nhật')
  }

  updates.push("updated_at = datetime('now')")
  values.push(req.params.id)
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  addHistory(
    db,
    req.params.id,
    userId,
    task.status,
    patch.status || task.status,
    patch.comment || null,
  )

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  res.json(enrichTask(updated))
})

router.post('/:id/report', authenticate, (req, res) => {
  const db = getDb()
  const { userId } = req
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)

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

  const summary = req.body.summary || ''
  const reviewerId = task.assigned_by_id || task.creator_id

  db.prepare(`
    UPDATE tasks
    SET status = 'PENDING_APPROVAL',
        report_summary = ?,
        pending_approval_reviewer_id = ?,
        approval_source = 'assigner_report',
        last_rejection_reason = NULL,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(summary, reviewerId, req.params.id)

  addHistory(db, req.params.id, userId, task.status, 'PENDING_APPROVAL', `Báo cáo: ${summary}`)
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  res.json(enrichTask(updated))
})

router.post('/:id/approve', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)

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

  const { approve, rejection_reason } = req.body

  if (approve) {
    if (!allDescendantsCompleted(req.params.id, db)) {
      return badRequest(res, 'CHILDREN_NOT_DONE', 'Cần hoàn thành toàn bộ công việc con trước')
    }

    db.prepare(`
      UPDATE tasks
      SET status = 'COMPLETED',
          completed_at = ?,
          pending_approval_reviewer_id = NULL,
          approval_source = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(new Date().toISOString(), req.params.id)

    addHistory(db, req.params.id, userId, 'PENDING_APPROVAL', 'COMPLETED', 'Duyệt hoàn thành')

    if (userRole === 'r-director') {
      const rootId = getRootTaskId(req.params.id, db)
      if (subtreeReadyForArchive(rootId, db)) {
        archiveSubtree(rootId, userId, db)
      }
    }
  } else {
    db.prepare(`
      UPDATE tasks
      SET status = 'IN_PROGRESS',
          last_rejection_reason = ?,
          pending_approval_reviewer_id = NULL,
          approval_source = NULL,
          report_summary = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(rejection_reason || 'Bị từ chối', req.params.id)

    addHistory(
      db,
      req.params.id,
      userId,
      'PENDING_APPROVAL',
      'IN_PROGRESS',
      rejection_reason || 'Bị từ chối',
    )
  }

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  res.json(enrichTask(updated))
})

router.post('/:id/assign', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)

  if (!task) return notFound(res, 'TASK_NOT_FOUND', 'Không tìm thấy công việc')
  if (isArchivedTask(task)) {
    return badRequest(res, 'TASK_ARCHIVED', 'Công việc đã lưu lịch sử, không thể chỉnh sửa')
  }

  const me = getUserMeta(db, userId)
  const managed = userRole === 'r-vice-director' ? getManagedDepts(db, userId) : []
  const canManage = canManageTask(task, userId, userRole, managed, me?.dept_id ?? null)
  if (!canManage) {
    return forbidden(res, 'FORBIDDEN_ASSIGN', 'Bạn không có quyền giao lại công việc này')
  }

  const { assignee_id } = req.body

  if (assignee_id) {
    const assignee = db.prepare('SELECT id, role_id, dept_id FROM users WHERE id = ?').get(assignee_id)
    if (!assignee) return badRequest(res, 'ASSIGNEE_NOT_FOUND', 'Người được giao không tồn tại')

    if (!canAssignByRole(userRole, assignee.role_id)) {
      return forbidden(res, 'ASSIGN_OVER_LEVEL', 'Không được giao việc vượt cấp')
    }

    if (userRole === 'r-dept-head' && assignee.dept_id !== me?.dept_id) {
      return forbidden(res, 'ASSIGN_OUT_OF_DEPARTMENT', 'Trưởng khoa chỉ được giao việc trong khoa của mình')
    }

    if (task.department_id && assignee.dept_id && userRole !== 'r-director') {
      if (assignee.dept_id !== task.department_id) {
        return forbidden(res, 'ASSIGN_DIFFERENT_DEPARTMENT', 'Người được giao cần thuộc cùng khoa với công việc')
      }
    }
  }

  db.prepare(`
    UPDATE tasks
    SET assignee_id = ?, assigned_by_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(assignee_id || null, userId, req.params.id)

  addHistory(db, req.params.id, userId, task.assignee_id, assignee_id || null, 'Giao lại việc')
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  res.json(enrichTask(updated))
})

export default router
