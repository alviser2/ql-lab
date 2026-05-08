import { Router } from 'express'
import { genId, query, withTransaction } from '../db.js'
import { authenticate } from '../middleware/auth.js'
import { badRequest, forbidden, notFound } from '../lib/http.js'
import { asyncHandler } from '../lib/async.js'

const router = Router()

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
  sectionI_leadershipShift: 'section_i_leadership',
  sectionII_shiftComposition: 'section_ii_shift',
  sectionII_oldPatientCount: 'section_ii_old_patient',
  sectionII_admittedInShift: 'section_ii_admitted',
  sectionII_leftInShift: 'section_ii_left',
  sectionII_currentPatientCount: 'section_ii_current',
  sectionII_2a_admissions: 'section_ii_2a',
  sectionII_2b_deaths: 'section_ii_2b_deaths',
  sectionII_2b_transfers: 'section_ii_2b_transfers',
  sectionII_2b_discharges: 'section_ii_2b_discharges',
  sectionII_2c_abnormal: 'section_ii_2c_abnormal',
  sectionII_2c_suggestions: 'section_ii_2c_suggestions',
  sectionIII_paraclinical: 'section_iii_paraclinical',
  sectionIV_adminSecurity: 'section_iv_admin_security',
  sectionV_unitDiscussion: 'section_v_unit_discussion',
  chairConclusionProfessional: 'chair_conclusion_professional',
  chairConclusionLogistics: 'chair_conclusion_logistics',
  chairConclusionLevel1Care: 'chair_conclusion_level1_care',
  chairConclusionPriorityWork: 'chair_conclusion_priority',
}

async function getManagedDepts(userId) {
  const { rows } = await query(
    'select department_id from vice_director_departments where vice_director_id = $1',
    [userId],
  )
  return rows.map((r) => r.department_id)
}

async function meetingVisibleToUser(userId, userRole, meeting) {
  if (userRole === 'r-director') return true

  if (userRole === 'r-vice-director') {
    if (meeting.department_id == null) return true

    const managed = await query(
      'select 1 from vice_director_departments where vice_director_id = $1 and department_id = $2 limit 1',
      [userId, meeting.department_id],
    )
    if (managed.rowCount > 0) return true

    if (meeting.created_by_id === userId) return true
    if (meeting.secretary_id === userId) return true
    if (meeting.chairperson_id === userId) return true

    const attendee = await query(
      'select 1 from meeting_attendees where meeting_id = $1 and user_id = $2 limit 1',
      [meeting.id, userId],
    )
    return attendee.rowCount > 0
  }

  if (userRole === 'r-dept-head') {
    const meRs = await query('select dept_id from users where id = $1 limit 1', [userId])
    const myDeptId = meRs.rows[0]?.dept_id ?? null

    if (meeting.department_id === myDeptId || meeting.department_id == null) return true
    if (meeting.chairperson_id === userId) return true
    if (meeting.secretary_id === userId) return true

    const attendee = await query(
      'select 1 from meeting_attendees where meeting_id = $1 and user_id = $2 limit 1',
      [meeting.id, userId],
    )
    return attendee.rowCount > 0
  }

  if (meeting.secretary_id === userId) return true
  if (meeting.chairperson_id === userId) return true

  const attendee = await query(
    'select 1 from meeting_attendees where meeting_id = $1 and user_id = $2 limit 1',
    [meeting.id, userId],
  )
  return attendee.rowCount > 0
}

function canEditMeeting(meeting, userId, userRole, managedDepts, myDeptId) {
  if (meeting.status === 'approved') return false
  if (userRole === 'r-director') return true
  if (meeting.secretary_id === userId || meeting.chairperson_id === userId) return true

  if (userRole === 'r-vice-director') {
    return meeting.department_id == null || managedDepts.includes(meeting.department_id)
  }

  if (userRole === 'r-dept-head') {
    return !!myDeptId && meeting.department_id === myDeptId
  }

  return false
}

