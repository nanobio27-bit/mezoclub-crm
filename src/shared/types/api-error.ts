export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, code = 'VALIDATION_ERROR', details?: Record<string, string>) {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(message = 'Unauthorized', code = 'AUTH_INVALID_CREDENTIALS') {
    return new ApiError(401, code, message);
  }

  static forbidden(message = 'Forbidden', code = 'AUTH_FORBIDDEN') {
    return new ApiError(403, code, message);
  }

  static notFound(message = 'Not found', code = 'NOT_FOUND') {
    return new ApiError(404, code, message);
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new ApiError(409, code, message);
  }
}
