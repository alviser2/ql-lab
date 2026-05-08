# Quản Lý Lab Web (Split Deploy)

Repo hiện được tối giản cho mô hình deploy tách FE/BE:

- `frontend/` → React + Vite (deploy FE)
- `backend-neon/` → Express + PostgreSQL/Neon (deploy BE)

> Các phần legacy trùng lặp (`src/`, `server/`, `backend/`, root app) đã được dọn khỏi repo để tránh nhầm luồng deploy.

## Deploy nhanh

### Frontend
Xem: `frontend/README.md`

### Backend (Neon)
Xem: `backend-neon/README.md`

## Checklist bảo mật production

- Chỉ set secret trên platform env (Vercel/host), không commit `.env`
- `JWT_SECRET` phải là secret mạnh, không dùng mặc định
- `DATABASE_URL` dùng user runtime tối thiểu quyền (không dùng owner)
- `CORS_ORIGINS` chỉ whitelist domain FE thật
- Đổi/xóa tài khoản demo sau khi chạy production ổn định
