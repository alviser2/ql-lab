# Quản Lý Lab Frontend (React + Vite)

## Local dev

```bash
npm install
npm run dev
```

Tạo `.env` từ `.env.example` và set API backend:

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## Build

```bash
npm run build
npm run preview
```

## Deploy Vercel

- Framework preset: **Vite**
- Root Directory: `frontend`
- Env var production:
  - `VITE_API_BASE_URL=https://qll.ibme.edu.vn/api`
