import { Router } from 'express'
import { getDb, genId } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { badRequest, forbidden, notFound } from '../lib/http.js'

const router = Router()

function getManagedDepts(db, userId) {
  const rows = db
    .prepare('SELECT department_id FROM vice_director_departments WHERE vice_director_id = ?')
    .all(userId)
  return rows.map((r) => r.department_id)
}

function getUserMeta(db, userId) {
  return db.prepare('SELECT id, role_id, dept_id FROM users WHERE id = ?').get(userId)
}

function meetingVisibleToUser(userId, userRole, m, db) {
  if (userRole === 'r-director') return true

  if (userRole === 'r-vice-director') {
    if (m.department_id == null) return true

    const managed = db
      .prepare(
        'SELECT 1 FROM vice_director_departments WHERE vice_director_id = ? AND department_id = ?',
      )
      .get(userId, m.department_id)

    if (managed) return true
    if (m.created_by_id === userId) return true
    if (m.secretary_id === userId) return true
    if (m.chairperson_id === userId) return true

    const attendee = db
      .prepare('SELECT 1 FROM meeting_attendees WHERE meeting_id = ? AND user_id = ?')
      .get(m.id, userId)
    return !!attendee
  }

  if (userRole === 'r-dept-head') {
    const me = db.prepare('SELECT dept_id FROM users WHERE id = ?').get(userId)
    // Thấy meeting của khoa mình hoặc toàn viện (department_id = null)
    if (m.department_id === me?.dept_id || m.department_id == null) return true
    if (m.chairperson_id === userId) return true
    if (m.secretary_id === userId) return true

    const attendee = db
      .prepare('SELECT 1 FROM meeting_attendees WHERE meeting_id = ? AND user_id = ?')
      .get(m.id, userId)
    return !!attendee
  }

  if (m.secretary_id === userId) return true
  if (m.chairperson_id === userId) return true

  const attendee = db
    .prepare('SELECT 1 FROM meeting_attendees WHERE meeting_id = ? AND user_id = ?')
    .get(m.id, userId)
  return !!attendee
}

function canEditMeeting(m, userId, userRole, managedDepts, myDeptId) {
  if (m.status === 'approved') return false
  if (userRole === 'r-director') return true
  if (m.secretary_id === userId || m.chairperson_id === userId) return true

  if (userRole === 'r-vice-director') {
    return m.department_id == null || managedDepts.includes(m.department_id)
  }

  if (userRole === 'r-dept-head') {
    return !!myDeptId && m.department_id === myDeptId
  }

  return false
}

function enrichMeeting(m, db) {
  const attendees = db
    .prepare(
      'SELECT u.id, u.full_name FROM meeting_attendees ma JOIN users u ON u.id = ma.user_id WHERE ma.meeting_id = ?',
    )
    .all(m.id)
  const minutes = db.prepare('SELECT * FROM meeting_minutes WHERE meeting_id = ?').get(m.id)
  return {
    ...m,
    attendeeIds: attendees.map((a) => a.id),
    attendees,
    minutes: minutes || {},
  }
}

router.get('/', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req

  const meetings = db
    .prepare(`
      SELECT m.*, u1.full_name as chairperson_name, u2.full_name as secretary_name,
             d.name as dept_name
      FROM meetings m
      LEFT JOIN users u1 ON m.chairperson_id = u1.id
      LEFT JOIN users u2 ON m.secretary_id = u2.id
      LEFT JOIN departments d ON m.department_id = d.id
      ORDER BY m.meeting_date DESC
    `)
    .all()

  const visible = meetings.filter((m) => meetingVisibleToUser(userId, userRole, m, db))
  res.json(visible.map((m) => enrichMeeting(m, db)))
})

router.get('/:id', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req

  const m = db
    .prepare(`
      SELECT m.*, u1.full_name as chairperson_name, u2.full_name as secretary_name
      FROM meetings m
      LEFT JOIN users u1 ON m.chairperson_id = u1.id
      LEFT JOIN users u2 ON m.secretary_id = u2.id
      WHERE m.id = ?
    `)
    .get(req.params.id)

  if (!m) return notFound(res, 'MEETING_NOT_FOUND', 'Không tìm thấy cuộc họp')

  if (!meetingVisibleToUser(userId, userRole, m, db)) {
    return forbidden(res, 'FORBIDDEN_MEETING_VIEW', 'Không có quyền xem cuộc họp này')
  }

  res.json(enrichMeeting(m, db))
})

