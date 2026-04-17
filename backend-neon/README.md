# Giao Ban Backend (Neon/PostgreSQL)

Backend mới tách riêng cho Neon, giữ API path giống frontend đang gọi:

- `/api/auth/login`
- `/api/auth/me`
- `/api/users`
- `/api/departments`
- `/api/tasks`
- `/api/meetings`
- `/api/kpi/*`

## 1) Tạo DB trên Neon

1. Vào Neon, tạo project/database mới.
2. Mở **SQL Editor**.
3. Copy toàn bộ file `db/schema.sql` và chạy.
4. Lấy `DATABASE_URL` (connection string có `sslmode=require`).

## 2) Chạy local

```bash
npm install
cp .env.example .env
# sửa DATABASE_URL, JWT_SECRET
npm run dev
```

Health check:

- `GET http://localhost:3001/api/health`

Demo account (seed sẵn):

- `director / 123456`
- `admin / Admin@123456` (**admin hệ thống để quản trị user/role**)
- `vicedir / 123456`
- `tk_noi / 123456`
- `tk_nct / 123456`
- `nv_trang / 123456`

## 3) Deploy Vercel

- Import thư mục `backend-neon` thành 1 project riêng trên Vercel.
- Framework: Other.
- Build command: để trống (Vercel Node serverless sẽ dùng `server/index.js`).
- Thêm env ở Vercel:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CORS_ORIGINS` (ví dụ domain frontend Vercel)
  - `NODE_ENV=production`

`vercel.json` đã map `/api/*` về `server/index.js`.

## 4) Frontend trỏ sang backend mới

Trong project frontend, đặt:

- `VITE_API_BASE_URL=https://<backend-neon-vercel-domain>/api`

sau đó redeploy frontend.

## 5) Trang FE quản trị (Admin)

Frontend đã có trang `/admin` (chỉ role `r-director` thấy trong menu) để:

- tạo tài khoản
- đổi mật khẩu
- đổi role/phân cấp
- khóa/mở tài khoản
- xóa tài khoản (soft delete)

## 6) Quản trị user/role sau này

Xem file `docs/admin-playbook.md` để có câu SQL mẫu:

- thêm tài khoản
- đổi mật khẩu
- khóa/mở user
- đổi role
- gán khoa cho phó giám đốc
