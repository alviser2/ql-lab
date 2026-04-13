# Hệ thống Giao Ban Frontend — Tài liệu kỹ thuật

## 1. Tổng quan kiến trúc

### 1.1 Công nghệ stack

| Lớp | Công nghệ | Phiên bản |
|-----|-----------|-----------|
| Framework UI | React | 19.2.4 |
| Ngôn ngữ | TypeScript | ~6.0.2 |
| Build tool | Vite | 8.0.4 |
| Styling | Tailwind CSS v4 + CSS Variables | 4.2.2 |
| State management | Zustand | 5.0.12 |
| Server state | TanStack React Query | 5.99.0 |
| Routing | React Router DOM | 7.14.0 |
| Drag & Drop | @dnd-kit | 10.0.0 |
| Charts | Recharts | 3.8.1 |
| Date utils | date-fns | 4.1.0 |
| Notifications | react-hot-toast | 2.6.0 |

### 1.2 Cấu trúc thư mục

```
src/
├── app/
│   ├── router.tsx        # Định nghĩa tất cả routes
│   ├── providers.tsx     # React Query + theme providers
│   └── queryClient.ts    # Cấu hình TanStack Query client
├── components/           # Các UI components dùng chung
│   ├── Drawer.tsx        # Slide-over panel
│   ├── Modal.tsx         # Hộp thoại chung
│   ├── TaskCard.tsx      # Card hiển thị công việc
│   ├── StatusBadge.tsx   # Badge trạng thái
│   ├── PriorityTag.tsx   # Tag mức ưu tiên
│   ├── DeadlineBadge.tsx # Badge deadline (quá hạn, sắp tới)
│   ├── UserAvatar.tsx    # Avatar người dùng
│   └── DeadlineBadge.tsx
├── features/
│   ├── auth/             # Login, ProtectedRoute, RoleGuard
│   ├── dashboard/       # KPIOverview, HotspotList, GanttChart, BarChart
│   ├── kpi/              # DepartmentKPI (progress bar per task)
│   ├── meetings/        # CreateMeetingModal, MeetingsList
│   │   └── minuteFieldConfig.ts  # Định nghĩa các trường biên bản mẫu A/B/C
│   └── tasks/
│       ├── Kanban/       # Board, Column, Card, KanbanCard, KanbanColumn
│       ├── TaskTree/     # TaskTreeView, TaskTree, TaskNode (cây phân rã)
│       ├── staff/        # MyTasks, QuickReportModal, TaskDetailDrawer
│       └── ApprovalInbox.tsx  # Hộp duyệt báo cáo
├── hooks/
│   ├── useTasksQuery.ts  # useQuery wrapper cho tasks
│   └── useFakeRealtime.ts
├── layouts/
│   └── MainLayout.tsx    # Sidebar + header + content area
├── pages/
│   ├── DashboardPage.tsx
│   ├── KPIPage.tsx
│   ├── MeetingsPage.tsx
│   ├── MeetingDetailPage.tsx
│   └── TasksPage.tsx
├── services/
│   ├── mockDb.ts         # localStorage-based database + seed data
│   ├── taskService.ts    # CRUD tasks + báo cáo + duyệt
│   └── meetingService.ts # CRUD meetings + duyệt biên bản
├── store/                # Zustand stores
│   ├── authStore.ts      # User đang login
│   ├── taskStore.ts      # Hỗ trợ invalidate + manual fetch
│   ├── notificationStore.ts
│   └── uiStore.ts
├── types/
│   └── index.ts          # Tất cả interfaces: User, Task, Meeting, v.v.
└── utils/
    ├── cn.ts             # clsx wrapper
    ├── rbac.ts           # tasksVisibleForUser, meetingsVisibleForUser
    ├── taskRules.ts      # canAssignTo, deadlineAfterParent, canMarkTaskComplete
    ├── taskHierarchy.ts  # taskProgress (đếm con các trạng thái)
    └── meetingPermissions.ts
```

---

## 2. Kiểu dữ liệu (Types)

### 2.1 User & Role

```typescript
type Role = 'director' | 'vice_director' | 'department_head' | 'staff'
```