router.post('/', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req

  if (userRole !== 'r-director' && userRole !== 'r-vice-director') {
    return forbidden(res, 'FORBIDDEN_SCHEDULE', 'Chỉ Giám đốc/Phó Giám đốc được tạo lịch')
  }

  const {
    title,
    document_number,
    document_place,
    document_day,
    document_month,
    document_year,
    meeting_date,
    start_time,
    end_time,
    location,
    chairperson_id,
    secretary_id,
    department_id,
    attendee_ids,
  } = req.body

  if (!title || !meeting_date) {
    return badRequest(res, 'MEETING_REQUIRED_FIELDS', 'Thiếu tiêu đề hoặc ngày họp')
  }

  if (!secretary_id) {
    return badRequest(res, 'NO_SECRETARY', 'Cần chọn thư ký cuộc họp')
  }

  if (userRole === 'r-vice-director' && department_id) {
    const managed = getManagedDepts(db, userId)
    if (!managed.includes(department_id)) {
      return forbidden(
        res,
        'FORBIDDEN_MEETING_DEPARTMENT_SCOPE',
        'Phó giám đốc chỉ được tạo lịch cho khoa phụ trách hoặc toàn viện',
      )
    }
  }

  const id = genId('m')

  db.prepare(`
    INSERT INTO meetings (
      id, title, document_number, document_place, document_day, document_month, document_year,
      meeting_date, start_time, end_time, location,
      chairperson_id, secretary_id, department_id, status, created_by_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
  `).run(
    id,
    title,
    document_number || null,
    document_place || null,
    document_day || null,
    document_month || null,
    document_year || null,
    meeting_date,
    start_time || null,
    end_time || null,
    location || null,
    chairperson_id || userId,
    secretary_id,
    department_id || null,
    userId,
  )

  if (Array.isArray(attendee_ids)) {
    const insertAttendee = db.prepare(
      'INSERT OR IGNORE INTO meeting_attendees (meeting_id, user_id) VALUES (?, ?)',
    )
    attendee_ids.forEach((uid) => insertAttendee.run(id, uid))
  }

  db.prepare('INSERT INTO meeting_minutes (id, meeting_id) VALUES (?, ?)').run(genId('mm'), id)

  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id)
  res.status(201).json(enrichMeeting(meeting, db))
})

