// Errors thrown by the API carry a friendly `message` and, for order
// problems, a machine-readable `hint` (e.g. "out_of_stock").
export class ApiError extends Error {
  constructor(message, { hint, code, cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.hint = hint
    this.code = code
    this.cause = cause
  }
}

// Postgres errors whose message is safe and meant for end users.
export const FRIENDLY_HINTS = new Set([
  'invalid_input',
  'invalid_items',
  'out_of_stock',
  'below_minimum',
  'too_many_pending',
  'not_found',
  'invalid_status',
  'stock_changed',
])

export function toApiError(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return new ApiError(fallback)
  if (err instanceof ApiError) return err
  const hint = err.hint || undefined
  const code = err.code || undefined
  if (FRIENDLY_HINTS.has(hint)) return new ApiError(err.message, { hint, code, cause: err })
  if (code === '42501' || /not authori[sz]ed|permission denied|row-level security/i.test(err.message || '')) {
    return new ApiError('You do not have permission to do that.', { code: '42501', cause: err })
  }
  if (code === '23505') return new ApiError('That already exists — please use a different name or link.', { code, cause: err })
  return new ApiError(err.message || fallback, { hint, code, cause: err })
}