| Role | Mô tả | Phạm vi quyền |
|------|-------|---------------|
| `director` | Giám đốc | Xem tất cả, tạo task gốc, duyệt biên bản họp |
| `vice_director` | Phó Giám đốc | Giám sát khoa được phân công (`managedDepartmentIds`), duyệt báo cáo |
| `department_head` | Trưởng/Phó khoa | Quản lý task khoa mình, giao việc con |
| `staff` | Nhân viên | Chỉ thấy việc mình được giao |

```typescript
interface User {
  id: string
  name: string
  email: string
  role: Role
  departmentId: string | null        // null với GĐ/PGĐ
  managedDepartmentIds?: string[]    // PGĐ giám sát nhiều khoa
  title?: string                     // VD: "Giám đốc", "Phó Giám đốc"
}
```

### 2.2 Task

```typescript
type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'REJECTED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
// approvalSource: 'assigner_report' = báo cáo lên người giao | 'vice_line' = trình PGĐ

interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  parentId: string | null     // null = task gốc, có giá trị = task con
  assigneeId: string | null   // Người nhận việc (thực hiện)
  departmentId: string        // Khoa chủ trì
  overseenByViceDirectorId: string | null  // PGĐ giám sát
  createdById: string         // Người tạo trên hệ thống
  assignedById: string | null // Người giao việc (duyệt báo cáo)
  pendingApprovalReviewerId: string | null  // Ai đang duyệt
  approvalSource: TaskApprovalSource | null
  lastReportSummary: string | null
  lastRejectionReason: string | null
  deadline: string            // ISO date string
  createdAt: string
  updatedAt: string
  // Các trường mở rộng
  thuongTrucId?: string | null
  boPhanPhoiHopIds?: string[]
  phuongPhapLam?: string | null
  dukienKetQua?: string | null
}
```

### 2.3 Meeting & Biên bản

```typescript
type MeetingStatus = 'draft' | 'approved'

// Biên bản gồm 3 phần:
interface MeetingMinutes {
  // --- A: Thông tin hành chính ---
  matter?: string                     // V/v
  adminTimeStartNote?: string
  adminTimeEndNote?: string
  adminLocation?: string
  adminChairDisplayName?: string
  adminChairPosition?: string
  adminSecretaryDisplayName?: string
  adminSecretaryPosition?: string
  adminAttendeesNote?: string
  adminAbsentNote?: string

  // --- B: Nội dung I/II/III/IV/V ---
  sectionI_leadershipShift?: string    // I. Thường trực lãnh đạo
  sectionII_shiftComposition?: string  // II. Thường trực chuyên môn
  sectionII_oldPatientCount?: string
  sectionII_admittedInShift?: string
  sectionII_leftInShift?: string
  sectionII_currentPatientCount?: string
  sectionII_2a_admissions?: string     // 2a: Nhập viện
  sectionII_2b_deaths?: string        // 2b: Tử vong
  sectionII_2b_transfers?: string      // Chuyển khoa
  sectionII_2b_discharges?: string     // Ra viện
  sectionII_2c_abnormal?: string       // Diễn biến bất thường
  sectionII_2c_suggestions?: string
  sectionIII_paraclinical?: string     // III. Cận lâm sàng
  sectionIV_adminSecurity?: string     // IV. Hành chính ANTT
  sectionV_unitDiscussion?: string     // V. Các đơn vị trao đổi

  // --- C: Kết luận chủ tọa ---
  chairConclusionProfessional?: string
  chairConclusionLogistics?: string
  chairConclusionLevel1Care?: string
  chairConclusionPriorityWork?: string
}

interface Meeting {
  id: string
  title: string
  documentNumber?: string    // VD: ....../BB-GB
  documentPlace?: string     // VD: Hà Nội
  documentDay?: number; documentMonth?: number; documentYear?: number
  startAt: string            // ISO datetime
  endAt?: string | null
  room: string
  chairId: string
  secretaryId: string        // Được phép sửa biên bản nháp
  attendeeIds: string[]
  departmentId: string | null // null = toàn bệnh viện
  status: MeetingStatus      // 'draft' | 'approved'
  approvedAt?: string | null
  approvedById?: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  minutes: MeetingMinutes
}
```

---

## 3. Mock Database & State Management

### 3.1 localStorage-based DB

Tất cả dữ liệu được lưu trong `localStorage` với key `giao-ban-mock-db-v1`. Khởi tạo từ `SEED_TASKS`, `SEED_USERS`, `SEED_MEETINGS`, `SEED_DEPARTMENTS`.