async function enrichMeeting(meeting) {
  const attendeesRs = await query(
    `
      select u.id, u.full_name
      from meeting_attendees ma
      join users u on u.id = ma.user_id
      where ma.meeting_id = $1
      order by u.full_name asc
    `,
    [meeting.id],
  )

  const minutesRs = await query(
    'select * from meeting_minutes where meeting_id = $1 limit 1',
    [meeting.id],
  )

  return {
    ...meeting,
    attendeeIds: attendeesRs.rows.map((r) => r.id),
    attendees: attendeesRs.rows,
    minutes: minutesRs.rows[0] || {},
  }
}

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req

    const { rows } = await query(
      `
      select
        m.*,
        u1.full_name as chairperson_name,
        u2.full_name as secretary_name,
        d.name as dept_name
      from meetings m
      left join users u1 on m.chairperson_id = u1.id
      left join users u2 on m.secretary_id = u2.id
      left join departments d on m.department_id = d.id
      order by m.meeting_date desc
    `,
    )

    const visible = []
    for (const m of rows) {
      // eslint-disable-next-line no-await-in-loop
      if (await meetingVisibleToUser(userId, userRole, m)) visible.push(m)
    }

    const out = []
    for (const m of visible) {
      // eslint-disable-next-line no-await-in-loop
      out.push(await enrichMeeting(m))
    }

    res.json(out)
  }),
)

router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req

    const { rows } = await query(
      `
      select
        m.*,
        u1.full_name as chairperson_name,
        u2.full_name as secretary_name
      from meetings m
      left join users u1 on m.chairperson_id = u1.id
      left join users u2 on m.secretary_id = u2.id
      where m.id = $1
      limit 1
    `,
      [req.params.id],
    )

    const meeting = rows[0]
    if (!meeting) return notFound(res, 'MEETING_NOT_FOUND', 'Không tìm thấy cuộc họp')

    if (!(await meetingVisibleToUser(userId, userRole, meeting))) {
      return forbidden(res, 'FORBIDDEN_MEETING_VIEW', 'Không có quyền xem cuộc họp này')
    }

    res.json(await enrichMeeting(meeting))
  }),
)

router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req

    if (userRole !== 'r-director' && userRole !== 'r-vice-director') {
      return forbidden(res, 'FORBIDDEN_SCHEDULE', 'Chỉ Trưởng lab/Thường trực (Key Member) được tạo lịch')
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
    } = req.body || {}

    if (!title || !meeting_date) {
      return badRequest(res, 'MEETING_REQUIRED_FIELDS', 'Thiếu tiêu đề hoặc ngày họp')
    }

    if (!secretary_id) {
      return badRequest(res, 'NO_SECRETARY', 'Cần chọn thư ký cuộc họp')
    }

    if (userRole === 'r-vice-director' && department_id) {
      const managed = await getManagedDepts(userId)
      if (!managed.includes(department_id)) {
        return forbidden(
          res,
          'FORBIDDEN_MEETING_DEPARTMENT_SCOPE',
          'Thường trực (Key Member) chỉ được tạo lịch cho dự án phụ trách hoặc toàn viện',
        )
      }
    }

    const id = genId('m')
    await withTransaction(async (client) => {
      await client.query(
        `
          insert into meetings (
            id, title, document_number, document_place, document_day, document_month, document_year,
            meeting_date, start_time, end_time, location,
            chairperson_id, secretary_id, department_id, status, created_by_id
          )
          values (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11,
            $12, $13, $14, 'draft', $15
          )
        `,
        [
          id,
          title,
          document_number ?? null,
          document_place ?? null,
          document_day ?? null,
          document_month ?? null,
          document_year ?? null,
          meeting_date,
          start_time ?? null,
          end_time ?? null,
          location ?? null,
          chairperson_id || userId,
          secretary_id,
          department_id || null,
          userId,
        ],
      )

      if (Array.isArray(attendee_ids) && attendee_ids.length > 0) {
        for (const uid of attendee_ids) {
          // eslint-disable-next-line no-await-in-loop
          await client.query(
            `insert into meeting_attendees (meeting_id, user_id)
             values ($1, $2)
             on conflict (meeting_id, user_id) do nothing`,
            [id, uid],
          )
        }
      }

      await client.query('insert into meeting_minutes (id, meeting_id) values ($1, $2)', [
        genId('mm'),
        id,
      ])
    })

    const createdRs = await query('select * from meetings where id = $1 limit 1', [id])
    res.status(201).json(await enrichMeeting(createdRs.rows[0]))
  }),
)

