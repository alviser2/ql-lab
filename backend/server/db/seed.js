import bcrypt from 'bcrypt'
import { getDb, genId } from '../db.js'

export function seed() {
  const db = getDb()

  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as c FROM departments').get()
  if (existing.c > 0) {
    console.log('[seed] Database already seeded, skipping.')
    return
  }

  console.log('[seed] Seeding database...')

  // ── Departments ───────────────────────────────────────
  const depts = [
    { id: 'd-nt', name: 'Nội tổng hợp', code: 'NOI_TONG_HOP', type: 'LAM_SANG' },
    { id: 'd-nct', name: 'Ngoại chấn thương', code: 'NGOAI_CHAN_THUONG', type: 'LAM_SANG' },
    { id: 'd-hscc', name: 'Hồi sức cấp cứu', code: 'HOI_SUC_CAP_CUU', type: 'LAM_SANG' },
    { id: 'd-cls', name: 'Cận lâm sàng', code: 'CAN_LAM_SANG', type: 'CAN_LAM_SANG' },
    { id: 'd-hc', name: 'Hành chính tổng hợp', code: 'HANH_CHINH', type: 'HANH_CHINH' },
  ]
  const insertDept = db.prepare('INSERT INTO departments (id,name,code,type) VALUES (?,?,?,?)')
  depts.forEach(d => insertDept.run(d.id, d.name, d.code, d.type))

  // ── Roles ──────────────────────────────────────────────
  const roles = [
    { id: 'r-director', role_name: 'Giám đốc', level: 4 },
    { id: 'r-vice-director', role_name: 'Phó Giám đốc', level: 3 },
    { id: 'r-dept-head', role_name: 'Trưởng/Phó Khoa', level: 2 },
    { id: 'r-staff', role_name: 'Nhân viên', level: 1 },
  ]
  const insertRole = db.prepare('INSERT INTO roles (id,role_name,level) VALUES (?,?,?)')
  roles.forEach(r => insertRole.run(r.id, r.role_name, r.level))

  const hash = bcrypt.hashSync('123456', 10)

  // ── Users ──────────────────────────────────────────────
  const users = [
    { id: 'u-director', full_name: 'Nguyễn Văn An', username: 'director', role_id: 'r-director', dept_id: null, manager_id: null },
    { id: 'u-vicedir',  full_name: 'Trần Thị Oanh', username: 'vicedir',  role_id: 'r-vice-director', dept_id: null, manager_id: 'u-director' },
    { id: 'u-tk-noi',   full_name: 'Lê Minh Hoàng', username: 'tk_noi',   role_id: 'r-dept-head', dept_id: 'd-nt', manager_id: 'u-vicedir' },
    { id: 'u-tk-nct',   full_name: 'Phạm Quang Đức', username: 'tk_nct',  role_id: 'r-dept-head', dept_id: 'd-nct', manager_id: 'u-vicedir' },
    { id: 'u-nv-trang', full_name: 'Hoàng Thị Trang', username: 'nv_trang', role_id: 'r-staff', dept_id: 'd-nt', manager_id: 'u-tk-noi' },
    { id: 'u-nv-huy',   full_name: 'Nguyễn Văn Huy', username: 'nv_huy',   role_id: 'r-staff', dept_id: 'd-nt', manager_id: 'u-tk-noi' },
    { id: 'u-nv-phong', full_name: 'Đặng Văn Phong', username: 'nv_phong', role_id: 'r-staff', dept_id: 'd-nct', manager_id: 'u-tk-nct' },
  ]
  const insertUser = db.prepare('INSERT INTO users (id,full_name,username,password_hash,role_id,dept_id,manager_id) VALUES (?,?,?,?,?,?,?)')
  users.forEach(u => insertUser.run(u.id, u.full_name, u.username, hash, u.role_id, u.dept_id, u.manager_id))

  // ── Vice Director ↔ Department assignments ────────────
  // PGĐ giám sát: d-nt và d-nct (2 khoa lâm sàng chính)
  const insertVDRDept = db.prepare('INSERT INTO vice_director_departments (vice_director_id, department_id) VALUES (?,?)')
  insertVDRDept.run('u-vicedir', 'd-nt')
  insertVDRDept.run('u-vicedir', 'd-nct')

  // ── Meetings ──────────────────────────────────────────
  const meetings = [
    {
      id: 'm-1',
      title: 'Biên bản họp giao ban lãnh đạo ngày 14/04/2026',
      document_number: '....../BB-GB',
      document_place: 'Hà Nội',
      document_day: 14,
      document_month: 4,
      document_year: 2026,
      meeting_date: '2026-04-14T07:30:00.000Z',
      start_time: '07:30',
      end_time: null,
      location: 'Phòng họp Hội đồng – Bệnh viện Đa khoa Thành phố',
      chairperson_id: 'u-director',
      secretary_id: 'u-nv-huy',
      department_id: null,
      content_raw: 'Họp giao ban sáng ngày 14/04/2026 với sự tham gia của Ban Giám đốc và lãnh đạo các khoa.',
      conclusion: '1. Giảm tải thủ tục hành chính. 2. Nâng cao chất lượng khám chữa bệnh.',
      status: 'draft',
      created_by_id: 'u-director',
    },
    {
      id: 'm-2',
      title: 'Biên bản họp giao ban lãnh đạo ngày 10/04/2026',
      document_number: '....../BB-GB',
      document_place: 'Hà Nội',
      document_day: 10,
      document_month: 4,
      document_year: 2026,
      meeting_date: '2026-04-10T07:30:00.000Z',
      start_time: '07:30',
      end_time: '09:00',
      location: 'Phòng họp Hội đồng – Bệnh viện Đa khoa Thành phố',
      chairperson_id: 'u-director',
      secretary_id: 'u-nv-huy',
      department_id: null,
      content_raw: 'Họp giao ban định kỳ hàng tuần.',
      conclusion: 'Đẩy mạnh kết nối với các trạm y tế xã, phường.',
      status: 'approved',
      approved_at: '2026-04-10T10:00:00.000Z',
      approved_by_id: 'u-director',
      created_by_id: 'u-director',
    },
  ]
  const insertMeeting = db.prepare(`
    INSERT INTO meetings (id,title,document_number,document_place,document_day,document_month,document_year,meeting_date,start_time,end_time,location,chairperson_id,secretary_id,department_id,content_raw,conclusion,status,approved_at,approved_by_id,created_by_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  meetings.forEach(m => insertMeeting.run(
    m.id, m.title, m.document_number, m.document_place, m.document_day, m.document_month, m.document_year,
    m.meeting_date, m.start_time, m.end_time, m.location, m.chairperson_id, m.secretary_id,
    m.department_id, m.content_raw, m.conclusion, m.status, m.approved_at ?? null, m.approved_by_id ?? null, m.created_by_id
  ))

  // ── Meeting Attendees ─────────────────────────────────
  const insertAttendee = db.prepare('INSERT INTO meeting_attendees (meeting_id, user_id) VALUES (?,?)')
  ;[['m-1', 'u-vicedir'], ['m-1', 'u-tk-noi'], ['m-1', 'u-tk-nct'],
    ['m-2', 'u-vicedir'], ['m-2', 'u-tk-noi'], ['m-2', 'u-tk-nct'],
    ['m-2', 'u-nv-trang'], ['m-2', 'u-nv-huy']
  ].forEach(([mid, uid]) => insertAttendee.run(mid, uid))

  // ── Meeting Minutes ────────────────────────────────────
  const minutes = [
    {
      id: 'mm-1',
      meeting_id: 'm-1',
      matter: 'Đánh giá hoạt động chuyên môn và triển khai công tác điều hành',
      admin_location: 'Phòng họp Hội đồng – Bệnh viện Đa khoa Thành phố',
      admin_chair_name: 'Nguyễn Văn An',
      admin_chair_position: 'Giám đốc',
      admin_secretary_name: 'Nguyễn Văn Huy',
      admin_secretary_position: 'Nhân viên hành chính',
      admin_attendees: 'Ban Giám đốc. Lãnh đạo các Khoa, Phòng, Đơn vị.',
      section_I_leadership: 'Ca trực lãnh đạo ổn định, không có sự cố đặc biệt.',
      section_II_shift: '3 bác sĩ, 5 điều dưỡng',
      section_II_old_patient: '45',
      section_II_admitted: '12',
      section_II_left: '8',
      section_II_current: '49',
      section_II_2a: '12 ca cấp cứu nhập viện, 2 ca nặng chuyển ICU',
      section_II_2b_deaths: '1 ca tử vong (BN Nguyễn Văn X, 72t, nhồi máu cơ tim)',
      section_II_2b_transfers: '2 ca chuyển tuyến trên',
      section_II_2b_discharges: '5 ca ra viện',
      section_II_2c_abnormal: 'BN Lê Thị M — diễn biến bất thường, đang theo dõi.',
      section_II_2c_suggestions: 'Tăng cường giám sát bệnh nhân cao tuổi.',
      section_III_paraclinical: 'Kết quả CLS đa số trả trong 24h, một số xét nghiệm chờ lâu.',
      section_IV_admin_security: 'Cổng an ninh hoạt động bình thường. Một số phòng khóa muộn.',
      section_V_unit_discussion: 'Khoa Nội đề xuất bổ sung giường. Khoa Ngoại báo cáo vật tư đủ.',
      chair_conclusion_professional: 'Tăng cường chất lượng khám chữa bệnh, giảm tải thủ tục hành chính.',
      chair_conclusion_logistics: 'Bổ sung nhân lực cho khoa Cấp cứu.',
      chair_conclusion_level1_care: 'Chuẩn bị tốt công tác chăm sóc mức 1 cho bệnh nhân nặng.',
      chair_conclusion_priority: 'Hoàn thành đánh giá KPI tháng 4 trước ngày 25/04/2026.',
    },
    {
      id: 'mm-2',
      meeting_id: 'm-2',
      matter: 'Đánh giá hoạt động chuyên môn tuần qua',
      admin_location: 'Phòng họp Hội đồng',
      admin_chair_name: 'Nguyễn Văn An',
      admin_chair_position: 'Giám đốc',
      admin_secretary_name: 'Nguyễn Văn Huy',
      admin_secretary_position: 'Nhân viên hành chính',
      admin_attendees: 'Ban Giám đốc. Lãnh đạo các Khoa.',
      section_I_leadership: 'Tuần qua không có sự cố lớn.',
      section_II_shift: '3 bác sĩ, 4 điều dưỡng',
      section_II_old_patient: '40',
      section_II_admitted: '10',
      section_II_left: '6',
      section_II_current: '44',
      chair_conclusion_professional: 'Đẩy mạnh kết nối y tế tuyến dưới.',
      chair_conclusion_priority: 'Ký thỏa thuận hợp tác với 2 trạm y tế xã trong tháng 4.',
    },
  ]
  const insertMinutes = db.prepare(`
    INSERT INTO meeting_minutes (id,meeting_id,matter,admin_location,admin_chair_name,admin_chair_position,admin_secretary_name,admin_secretary_position,admin_attendees,section_I_leadership,section_II_shift,section_II_old_patient,section_II_admitted,section_II_left,section_II_current,section_II_2a,section_II_2b_deaths,section_II_2b_transfers,section_II_2b_discharges,section_II_2c_abnormal,section_II_2c_suggestions,section_III_paraclinical,section_IV_admin_security,section_V_unit_discussion,chair_conclusion_professional,chair_conclusion_logistics,chair_conclusion_level1_care,chair_conclusion_priority)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  minutes.forEach(m => insertMinutes.run(
    m.id, m.meeting_id, m.matter, m.admin_location,
    m.admin_chair_name, m.admin_chair_position, m.admin_secretary_name, m.admin_secretary_position,
    m.admin_attendees ?? null, m.section_I_leadership,
    m.section_II_shift, m.section_II_old_patient, m.section_II_admitted,
    m.section_II_left, m.section_II_current,
    m.section_II_2a ?? null, m.section_II_2b_deaths ?? null,
    m.section_II_2b_transfers ?? null, m.section_II_2b_discharges ?? null,
    m.section_II_2c_abnormal ?? null, m.section_II_2c_suggestions ?? null,
    m.section_III_paraclinical ?? null, m.section_IV_admin_security ?? null,
    m.section_V_unit_discussion ?? null,
    m.chair_conclusion_professional, m.chair_conclusion_logistics ?? null,
    m.chair_conclusion_level1_care ?? null, m.chair_conclusion_priority
  ))

  // ── Tasks ─────────────────────────────────────────────
  const tasks = [
    {
      id: 't-1',
      meeting_id: 'm-1',
      parent_task_id: null,
      title: 'Cắt bỏ một số thủ tục hành chính tại phòng khám bệnh',
      description: 'Bỏ duyệt CT, MRI khi bác sĩ chỉ định chịu trách nhiệm',
      priority: 'HIGH',
      creator_id: 'u-director',
      assignee_id: 'u-vicedir',
      monitor_id: 'u-tk-noi',
      department_id: 'd-hc',
      deadline: '2026-04-20',
      started_at: null,
      completed_at: null,
      status: 'NEW',
      report_summary: null,
      extended_note: 'Giảm tải thủ tục hành chính cho bệnh nhân',
    },
    {
      id: 't-2',
      meeting_id: 'm-1',
      parent_task_id: null,
      title: 'Thiết lập đội ngũ Hỗ trợ vận chuyển mẫu, giấy tờ và dẫn bệnh nhân',
      description: 'Làm tờ trình đề xuất nhân lực, phân công nhiệm vụ cho đội ngũ vận chuyển',
      priority: 'MEDIUM',
      creator_id: 'u-director',
      assignee_id: 'u-tk-noi',
      monitor_id: 'u-vicedir',
      department_id: 'd-nt',
      deadline: '2026-04-30',
      started_at: '2026-04-14T08:00:00.000Z',
      completed_at: null,
      status: 'IN_PROGRESS',
      report_summary: null,
      extended_note: 'Bổ sung 01 hộ lý cho KKB',
    },
    {
      id: 't-3',
      meeting_id: 'm-1',
      parent_task_id: null,
      title: 'Chấn chỉnh ngay thái độ thờ ơ tại khoa Cấp cứu',
      description: 'Nhắc nhở, tập huấn thường xuyên cho nhân viên',
      priority: 'URGENT',
      creator_id: 'u-vicedir',
      assignee_id: 'u-tk-nct',
      monitor_id: 'u-director',
      department_id: 'd-hscc',
      deadline: '2026-04-18',
      started_at: '2026-04-14T09:00:00.000Z',
      completed_at: null,
      status: 'IN_PROGRESS',
      report_summary: null,
      extended_note: 'Thay đổi diện mạo về phong cách phục vụ',
    },
    {
      id: 't-4',
      meeting_id: 'm-1',
      parent_task_id: 't-1',
      title: 'Khảo sát thủ tục hành chính tại khoa khám bệnh',
      description: 'Gặp gỡ nhân viên, thu thập phản hồi',
      priority: 'MEDIUM',
      creator_id: 'u-vicedir',
      assignee_id: 'u-nv-trang',
      monitor_id: 'u-tk-noi',
      department_id: 'd-nt',
      deadline: '2026-04-16',
      started_at: '2026-04-14T10:00:00.000Z',
      completed_at: null,
      status: 'NEW',
      report_summary: null,
      extended_note: null,
    },
    {
      id: 't-5',
      meeting_id: 'm-1',
      parent_task_id: 't-2',
      title: 'Lập tờ trình đề xuất nhân lực vận chuyển',
      description: 'Soạn tờ trình gửi Ban Giám đốc',
      priority: 'MEDIUM',
      creator_id: 'u-tk-noi',
      assignee_id: 'u-nv-huy',
      monitor_id: 'u-vicedir',
      department_id: 'd-nt',
      deadline: '2026-04-22',
      started_at: null,
      completed_at: null,
      status: 'NEW',
      report_summary: null,
      extended_note: null,
    },
    {
      id: 't-6',
      meeting_id: null,
      parent_task_id: null,
      title: 'Triển khai tập huấn bộ tiêu chuẩn "Tận tâm" cho toàn bộ nhân viên',
      description: 'Từ cách chào hỏi, diện mạo đến vệ sinh khu vực công cộng',
      priority: 'HIGH',
      creator_id: 'u-director',
      assignee_id: 'u-vicedir',
      monitor_id: null,
      department_id: 'd-nt',
      deadline: '2026-05-01',
      started_at: null,
      completed_at: null,
      status: 'PENDING_APPROVAL',
      report_summary: 'Đã tập huấn 3 đợt cho 85% nhân viên. Chất lượng phục vụ cải thiện rõ rệt.',
      extended_note: 'Thay đổi diện mạo phong cách phục vụ toàn viện',
    },
    {
      id: 't-7',
      meeting_id: 'm-2',
      parent_task_id: null,
      title: 'Nâng cao chất lượng khám, dành thời gian tư vấn kỹ về biến chứng cho bệnh nhân',
      description: 'Đào tạo, tập huấn cho nhân viên y tế',
      priority: 'HIGH',
      creator_id: 'u-vicedir',
      assignee_id: 'u-tk-noi',
      monitor_id: 'u-director',
      department_id: 'd-nt',
      deadline: '2026-04-25',
      started_at: '2026-04-10T08:00:00.000Z',
      completed_at: '2026-04-13T17:00:00.000Z',
      status: 'COMPLETED',
      report_summary: null,
      extended_note: 'Chất lượng khám và điều trị được cải thiện',
    },
    {
      id: 't-8',
      meeting_id: 'm-2',
      parent_task_id: null,
      title: 'Rà soát danh mục kỹ thuật đã phê duyệt nhưng chưa triển khai',
      description: 'Lập bảng phân tích nguyên nhân, đề xuất',
      priority: 'MEDIUM',
      creator_id: 'u-vicedir',
      assignee_id: 'u-tk-nct',
      monitor_id: 'u-vicedir',
      department_id: 'd-nct',
      deadline: '2026-04-20',
      started_at: '2026-04-10T09:00:00.000Z',
      completed_at: null,
      status: 'IN_PROGRESS',
      report_summary: null,
      extended_note: 'Đề xuất cài đặt thêm DMKT trên phần mềm',
    },
    {
      id: 't-9',
      meeting_id: null,
      parent_task_id: null,
      title: 'Đẩy mạnh kết nối với các trạm y tế xã, phường',
      description: 'Đi khảo sát các tuyến, ký thỏa thuận hợp tác',
      priority: 'LOW',
      creator_id: 'u-director',
      assignee_id: 'u-vicedir',
      monitor_id: null,
      department_id: 'd-hc',
      deadline: '2026-04-30',
      started_at: null,
      completed_at: null,
      status: 'REJECTED',
      report_summary: null,
      extended_note: 'Còn thiếu kế hoạch chi tiết',
    },
    {
      id: 't-10',
      meeting_id: null,
      parent_task_id: 't-3',
      title: 'Tập huấn thái độ phục vụ cho nhân viên khoa Cấp cứu',
      description: 'Nhắc nhở, tập huấn thường xuyên',
      priority: 'HIGH',
      creator_id: 'u-tk-nct',
      assignee_id: 'u-nv-phong',
      monitor_id: 'u-tk-nct',
      department_id: 'd-hscc',
      deadline: '2026-04-17',
      started_at: '2026-04-14T09:00:00.000Z',
      completed_at: null,
      status: 'IN_PROGRESS',
      report_summary: null,
      extended_note: null,
    },
  ]
  const insertTask = db.prepare(`
    INSERT INTO tasks (id,meeting_id,parent_task_id,title,description,priority,creator_id,assignee_id,monitor_id,department_id,overseen_by_vice_director_id,assigned_by_id,deadline,started_at,completed_at,status,report_summary,extended_note)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  tasks.forEach(t => insertTask.run(
    t.id, t.meeting_id, t.parent_task_id, t.title, t.description, t.priority,
    t.creator_id, t.assignee_id, t.monitor_id, t.department_id,
    'u-vicedir', // overseen_by_vice_director_id
    t.creator_id, // assigned_by_id
    t.deadline, t.started_at, t.completed_at, t.status, t.report_summary, t.extended_note
  ))

  // Set t-6 pending approval reviewer
  db.prepare(`UPDATE tasks SET pending_approval_reviewer_id = 'u-director', approval_source = 'assigner_report' WHERE id = 't-6'`).run()

  // t-4 parent task overseen
  db.prepare(`UPDATE tasks SET overseen_by_vice_director_id = 'u-vicedir' WHERE parent_task_id = 't-1'`).run()
  db.prepare(`UPDATE tasks SET overseen_by_vice_director_id = 'u-vicedir' WHERE parent_task_id = 't-2'`).run()
  db.prepare(`UPDATE tasks SET overseen_by_vice_director_id = 'u-vicedir' WHERE parent_task_id = 't-3'`).run()

  // ── KPI Metrics ────────────────────────────────────────
  const kpiMetrics = [
    { id: 'kpi-1', name: 'Tỷ lệ hoàn thành đúng hạn', weight: 0.4 },
    { id: 'kpi-2', name: 'Khối lượng công việc hoàn thành', weight: 0.3 },
    { id: 'kpi-3', name: 'Tỷ lệ công việc cần làm lại', weight: 0.3 },
  ]
  const insertKpi = db.prepare('INSERT INTO kpi_metrics (id,name,weight) VALUES (?,?,?)')
  kpiMetrics.forEach(k => insertKpi.run(k.id, k.name, k.weight))

  // ── KPI Results ───────────────────────────────────────
  const kpiResults = [
    { id: 'kpir-1', user_id: 'u-tk-noi', month: 3, year: 2026, score_auto: 85, score_manual: 88, final_grade: 'Tốt' },
    { id: 'kpir-2', user_id: 'u-tk-nct', month: 3, year: 2026, score_auto: 72, score_manual: 75, final_grade: 'Khá' },
    { id: 'kpir-3', user_id: 'u-nv-trang', month: 3, year: 2026, score_auto: 90, score_manual: 92, final_grade: 'Xuất sắc' },
    { id: 'kpir-4', user_id: 'u-nv-huy', month: 3, year: 2026, score_auto: 78, score_manual: 80, final_grade: 'Khá' },
    { id: 'kpir-5', user_id: 'u-nv-phong', month: 3, year: 2026, score_auto: 82, score_manual: 82, final_grade: 'Tốt' },
  ]
  const insertKpiResult = db.prepare('INSERT INTO kpi_results (id,user_id,month,year,score_auto,score_manual,final_grade) VALUES (?,?,?,?,?,?,?)')
  kpiResults.forEach(k => insertKpiResult.run(k.id, k.user_id, k.month, k.year, k.score_auto, k.score_manual, k.final_grade))

  console.log('[seed] Done.')
}