```typescript
// src/services/mockDb.ts
export function loadDb(): MockDatabase { ... }  // Đọc từ localStorage
export function saveDb(db: MockDatabase): void  // Ghi vào localStorage
export function resetDb(): MockDatabase        // Reset về seed data
export async function mockLatency<T>(value: T, ms = 320): Promise<T>
```

**Seed data:**
- 3 khoa: Nội tổng hợp, Ngoại chấn thương, Hồi sức cấp cứu
- 7 users: 1 GĐ, 1 PGĐ, 2 trưởng khoa, 3 nhân viên
- 10 tasks (đủ các trạng thái: NEW, IN_PROGRESS, PENDING_APPROVAL, COMPLETED, REJECTED)
- 2 meetings (1 nháp, 1 đã duyệt)

### 3.2 Auth Store (Zustand + persist)

```typescript
// src/store/authStore.ts
interface AuthState {
  userId: string | null
  user: User | null
  setUserById: (id: string | null) => void
  logout: () => void
}
```

- Persist vào `localStorage` key `giao-ban-auth`
- Khi hydrate, tự động resolve `user` từ `userId` bằng `loadDb()`

---

## 4. Routing & Authentication

### 4.1 Routes

| Path | Component | Auth | Role |
|------|-----------|------|------|
| `/login` | `LoginPage` | Public | — |
| `/` | `DashboardPage` | Required | All |
| `/tasks` | `TasksPage` | Required | All |
| `/kpi` | `KPIPage` | Required | All |
| `/meetings` | `MeetingsPage` | Required | All |
| `/meetings/:meetingId` | `MeetingDetailPage` | Required | All |

### 4.2 ProtectedRoute

```typescript
// src/features/auth/ProtectedRoute.tsx
// - Redirect về /login nếu chưa có user
// - Wrap <MainLayout> bên trong
```

### 4.3 Login Logic

```typescript
// src/features/auth/LoginPage.tsx
// Dropdown chọn user từ SEED_USERS (không có password)
// Gọi authStore.setUserById(id) → persist vào localStorage
// Redirect về dashboard
```

---

## 5. Logic nghiệp vụ

### 5.1 RBAC — Phân quyền xem công việc

```typescript
// src/utils/rbac.ts
export function tasksVisibleForUser(user: User, tasks: Task[]): Task[] {
  switch (user.role) {
    case 'director':
      return tasks  // Xem tất cả
    case 'vice_director': {
      const managed = new Set(user.managedDepartmentIds ?? [])
      return tasks.filter(
        t => t.overseenByViceDirectorId === user.id || managed.has(t.departmentId)
      )
    }
    case 'department_head':
      return tasks.filter(t => t.departmentId === user.departmentId)
    case 'staff':
      return tasks.filter(t => t.assigneeId === user.id)
  }
}
```

### 5.2 Giao việc (canAssignTo)

```typescript
// src/utils/taskRules.ts
const roleRank = { director: 4, vice_director: 3, department_head: 2, staff: 1 }

export function canAssignTo(assigner: User, assignee: User): boolean {
  if (assigner.id === assignee.id) return true  // Tự giao cho mình
  return roleRank[assigner.role] >= roleRank[assignee.role]
}
```

### 5.3 Luồng trạng thái công việc

```
NEW ──[Người nhận bắt đầu]──> IN_PROGRESS
                                 │
              [Người nhận gửi báo cáo]
                                 │
                                 v
                        PENDING_APPROVAL ──[Người giao duyệt OK]──> COMPLETED
                                 │
                    [Người giao từ chối + reason]
                                 │
                                 v
                            REJECTED
```

**Luồng báo cáo (assigner_report):**
1. Staff gửi báo cáo → Task chuyển `PENDING_APPROVAL`
2. Người giao (`assignedById`) nhận trong `ApprovalInbox`
3. Duyệt → `COMPLETED`; Từ chối → quay về `IN_PROGRESS` + ghi `lastRejectionReason`

**Luồng PGĐ (vice_line):**
1. Trưởng khoa trình lên → `PENDING_APPROVAL`, reviewer = `u-vicedir`
2. PGĐ duyệt → `COMPLETED`; Từ chối → `REJECTED` (không quay về IN_PROGRESS vì đây là phê duyệt cấp cao)

### 5.4 Luồng biên bản họp

