/**
 * 自定义异常类 - 简化版
 */

import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class AppError extends Error {
  constructor(
    message: string,
    public status: ContentfulStatusCode = 500,
    public originalError?: Error
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class AuthError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 401, originalError)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string) {
    super(message, 401)
  }
}

export class ProxyError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 502, originalError)
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
  }
}