# Tách FE/BE để deploy Vercel

> Lưu ý: tài liệu này là bản cũ cho backend SQLite (`backend/`).
> Bản production mới dùng Neon nằm ở: **`backend-neon/README.md`**.

Mình đã tách code thành 2 thư mục độc lập:

- `frontend/` → React + Vite
- `backend/` → Express API

## 1) Deploy Frontend (Vercel)

- Import repo vào Vercel
- Chọn project frontend:
  - **Root Directory:** `frontend`
  - **Build Command:** `npm run build`
  - **Output Directory:** `dist`
- Set Env:
  - `VITE_API_BASE_URL=https://<backend-domain>/api`

## 2) Deploy Backend (Vercel)

- Tạo project thứ 2 từ cùng repo
  - **Root Directory:** `backend`
- `vercel.json` đã route `/api/*` vào `server/index.js`
- Set Env:
  - `NODE_ENV=production`
  - `JWT_SECRET=<strong-secret>`
  - `CORS_ORIGINS=https://<frontend-domain>`
  - `SEED_ON_START=false`

## 3) Cảnh báo quan trọng về DB

Backend hiện đang dùng **SQLite (`better-sqlite3`) + file local**.

- Trên Vercel, filesystem của Function là **ephemeral** (không bền vững)
- => dữ liệu SQLite file **không phù hợp production/persistent** trên Vercel

### Kết luận

- Nếu deploy backend lên Vercel mà vẫn dùng SQLite file: chỉ phù hợp demo/test ngắn hạn.
- Muốn production bền vững: cần migrate DB sang managed DB server (Postgres/MySQL/Supabase/Neon...).

## 4) Có cần tách FE/BE không?

- **Không bắt buộc** về mặt kỹ thuật.
- Nhưng với Vercel + backend API riêng + DB server, **nên tách** để:
  - quản lý env dễ hơn,
  - deploy rollback độc lập,
  - scale độc lập.

=> Với case của bạn, tách như trên là hợp lý.