```
draft ──[Thư ký điền biên bản]──> draft (có minutes)
                                     │
                          [Giám đốc duyệt]
                                     │
                                     v
                                  approved (lock — không sửa được)
```

- **Chỉ thư ký** (`secretaryId === user.id`) được sửa khi status = `draft`
- **Chỉ Giám đốc** duyệt chốt biên bản

### 5.5 Thao tác giao việc trong TaskDetailDrawer

| Actor | Quyền |
|-------|-------|
| Người nhận (`assigneeId`) | Báo cáo (chuyển PENDING_APPROVAL) |
| Trưởng khoa | Giao lại cho người cùng khoa, cập nhật trạng thái nhanh |
| PGĐ | Giao lại trong khoa mình giám sát |
| GĐ | Giao cho bất kỳ ai |

### 5.6 Task Tree — Cây phân rã

```typescript
// src/utils/taskHierarchy.ts
export function taskProgress(tasks: Task[], taskId: string): {
  childCount: number
  completedCount: number
  inProgressCount: number
  pendingReportCount: number
}
```

- Nguyên tắc: Task cha chỉ hoàn thành được khi **tất cả** task con đều `COMPLETED`
- Rule check: `CHILDREN_NOT_DONE` khi gọi `updateTask(..., { status: 'COMPLETED' })`

### 5.7 Deadline validation

```typescript
// Trong createTask và updateTask
if (parent && new Date(deadline) > new Date(parent.deadline)) {
  throw new Error('DEADLINE_AFTER_PARENT')
}
```

Task con không được có deadline sau cha.

---

## 6. Chi tiết từng trang

### 6.1 DashboardPage

**Role GĐ:**
- KPIOverview (tổng hợp toàn viện)
- HotspotList (điểm nóng: quá hạn, bị từ chối, khẩn)
- DepartmentBarChart (biểu đồ cột tasks theo khoa)
- GanttChart (timeline tasks)
- DepartmentKPI (tổng viện)

**Role PGĐ:**
- KPIOverview (khoa PGĐ giám sát)
- ApprovalInbox (báo cáo chờ duyệt)
- DepartmentKPI per khoa (mỗi khoa PGĐ phụ trách)

**Role Trưởng khoa:**
- KPIOverview (khoa mình)
- DepartmentKPI (khoa mình)
- KanbanBoard (cột: Mới, Đang làm, Chờ duyệt, Hoàn thành, Từ chối)

**Role Staff:**
- MyTasks (danh sách việc được giao, mobile-optimized)
- QuickReport (gửi báo cáo)

### 6.2 TasksPage

- **Staff**: Chỉ `MyTasks`
- **Trưởng khoa**: `MyTasks` + `KanbanBoard` + `TaskDetailDrawer`
- **PGĐ/GĐ**: `ApprovalInbox` + `TaskTreeView` (cây phân rã) + `TaskDetailDrawer`

### 6.3 MeetingDetailPage

- Hiển thị biên bản theo mẫu 3 phần A/B/C
- `MINUTE_FIELD_GROUPS` định nghĩa cấu trúc các trường biên bản
- `canEdit`: chỉ thư ký khi `status === 'draft'`
- `canApprove`: chỉ GĐ khi `status === 'draft'`
- Sticky footer chứa nút Lưu / Duyệt & khóa

---

## 7. API Service Layer

### 7.1 taskService

| Function | Mô tả | Auth check |
|----------|-------|-----------|
| `getTasks()` | Lấy tất cả tasks | — |
| `getTaskById(id)` | Lấy 1 task | — |
| `getTaskTreeFull()` | Trả về cây phân rã | — |
| `createTask(input)` | Tạo task mới + validate deadline con ≤ cha | — |
| `updateTask(id, patch)` | Cập nhật task + business rule check | — |
| `submitTaskReport(taskId, actorId, summary)` | Gửi báo cáo → `PENDING_APPROVAL` | Chỉ assignee |
| `approveTask(id, approve, actorId, reason?)` | Duyệt/từ chối báo cáo | Chỉ reviewer |
| `assignTask(taskId, assigneeId, delegatedById)` | Giao lại việc | — |

### 7.2 meetingService

