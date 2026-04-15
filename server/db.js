import fs from 'node:fs'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const configuredDbPath = process.env.DB_PATH?.trim()
const DB_PATH = configuredDbPath && configuredDbPath.length > 0
  ? configuredDbPath
  : join(__dirname, 'giao_ban.db')

let _db = null

export function getDb() {
  if (_db) return _db

  if (DB_PATH !== ':memory:') {
    fs.mkdirSync(dirname(DB_PATH), { recursive: true })
  }

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  initSchema(_db)
  runMigrations(_db)
  return _db
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('LAM_SANG','CAN_LAM_SANG','HANH_CHINH'))
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      role_name TEXT NOT NULL,
      level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 4)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id),
      dept_id TEXT REFERENCES departments(id),
      manager_id TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS vice_director_departments (
      vice_director_id TEXT NOT NULL REFERENCES users(id),
      department_id TEXT NOT NULL REFERENCES departments(id),
      PRIMARY KEY (vice_director_id, department_id)
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      document_number TEXT,
      document_place TEXT,
      document_day INTEGER,
      document_month INTEGER,
      document_year INTEGER,
      meeting_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      chairperson_id TEXT REFERENCES users(id),
      secretary_id TEXT REFERENCES users(id),
      department_id TEXT REFERENCES departments(id),
      content_raw TEXT,
      conclusion TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved')),
      approved_at TEXT,
      approved_by_id TEXT REFERENCES users(id),
      created_by_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meeting_attendees (
      meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      PRIMARY KEY (meeting_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS meeting_minutes (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
      matter TEXT,
      admin_time_start TEXT,
      admin_time_end TEXT,
      admin_location TEXT,
      admin_chair_name TEXT,
      admin_chair_position TEXT,
      admin_secretary_name TEXT,
      admin_secretary_position TEXT,
      admin_attendees TEXT,
      admin_absent TEXT,
      section_I_leadership TEXT,
      section_II_shift TEXT,
      section_II_old_patient TEXT,
      section_II_admitted TEXT,
      section_II_left TEXT,
      section_II_current TEXT,
      section_II_2a TEXT,
      section_II_2b_deaths TEXT,
      section_II_2b_transfers TEXT,
      section_II_2b_discharges TEXT,
      section_II_2c_abnormal TEXT,
      section_II_2c_suggestions TEXT,
      section_III_paraclinical TEXT,
      section_IV_admin_security TEXT,
      section_V_unit_discussion TEXT,
      chair_conclusion_professional TEXT,
      chair_conclusion_logistics TEXT,
      chair_conclusion_level1_care TEXT,
      chair_conclusion_priority TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      meeting_id TEXT REFERENCES meetings(id),
      parent_task_id TEXT REFERENCES tasks(id),
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW','MEDIUM','HIGH','URGENT')),
      creator_id TEXT NOT NULL REFERENCES users(id),
      assignee_id TEXT REFERENCES users(id),
      monitor_id TEXT REFERENCES users(id),
      department_id TEXT REFERENCES departments(id),
      overseen_by_vice_director_id TEXT REFERENCES users(id),
      assigned_by_id TEXT REFERENCES users(id),
      pending_approval_reviewer_id TEXT REFERENCES users(id),
      approval_source TEXT CHECK(approval_source IN ('assigner_report','vice_line')),
      last_rejection_reason TEXT,
      report_summary TEXT,
      extended_note TEXT,
      deadline TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','IN_PROGRESS','PENDING_APPROVAL','COMPLETED','REJECTED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_history (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      changed_by TEXT NOT NULL REFERENCES users(id),
      old_status TEXT,
      new_status TEXT,
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kpi_metrics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS kpi_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      year INTEGER NOT NULL,
      score_auto REAL,
      score_manual REAL,
      final_grade TEXT,
      UNIQUE(user_id, month, year)
    );
  `)
}

function hasColumn(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  return cols.some((c) => c.name === column)
}

function hasTable(db, name) {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .all(name)
  return tables.length > 0
}

function ensureColumn(db, table, columnName, columnDef) {
  if (hasColumn(db, table, columnName)) return
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`)
}

function ensureMigrationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

function isMigrationApplied(db, id) {
  const row = db.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(id)
  return !!row
}

function markMigrationApplied(db, id) {
  db.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(id)
}

function runMigrations(db) {
  ensureMigrationTable(db)

  const migrations = [
    {
      id: '001_meetings_columns',
      run: () => {
        ensureColumn(db, 'meetings', 'document_number', 'document_number TEXT')
        ensureColumn(db, 'meetings', 'document_place', 'document_place TEXT')
        ensureColumn(db, 'meetings', 'document_day', 'document_day INTEGER')
        ensureColumn(db, 'meetings', 'document_month', 'document_month INTEGER')
        ensureColumn(db, 'meetings', 'document_year', 'document_year INTEGER')
        ensureColumn(db, 'meetings', 'start_time', 'start_time TEXT')
        ensureColumn(db, 'meetings', 'end_time', 'end_time TEXT')
        ensureColumn(
          db,
          'meetings',
          'department_id',
          'department_id TEXT REFERENCES departments(id)',
        )
        ensureColumn(db, 'meetings', 'approved_at', 'approved_at TEXT')
        ensureColumn(
          db,
          'meetings',
          'approved_by_id',
          'approved_by_id TEXT REFERENCES users(id)',
        )
      },
    },
    {
      id: '002_tasks_columns_and_backfill',
      run: () => {
        ensureColumn(
          db,
          'tasks',
          'department_id',
          'department_id TEXT REFERENCES departments(id)',
        )
        ensureColumn(
          db,
          'tasks',
          'overseen_by_vice_director_id',
          'overseen_by_vice_director_id TEXT REFERENCES users(id)',
        )
        ensureColumn(
          db,
          'tasks',
          'assigned_by_id',
          'assigned_by_id TEXT REFERENCES users(id)',
        )
        ensureColumn(
          db,
          'tasks',
          'pending_approval_reviewer_id',
          'pending_approval_reviewer_id TEXT REFERENCES users(id)',
        )
        ensureColumn(
          db,
          'tasks',
          'approval_source',
          "approval_source TEXT CHECK(approval_source IN ('assigner_report','vice_line'))",
        )
        ensureColumn(db, 'tasks', 'last_rejection_reason', 'last_rejection_reason TEXT')
        ensureColumn(db, 'tasks', 'report_summary', 'report_summary TEXT')
        ensureColumn(db, 'tasks', 'extended_note', 'extended_note TEXT')

        db.exec(`
          UPDATE tasks
          SET assigned_by_id = creator_id
          WHERE assigned_by_id IS NULL
        `)

        db.exec(`
          UPDATE tasks
          SET department_id = (
            SELECT dept_id FROM users u WHERE u.id = tasks.assignee_id
          )
          WHERE department_id IS NULL
        `)
      },
    },
    {
      id: '003_meeting_minutes_columns',
      run: () => {
        const minuteCols = [
          'section_II_2a',
          'section_II_2b_deaths',
          'section_II_2b_transfers',
          'section_II_2b_discharges',
          'section_II_2c_abnormal',
          'section_II_2c_suggestions',
          'section_III_paraclinical',
          'section_IV_admin_security',
          'section_V_unit_discussion',
          'section_II_old_patient',
          'section_II_admitted',
          'section_II_left',
          'section_II_current',
        ]

        minuteCols.forEach((col) =>
          ensureColumn(db, 'meeting_minutes', col, `${col} TEXT`),
        )

        if (!hasTable(db, 'vice_director_departments')) {
          db.exec(`
            CREATE TABLE IF NOT EXISTS vice_director_departments (
              vice_director_id TEXT NOT NULL REFERENCES users(id),
              department_id TEXT NOT NULL REFERENCES departments(id),
              PRIMARY KEY (vice_director_id, department_id)
            )
          `)
        }

        if (!hasTable(db, 'meeting_attendees')) {
          db.exec(`
            CREATE TABLE IF NOT EXISTS meeting_attendees (
              meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
              user_id TEXT NOT NULL REFERENCES users(id),
              PRIMARY KEY (meeting_id, user_id)
            )
          `)
        }
      },
    },
    {
      id: '004_indexes_hot_queries',
      run: () => {
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_tasks_status_assignee_reviewer_deadline
            ON tasks(status, assignee_id, pending_approval_reviewer_id, deadline);

          CREATE INDEX IF NOT EXISTS idx_tasks_parent
            ON tasks(parent_task_id);

          CREATE INDEX IF NOT EXISTS idx_meetings_date_dept_status
            ON meetings(meeting_date, department_id, status);
        `)
      },
    },
  ]

  for (const migration of migrations) {
    if (isMigrationApplied(db, migration.id)) continue

    const tx = db.transaction(() => {
      migration.run()
      markMigrationApplied(db, migration.id)
    })

    tx()
  }
}

export function genId(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}
