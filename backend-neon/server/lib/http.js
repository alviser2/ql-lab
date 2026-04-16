export function fail(res, status, code, message, details) {
  const body = { code, message }
  if (details !== undefined) body.details = details
  return res.status(status).json(body)
}

export function badRequest(res, code, message, details) {
  return fail(res, 400, code, message, details)
}

export function unauthorized(
  res,
  code = 'UNAUTHORIZED',
  message = 'Bạn chưa đăng nhập hoặc phiên đã hết hạn',
) {
  return fail(res, 401, code, message)
}

export function forbidden(
  res,
  code = 'FORBIDDEN',
  message = 'Bạn không có quyền thực hiện thao tác này',
) {
  return fail(res, 403, code, message)
}

export function notFound(
  res,
  code = 'NOT_FOUND',
  message = 'Không tìm thấy dữ liệu',
) {
  return fail(res, 404, code, message)
}