| Function | Mô tả | Auth check |
|----------|-------|-----------|
| `getMeetings()` | Lấy tất cả meetings, sort descending startAt | — |
| `getMeetingById(id)` | Lấy 1 meeting | — |
| `createMeeting(actor, input)` | Tạo meeting | `canScheduleMeeting` |
| `updateMeeting(actor, id, patch)` | Cập nhật meeting + minutes | `canEditMeetingDraft` |
| `approveMeeting(actor, id)` | Duyệt chốt biên bản | `canApproveMeeting` |

### 7.3 meetingPermissions

```typescript
canScheduleMeeting(user)       // GĐ || PGĐ
canEditMeetingDraft(user, m)    // user.id === m.secretaryId && m.status === 'draft'
canApproveMeeting(user, m)     // user.role === 'director' && m.status === 'draft'
meetingVisibleToUser(user, m)  // Complex visibility logic per role
```

---

## 8. Components chính

### 8.1 TaskCard

Hiển thị: title, deadline badge (xanh/quá hạn đỏ/sắp tới vàng), priority tag, status badge.

### 8.2 KanbanBoard

Sử dụng `@dnd-kit/core` + `@dnd-kit/sortable`. 5 cột status. Staff chỉ thấy cột Mới/Đang làm.

### 8.3 ApprovalInbox

- Filter: `status === PENDING_APPROVAL && pendingApprovalReviewerId === currentUser.id`
- 2 actions: Duyệt (Complete) / Từ chối (quay về IN_PROGRESS hoặc REJECTED tùy source)
- Modal nhập lý do từ chối

### 8.4 TaskDetailDrawer

- Slide-over panel từ bên phải
- Hiển thị: tiến độ phân rã (số con các trạng thái)
- Rejection reason banner nếu có
- Giao lại việc (chỉ role đủ quyền mới thấy select)
- Nút "Báo cáo" cho người nhận
- Nút trạng thái nhanh: "Bắt đầu làm", "Hoàn thành"

### 8.5 QuickReportModal

Staff gửi báo cáo từ MyTasks. Chỉ enable khi `status === NEW || IN_PROGRESS`.

---

## 9. Store & React Query

### 9.1 taskStore (Zustand)

```typescript
interface TaskStore {
  tasks: Task[]
  fetchTasks: () => Promise<void>
  assignTask: (taskId, assigneeId, delegatedById) => Promise<void>
}
```

### 9.2 React Query Config

```typescript
// src/app/queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2 }
  }
})
```

### 9.3 useTasksQuery hook

```typescript
// src/hooks/useTasksQuery.ts
// Gọi taskService.getTasks() + cập nhật taskStore.tasks
// Invalidate queries sau mỗi mutation
```

---

## 10. Các rule nghiệp vụ tổng hợp

| Rule | Chi tiết |
|------|----------|
| Giao việc | `roleRank(assigner) >= roleRank(assignee)` |
| Deadline con | `deadlineCon <= deadlineCha` |
| Hoàn thành task cha | `all children COMPLETED` |
| Gửi báo cáo | Chỉ `assigneeId`, trạng thái `NEW` hoặc `IN_PROGRESS` |
| Duyệt báo cáo | Chỉ `pendingApprovalReviewerId` |
| Từ chối báo cáo (assigner_report) | Quay về `IN_PROGRESS` + ghi rejectionReason |
| Từ chối báo cáo (vice_line) | Chuyển `REJECTED` |
| Sửa biên bản họp | Chỉ thư ký, khi `status === draft` |
| Duyệt biên bản | Chỉ GĐ, khi `status === draft` |

---

## 11. Build & Development

```bash
npm run dev       # Development server (port mặc định Vite)
npm run build     # TypeScript compile + Vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```

### Tailwind Config

```js
// tailwind.config.js hoặc trong vite.config.ts plugin
// Sử dụng @tailwindcss/vite plugin
// CSS variables cho màu medical-50 → medical-950
```

---

## 12. Điểm mở rộng (TODO)

- [ ] Thêm Authentication thực (JWT, đăng nhập thật)
- [ ] Backend API thay localStorage
- [ ] Realtime update (hiện chỉ có mock via useFakeRealtime)
- [ ] File upload cho báo cáo (hiện chỉ input tên file demo)
- [ ] Notification system thực sự
- [ ] Export biên bản họp ra PDF
- [ ] Phân quyền chi tiết hơn (khoa phối hợp)
- [ ] Dashboard KPI chart cho PGĐ/Trưởng khoa
- [ ] Mobile responsive đầy đủ cho staff view