router.patch(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req

    const meetingRs = await query('select * from meetings where id = $1 limit 1', [req.params.id])
    const meeting = meetingRs.rows[0]
    if (!meeting) return notFound(res, 'MEETING_NOT_FOUND', 'Không tìm thấy cuộc họp')

    const meRs = await query('select id, role_id, dept_id from users where id = $1 limit 1', [userId])
    const me = meRs.rows[0]

    const managed = userRole === 'r-vice-director' ? await getManagedDepts(userId) : []
    if (!canEditMeeting(meeting, userId, userRole, managed, me?.dept_id ?? null)) {
      if (meeting.status === 'approved') {
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
    } = req.body || {}

    if (userRole === 'r-vice-director' && department_id) {
      const managedDepts = await getManagedDepts(userId)
      if (!managedDepts.includes(department_id)) {
        return forbidden(
          res,
          'FORBIDDEN_MEETING_DEPARTMENT_SCOPE',
          'Thường trực (Key Member) chỉ được thao tác với dự án phụ trách hoặc toàn viện',
        )
      }
    }

    await withTransaction(async (client) => {
      const topMap = {
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
        content_raw,
        conclusion,
      }

      const topFields = []
      const topValues = []
      Object.entries(topMap).forEach(([k, v]) => {
        if (v !== undefined) {
          topFields.push(k)
          topValues.push(v)
        }
      })

      if (topFields.length > 0) {
        const setSql = topFields.map((k, i) => `${k} = $${i + 1}`).join(', ')
        await client.query(
          `update meetings set ${setSql}, updated_at = now() where id = $${topFields.length + 1}`,
          [...topValues, req.params.id],
        )
      }

      if (attendee_ids !== undefined) {
        if (!Array.isArray(attendee_ids)) {
          throw new Error('ATTENDEE_IDS_INVALID')
        }

        await client.query('delete from meeting_attendees where meeting_id = $1', [req.params.id])

        for (const uid of attendee_ids) {
          // eslint-disable-next-line no-await-in-loop
          await client.query(
            `insert into meeting_attendees (meeting_id, user_id)
             values ($1, $2)
             on conflict (meeting_id, user_id) do nothing`,
            [req.params.id, uid],
          )
        }
      }

      if (minutes && typeof minutes === 'object') {
        const minuteUpdates = []
        const minuteValues = []

        Object.entries(minutes).forEach(([feKey, val]) => {
          const dbField = minuteFieldMap[feKey]
          if (dbField !== undefined && val !== undefined) {
            minuteUpdates.push(`${dbField} = $${minuteValues.length + 1}`)
            minuteValues.push(String(val))
          }
        })

        if (minuteUpdates.length > 0) {
          await client.query(
            `update meeting_minutes
             set ${minuteUpdates.join(', ')}, updated_at = now()
             where meeting_id = $${minuteValues.length + 1}`,
            [...minuteValues, req.params.id],
          )
        }
      }
    })

    const updatedRs = await query('select * from meetings where id = $1 limit 1', [req.params.id])
    res.json(await enrichMeeting(updatedRs.rows[0]))
  }),
)

router.post(
  '/:id/approve',
  authenticate,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = req
    const rs = await query('select * from meetings where id = $1 limit 1', [req.params.id])
    const meeting = rs.rows[0]

    if (!meeting) return notFound(res, 'MEETING_NOT_FOUND', 'Không tìm thấy cuộc họp')

    if (userRole !== 'r-director') {
      return forbidden(res, 'FORBIDDEN_APPROVE', 'Chỉ Trưởng lab được duyệt biên bản')
    }

    if (meeting.status === 'approved') {
      return badRequest(res, 'MEETING_ALREADY_APPROVED', 'Biên bản đã được duyệt trước đó')
    }

    await query(
      `
      update meetings
      set status = 'approved', approved_by_id = $1, approved_at = now(), updated_at = now()
      where id = $2
    `,
      [userId, req.params.id],
    )

    const updatedRs = await query('select * from meetings where id = $1 limit 1', [req.params.id])
    res.json(await enrichMeeting(updatedRs.rows[0]))
  }),
)

export default router
