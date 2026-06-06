export type ErrorMetadata = Record<string, unknown>;

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly metadata?: ErrorMetadata;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string = 'INTERNAL_SERVER_ERROR',
    statusCode: number = 500,
    metadata?: ErrorMetadata
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      metadata: this.metadata,
      stack: process.env.NODE_ENV !== 'production' ? this.stack : undefined,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, 'VALIDATION_ERROR', 400, metadata);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, 'DATABASE_ERROR', 500, metadata);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', metadata?: ErrorMetadata) {
    super(message, 'AUTHENTICATION_ERROR', 401, metadata);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', metadata?: ErrorMetadata) {
    super(message, 'AUTHORIZATION_ERROR', 403, metadata);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, metadata);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', metadata?: ErrorMetadata) {
    super(message, 'RATE_LIMIT_ERROR', 429, metadata);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, 'CONFLICT_ERROR', 409, metadata);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, 'NOT_FOUND_ERROR', 404, metadata);
  }
}
