-- Neon PostgreSQL schema for Giao Ban backend (fresh backend, not SQLite migration)
-- Run this whole file in Neon SQL Editor.

begin;

create extension if not exists pgcrypto;

-- =========================
-- 1) Core catalogs
-- =========================

create table if not exists roles (
  id text primary key,
  role_name text not null,
  level int not null,
  created_at timestamptz not null default now()
);

create table if not exists departments (
  id text primary key,
  name text not null,
  code text not null unique,
  type text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  username text not null unique,
  full_name text not null,
  password_hash text not null,
  role_id text not null references roles(id),
  dept_id text references departments(id),
  manager_id text references users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vice_director_departments (
  vice_director_id text not null references users(id) on delete cascade,
  department_id text not null references departments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (vice_director_id, department_id)
);

-- =========================
-- 2) Meetings
-- =========================

create table if not exists meetings (
  id text primary key,
  title text not null,
  document_number text,
  document_place text,
  document_day int,
  document_month int,
  document_year int,
  meeting_date timestamptz not null,
  start_time text,
  end_time text,
  location text,
  chairperson_id text references users(id),
  secretary_id text references users(id),
  department_id text references departments(id),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  created_by_id text not null references users(id),
  approved_by_id text references users(id),
  approved_at timestamptz,
  content_raw text,
  conclusion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meeting_attendees (
  meeting_id text not null references meetings(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

create table if not exists meeting_minutes (
  id text primary key,
  meeting_id text not null unique references meetings(id) on delete cascade,

  matter text,
  admin_time_start text,
  admin_time_end text,
  admin_location text,
  admin_chair_name text,
  admin_chair_position text,
  admin_secretary_name text,
  admin_secretary_position text,
  admin_attendees text,
  admin_absent text,

  section_i_leadership text,
  section_ii_shift text,
  section_ii_old_patient text,
  section_ii_admitted text,
  section_ii_left text,
  section_ii_current text,
  section_ii_2a text,
  section_ii_2b_deaths text,
  section_ii_2b_transfers text,
  section_ii_2b_discharges text,
  section_ii_2c_abnormal text,
  section_ii_2c_suggestions text,

  section_iii_paraclinical text,
  section_iv_admin_security text,
  section_v_unit_discussion text,

  chair_conclusion_professional text,
  chair_conclusion_logistics text,
  chair_conclusion_level1_care text,
  chair_conclusion_priority text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- 3) Tasks
-- =========================

create table if not exists tasks (
  id text primary key,
  meeting_id text references meetings(id) on delete set null,
  parent_task_id text references tasks(id) on delete set null,

  title text not null,
  description text,
  priority text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','URGENT')),
  status text not null default 'NEW' check (status in ('NEW','IN_PROGRESS','PENDING_APPROVAL','COMPLETED','REJECTED')),

  creator_id text not null references users(id),
  assignee_id text references users(id),
  monitor_id text references users(id),
  department_id text references departments(id),

  overseen_by_vice_director_id text references users(id),
  assigned_by_id text references users(id),
  pending_approval_reviewer_id text references users(id),
  approval_source text check (approval_source in ('assigner_report','vice_line')),

  deadline timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  report_summary text,
  last_rejection_reason text,
  extended_note text,

  archived boolean not null default false,
  archived_at timestamptz,
  archived_by_id text references users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_history (
  id text primary key,
  task_id text not null references tasks(id) on delete cascade,
  changed_by text references users(id),
  old_status text,
  new_status text,
  comment text,
  created_at timestamptz not null default now()
);

-- =========================
-- 4) KPI
-- =========================

create table if not exists kpi_metrics (
  id text primary key,
  name text not null,
  weight numeric(6,4) not null,
  created_at timestamptz not null default now()
);

create table if not exists kpi_results (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null check (year between 2000 and 2100),
  score_auto int,
  score_manual int,
  final_grade text,
  created_at timestamptz not null default now(),
  unique (user_id, month, year)
);

-- =========================
-- 5) Indexes
-- =========================

create index if not exists idx_users_role on users(role_id);
create index if not exists idx_users_dept on users(dept_id);
create index if not exists idx_tasks_assignee on tasks(assignee_id);
create index if not exists idx_tasks_creator on tasks(creator_id);
create index if not exists idx_tasks_department on tasks(department_id);
create index if not exists idx_tasks_parent on tasks(parent_task_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_archived on tasks(archived);
create index if not exists idx_meetings_department on meetings(department_id);
create index if not exists idx_meetings_date on meetings(meeting_date desc);

-- =========================
-- 6) Seed data
-- password demo: 123456
-- bcrypt hash generated once
-- =========================

insert into roles (id, role_name, level)
values
  ('r-director', 'Giám đốc', 4),
  ('r-vice-director', 'Phó giám đốc', 3),
  ('r-dept-head', 'Trưởng khoa', 2),
  ('r-staff', 'Nhân viên', 1)
on conflict (id) do update
set role_name = excluded.role_name,
    level = excluded.level;

insert into departments (id, name, code, type)
values
  ('dept-noi', 'Khoa Nội tổng hợp', 'NOI', 'LAM_SANG'),
  ('dept-ngoai', 'Khoa Ngoại chấn thương', 'NGOAI', 'LAM_SANG'),
  ('dept-hscc', 'Khoa Hồi sức cấp cứu', 'HSCC', 'LAM_SANG')
on conflict (id) do update
set name = excluded.name,
    code = excluded.code,
    type = excluded.type;

-- hash for 123456
-- $2b$10$hphZd9gb3mmhtY6UMh3BDORPHlaszgaMnQOSeMJ5mxtXUYpZQZ.by
insert into users (id, username, full_name, password_hash, role_id, dept_id)
values
  ('u-director', 'director', 'BS. Nguyễn Minh Đức', '$2b$10$hphZd9gb3mmhtY6UMh3BDORPHlaszgaMnQOSeMJ5mxtXUYpZQZ.by', 'r-director', null),
  ('u-vicedir', 'vicedir', 'BS. Trần Thu Hà', '$2b$10$hphZd9gb3mmhtY6UMh3BDORPHlaszgaMnQOSeMJ5mxtXUYpZQZ.by', 'r-vice-director', null),
  ('u-head-noi', 'tk_noi', 'BS. Lê Quang Huy', '$2b$10$hphZd9gb3mmhtY6UMh3BDORPHlaszgaMnQOSeMJ5mxtXUYpZQZ.by', 'r-dept-head', 'dept-noi'),
  ('u-head-ngoai', 'tk_nct', 'BS. Phạm Đức An', '$2b$10$hphZd9gb3mmhtY6UMh3BDORPHlaszgaMnQOSeMJ5mxtXUYpZQZ.by', 'r-dept-head', 'dept-ngoai'),
  ('u-staff-1', 'nv_trang', 'Điều dưỡng Mai Lan', '$2b$10$hphZd9gb3mmhtY6UMh3BDORPHlaszgaMnQOSeMJ5mxtXUYpZQZ.by', 'r-staff', 'dept-noi'),
  ('u-staff-2', 'nv_nam', 'NV. Hoàng Nam', '$2b$10$hphZd9gb3mmhtY6UMh3BDORPHlaszgaMnQOSeMJ5mxtXUYpZQZ.by', 'r-staff', 'dept-noi'),
  ('u-staff-3', 'nv_thang', 'KTV. Văn Thắng', '$2b$10$hphZd9gb3mmhtY6UMh3BDORPHlaszgaMnQOSeMJ5mxtXUYpZQZ.by', 'r-staff', 'dept-ngoai')
on conflict (id) do update
set username = excluded.username,
    full_name = excluded.full_name,
    password_hash = excluded.password_hash,
    role_id = excluded.role_id,
    dept_id = excluded.dept_id,
    updated_at = now();

insert into vice_director_departments (vice_director_id, department_id)
values
  ('u-vicedir', 'dept-noi'),
  ('u-vicedir', 'dept-ngoai')
on conflict (vice_director_id, department_id) do nothing;

insert into kpi_metrics (id, name, weight)
values
  ('kpi-on-time', 'Tỷ lệ đúng hạn', 0.4),
  ('kpi-volume', 'Khối lượng công việc', 0.3),
  ('kpi-redo', 'Tỷ lệ làm lại', 0.3)
on conflict (id) do update
set name = excluded.name,
    weight = excluded.weight;

commit;
