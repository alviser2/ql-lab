import './server/db.js'
import { getDb } from './server/db.js'

const db = getDb()

const login = async (u, p) => {
  const r = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`login ${u} failed: ${JSON.stringify(j)}`)
  return j.token
}

const req = async (token, method, path, body) => {
  const r = await fetch(`http://localhost:3001/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: r.status, body: json }
}

const run = async () => {
  const director = await login('director', '123456')
  const vice = await login('vicedir', '123456')
  const head = await login('tk_noi', '123456')
  const staff = await login('nv_trang', '123456')

  const now = Date.now()
  const p = (d) => new Date(now + d * 86400000).toISOString()

  const created = await req(director, 'POST', '/tasks', {
    title: 'SMOKE_PARENT_' + now,
    department_id: 'd-nt',
    assignee_id: 'u-tk-noi',
    deadline: p(10),
    priority: 'MEDIUM',
  })

  if (created.status !== 201) {
    console.log('FAIL create parent', created)
    process.exit(1)
  }

  const parentId = created.body.id

  const child = await req(head, 'POST', '/tasks', {
    title: 'SMOKE_CHILD_' + now,
    parent_task_id: parentId,
    department_id: 'd-nt',
    assignee_id: 'u-nv-trang',
    deadline: p(5),
    priority: 'MEDIUM',
  })

  if (child.status !== 201) {
    console.log('FAIL create child', child)
    process.exit(1)
  }

  const childId = child.body.id

  const staffAssignForbidden = await req(staff, 'POST', `/tasks/${childId}/assign`, {
    assignee_id: 'u-nv-huy',
  })

  const staffPatchForbidden = await req(staff, 'PATCH', `/tasks/${childId}`, {
    title: 'ILLEGAL_PATCH',
  })

  const reportByAssignee = await req(staff, 'POST', `/tasks/${childId}/report`, {
    summary: 'Đã hoàn thành bước 1',
  })

  const approveByWrongReviewer = await req(vice, 'POST', `/tasks/${childId}/approve`, {
    approve: true,
  })

  const approveByAssigner = await req(head, 'POST', `/tasks/${childId}/approve`, {
    approve: true,
  })

  const createMeetingByHead = await req(head, 'POST', '/meetings', {
    title: 'ILLEGAL_MEETING_' + now,
    meeting_date: p(1),
    secretary_id: 'u-nv-huy',
  })

  const createMeetingByVice = await req(vice, 'POST', '/meetings', {
    title: 'SMOKE_MEETING_' + now,
    meeting_date: p(2),
    secretary_id: 'u-nv-huy',
    department_id: 'd-nt',
    chairperson_id: 'u-vicedir',
    attendee_ids: ['u-tk-noi'],
  })

  if (createMeetingByVice.status !== 201) {
    console.log('FAIL vice create meeting', createMeetingByVice)
    process.exit(1)
  }

  const meetingId = createMeetingByVice.body.id

  const approveByViceForbidden = await req(vice, 'POST', `/meetings/${meetingId}/approve`, {})
  const approveByDirectorOk = await req(director, 'POST', `/meetings/${meetingId}/approve`, {})

  const summary = {
    staffAssignForbidden,
    staffPatchForbidden,
    reportByAssignee,
    approveByWrongReviewer,
    approveByAssigner,
    createMeetingByHead,
    approveByViceForbidden,
    approveByDirectorOk,
  }

  console.log(JSON.stringify(summary, null, 2))

  const checks = [
    staffAssignForbidden.status === 403 && staffAssignForbidden.body?.code === 'FORBIDDEN_ASSIGN',
    staffPatchForbidden.status === 403 && ['FORBIDDEN_ASSIGNEE_PATCH_SCOPE', 'FORBIDDEN_TASK_EDIT'].includes(staffPatchForbidden.body?.code),
    reportByAssignee.status === 200,
    approveByWrongReviewer.status === 403 && approveByWrongReviewer.body?.code === 'FORBIDDEN_NOT_REVIEWER',
    approveByAssigner.status === 200,
    createMeetingByHead.status === 403 && createMeetingByHead.body?.code === 'FORBIDDEN_SCHEDULE',
    approveByViceForbidden.status === 403 && approveByViceForbidden.body?.code === 'FORBIDDEN_APPROVE',
    approveByDirectorOk.status === 200,
  ]

  if (checks.every(Boolean)) {
    console.log('SMOKE_OK')
    process.exit(0)
  }

  console.log('SMOKE_FAIL')
  process.exit(1)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
