import type { MeetingMinutes } from '@/types'

type Key = keyof MeetingMinutes

export const MINUTE_FIELD_GROUPS: {
  heading: string
  fields: { key: Key; label: string }[]
}[] = [
  {
    heading: 'A. Phần hành chính (ghi chú — có thể bổ sung chi tiết thời gian/địa điểm)',
    fields: [
      { key: 'matter', label: 'V/v' },
      { key: 'adminTimeStartNote', label: 'Thời gian bắt đầu (ghi chú)' },
      { key: 'adminTimeEndNote', label: 'Thời gian kết thúc (ghi chú)' },
      { key: 'adminLocation', label: 'Địa điểm (ghi chú)' },
      { key: 'adminChairDisplayName', label: 'Chủ tọa (ghi họ tên)' },
      { key: 'adminChairPosition', label: 'Chức vụ chủ tọa' },
      { key: 'adminSecretaryDisplayName', label: 'Thư ký (ghi họ tên)' },
      { key: 'adminSecretaryPosition', label: 'Chức vụ thư ký' },
      { key: 'adminAttendeesNote', label: 'Thành phần tham dự' },
      { key: 'adminAbsentNote', label: 'Vắng mặt & lý do' },
    ],
  },
  {
    heading: 'B. Nội dung báo cáo',
    fields: [
      {
        key: 'sectionI_leadershipShift',
        label: 'I. Báo cáo Thường trực Lãnh đạo',
      },
      {
        key: 'sectionII_shiftComposition',
        label: 'II.1 — Thành phần phiên trực',
      },
      {
        key: 'sectionII_oldPatientCount',
        label: 'II.1 — Số người bệnh cũ',
      },
      {
        key: 'sectionII_admittedInShift',
        label: 'II.1 — Số NB vào trong phiên trực',
      },
      {
        key: 'sectionII_leftInShift',
        label: 'II.1 — Số NB ra trong phiên trực (TV, CV, RV...)',
      },
      {
        key: 'sectionII_currentPatientCount',
        label: 'II.1 — Số người bệnh hiện có',
      },
      {
        key: 'sectionII_2a_admissions',
        label: 'II.2a — NB vào viện (cấp cứu, nặng...)',
      },
      { key: 'sectionII_2b_deaths', label: 'II.2b — Số tử vong (tóm tắt)' },
      {
        key: 'sectionII_2b_transfers',
        label: 'II.2b — Số chuyển viện (lý do)',
      },
      { key: 'sectionII_2b_discharges', label: 'II.2b — Số ra viện' },
      {
        key: 'sectionII_2c_abnormal',
        label: 'II.2c — Diễn biến bất thường (nội trú, CSC I)',
      },
      {
        key: 'sectionII_2c_suggestions',
        label: 'II.2c — Ý kiến đề xuất chuyên môn',
      },
      {
        key: 'sectionIII_paraclinical',
        label: 'III. Thường trực Cận lâm sàng',
      },
      {
        key: 'sectionIV_adminSecurity',
        label: 'IV. Thường trực Hành chính — Bảo vệ',
      },
      {
        key: 'sectionV_unitDiscussion',
        label: 'V. Ý kiến thảo luận lãnh đạo đơn vị',
      },
    ],
  },
  {
    heading: 'C. Kết luận của Chủ tọa (Giám đốc)',
    fields: [
      {
        key: 'chairConclusionProfessional',
        label: 'Về chuyên môn',
      },
      {
        key: 'chairConclusionLogistics',
        label: 'Về hậu cần, hành chính',
      },
      {
        key: 'chairConclusionLevel1Care',
        label: 'Lưu ý theo dõi NB nặng (CSC I)',
      },
      {
        key: 'chairConclusionPriorityWork',
        label: 'Công việc trọng tâm ngày/tuần',
      },
    ],
  },
]
