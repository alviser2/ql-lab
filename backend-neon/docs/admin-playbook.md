# Admin Playbook (Neon backend)

Tài liệu nhanh để quản trị user/role theo phân cấp.

## 0) Bootstrap tài khoản quản trị

- Dùng tài khoản bootstrap từ seed để đăng nhập lần đầu.
- Bắt buộc đổi mật khẩu ngay sau lần đăng nhập đầu tiên qua API `PATCH /api/admin/users/:id/password`.
- Không dùng lại mật khẩu mẫu/yếu trên production.

## 1) Khuyến nghị dùng API admin (an toàn hơn)

> Chỉ tài khoản `r-director` mới gọi được các API này.

Base URL: `https://<backend-domain>/api/admin`

### 1.1 Tạo tài khoản mới

`POST /users`

```json
{
  "username": "nv_moi",
  "full_name": "NV Mới",
  "password": "<StrongPassword!2026>",
  "role_id": "r-staff",
  "dept_id": "dept-noi",
  "is_active": true
}
```

Nếu là Thường trực (Key Member):

```json
{
  "username": "pgd_a",
  "full_name": "BS. A",
  "password": "<StrongPassword!2026>",
  "role_id": "r-vice-director",
  "managed_department_ids": ["dept-noi", "dept-ngoai"]
}
```

### 1.2 Đổi mật khẩu user

`PATCH /users/:id/password`

```json
{
  "password": "MatKhauMoi123!"
}
```

### 1.3 Đổi role / phân cấp

`PATCH /users/:id/role`

```json
{
  "role_id": "r-dept-head",
  "dept_id": "dept-hscc"
}
```

Đổi thành Thường trực (Key Member) + gán dự án phụ trách:

```json
{
  "role_id": "r-vice-director",
  "managed_department_ids": ["dept-hscc", "dept-noi"]
}
```

### 1.4 Khóa / mở tài khoản

`PATCH /users/:id/active`

```json
{
  "is_active": false
}
```

### 1.5 Danh sách user hiện tại

`GET /users`

---

## 2) Nếu muốn thao tác trực tiếp SQL trên Neon

## 2.1 Thêm user

> Cần hash mật khẩu bcrypt trước (không lưu plain text).

```sql
insert into users (id, username, full_name, password_hash, role_id, dept_id, is_active)
values (
  'u_custom_01',
  'nv_custom',
  'Nhân viên Custom',
  '<bcrypt_hash>', -- hash đã tạo từ mật khẩu mạnh
  'r-staff',
  'dept-noi',
  true
);
```

## 2.2 Đổi mật khẩu

```sql
update users
set password_hash = '<bcrypt_hash_moi>',
    updated_at = now()
where id = 'u_custom_01';
```

## 2.3 Đổi role

```sql
update users
set role_id = 'r-dept-head',
    dept_id = 'dept-noi',
    updated_at = now()
where id = 'u_custom_01';
```

## 2.4 Gán dự án cho Thường trực (Key Member)

```sql
insert into vice_director_departments (vice_director_id, department_id)
values ('u_vd_01', 'dept-noi')
on conflict (vice_director_id, department_id) do nothing;
```

## 2.5 Khóa tài khoản

```sql
update users set is_active = false, updated_at = now() where id = 'u_custom_01';
```