router.patch('/:id', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req
  const m = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id)

  if (!m) return notFound(res, 'MEETING_NOT_FOUND', 'Không tìm thấy cuộc họp')

  const me = getUserMeta(db, userId)
  const managed = userRole === 'r-vice-director' ? getManagedDepts(db, userId) : []

  if (!canEditMeeting(m, userId, userRole, managed, me?.dept_id ?? null)) {
    if (m.status === 'approved') {
      return badRequest(res, 'MEETING_ALREADY_APPROVED', 'Biên bản đã duyệt, không thể chỉnh sửa')
    }
    return forbidden(res, 'FORBIDDEN_EDIT', 'Bạn không có quyền sửa biên bản này')
  }

  const {
    title,
    document_number,
    document_place,
    document_day,
    document_month,
    document_year,
    meeting_date,
    start_time,
    end_time,
    location,
    chairperson_id,
    secretary_id,
    department_id,
    attendee_ids,
    content_raw,
    conclusion,
    minutes,
  } = req.body

  if (userRole === 'r-vice-director' && department_id) {
    const managedDepts = getManagedDepts(db, userId)
    if (!managedDepts.includes(department_id)) {
      return forbidden(
        res,
        'FORBIDDEN_MEETING_DEPARTMENT_SCOPE',
        'Phó giám đốc chỉ được thao tác với khoa phụ trách hoặc toàn viện',
      )
    }
  }

  const updates = []
  const values = []

  const topFields = [
    ['title', title],
    ['document_number', document_number],
    ['document_place', document_place],
    ['document_day', document_day],
    ['document_month', document_month],
    ['document_year', document_year],
    ['meeting_date', meeting_date],
    ['start_time', start_time],
    ['end_time', end_time],
    ['location', location],
    ['chairperson_id', chairperson_id],
    ['secretary_id', secretary_id],
    ['department_id', department_id],
    ['content_raw', content_raw],
    ['conclusion', conclusion],
  ]

  topFields.forEach(([field, val]) => {
    if (val !== undefined) {
      updates.push(`${field} = ?`)
      values.push(val)
    }
  })

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')")
    values.push(req.params.id)
    db.prepare(`UPDATE meetings SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  }

  if (attendee_ids !== undefined) {
    if (!Array.isArray(attendee_ids)) {
      return badRequest(res, 'ATTENDEE_IDS_INVALID', 'Danh sách người tham dự không hợp lệ')
    }

    db.prepare('DELETE FROM meeting_attendees WHERE meeting_id = ?').run(req.params.id)
    const insertAttendee = db.prepare(
      'INSERT OR IGNORE INTO meeting_attendees (meeting_id, user_id) VALUES (?, ?)',
    )
    attendee_ids.forEach((uid) => insertAttendee.run(req.params.id, uid))
  }

  if (minutes && typeof minutes === 'object') {
    const minuteFieldMap = {
      matter: 'matter',
      adminTimeStartNote: 'admin_time_start',
      adminTimeEndNote: 'admin_time_end',
      adminLocation: 'admin_location',
      adminChairDisplayName: 'admin_chair_name',
      adminChairPosition: 'admin_chair_position',
      adminSecretaryDisplayName: 'admin_secretary_name',
      adminSecretaryPosition: 'admin_secretary_position',
      adminAttendeesNote: 'admin_attendees',
      adminAbsentNote: 'admin_absent',
      sectionI_leadershipShift: 'section_I_leadership',
      sectionII_shiftComposition: 'section_II_shift',
      sectionII_oldPatientCount: 'section_II_old_patient',
      sectionII_admittedInShift: 'section_II_admitted',
      sectionII_leftInShift: 'section_II_left',
      sectionII_currentPatientCount: 'section_II_current',
      sectionII_2a_admissions: 'section_II_2a',
      sectionII_2b_deaths: 'section_II_2b_deaths',
      sectionII_2b_transfers: 'section_II_2b_transfers',
      sectionII_2b_discharges: 'section_II_2b_discharges',
      sectionII_2c_abnormal: 'section_II_2c_abnormal',
      sectionII_2c_suggestions: 'section_II_2c_suggestions',
      sectionIII_paraclinical: 'section_III_paraclinical',
      sectionIV_adminSecurity: 'section_IV_admin_security',
      sectionV_unitDiscussion: 'section_V_unit_discussion',
      chairConclusionProfessional: 'chair_conclusion_professional',
      chairConclusionLogistics: 'chair_conclusion_logistics',
      chairConclusionLevel1Care: 'chair_conclusion_level1_care',
      chairConclusionPriorityWork: 'chair_conclusion_priority',
    }

    const minuteUpdates = []
    const minuteValues = []

    Object.entries(minutes).forEach(([feKey, val]) => {
      const dbField = minuteFieldMap[feKey]
      if (dbField !== undefined && val !== undefined) {
        minuteUpdates.push(`${dbField} = ?`)
        minuteValues.push(String(val))
      }
    })

    if (minuteUpdates.length > 0) {
      minuteValues.push(req.params.id)
      db.prepare(
        `UPDATE meeting_minutes SET ${minuteUpdates.join(', ')} WHERE meeting_id = ?`,
      ).run(...minuteValues)
    }
  }

  const updated = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id)
  res.json(enrichMeeting(updated, db))
})

router.post('/:id/approve', authenticate, (req, res) => {
  const db = getDb()
  const { userId, userRole } = req
  const m = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id)

  if (!m) return notFound(res, 'MEETING_NOT_FOUND', 'Không tìm thấy cuộc họp')

  if (userRole !== 'r-director') {
    return forbidden(res, 'FORBIDDEN_APPROVE', 'Chỉ Giám đốc được duyệt biên bản')
  }

  if (m.status === 'approved') {
    return badRequest(res, 'MEETING_ALREADY_APPROVED', 'Biên bản đã được duyệt trước đó')
  }

  db.prepare(`
    UPDATE meetings
    SET status = 'approved',
        approved_at = datetime('now'),
        approved_by_id = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(userId, req.params.id)

  const updated = db.prepare('SELECT * FROM meetings WHERE id = ?').get(req.params.id)
  res.json(enrichMeeting(updated, db))
})

export default router
