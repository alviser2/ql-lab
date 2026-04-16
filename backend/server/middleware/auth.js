import jwt from 'jsonwebtoken'
import { forbidden, unauthorized } from '../lib/http.js'

const isProduction = process.env.NODE_ENV === 'production'
const configuredSecret = process.env.JWT_SECRET

if (isProduction && !configuredSecret) {
  throw new Error('JWT_SECRET is required in production')
}

const JWT_SECRET = configuredSecret || 'giao-ban-secret-key-2026'

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'TOKEN_MISSING', 'Không có token truy cập')
  }
  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.userId
    req.userRole = payload.role
    next()
  } catch {
    return unauthorized(res, 'TOKEN_INVALID', 'Token không hợp lệ hoặc đã hết hạn')
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return forbidden(res, 'FORBIDDEN_ROLE', 'Không có quyền truy cập tài nguyên này')
    }
    next()
  }
}

export { JWT_SECRET }
