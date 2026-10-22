export class ApplicationError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code = "APPLICATION_ERROR",
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(reason: string, details?: Record<string, unknown>) {
    super(`Action unauthorized: ${reason}`, "UNAUTHORIZED", details);
  }
}

export class PolicyViolationError extends ApplicationError {
  public readonly reasonCode: string;

  constructor(
    reasonCode: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message, reasonCode, details);
    this.reasonCode = reasonCode;
  }
}

export class ResourceNotFoundError extends ApplicationError {
  constructor(resourceType: string, id: string) {
    super(`${resourceType} with ID '${id}' not found`, "RESOURCE_NOT_FOUND", {
      resourceType,
      id,
    });
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONFLICT", details);
  }
}
