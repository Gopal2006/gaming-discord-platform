export class DomainError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code = "DOMAIN_ERROR",
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(
    public readonly entityName: string,
    public readonly currentState: string,
    public readonly attemptedAction: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Cannot perform action '${attemptedAction}' on entity '${entityName}' in state '${currentState}'`,
      "INVALID_STATE_TRANSITION",
      { entityName, currentState, attemptedAction, ...details },
    );
  }
}

export class InvariantViolationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "INVARIANT_VIOLATION", details);
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(
      `Entity '${entityName}' with ID '${id}' was not found`,
      "ENTITY_NOT_FOUND",
      {
        entityName,
        id,
      },
    );
  }
}

export class TenantMismatchError extends DomainError {
  constructor(expectedTenant: string, actualTenant: string) {
    super(
      `Tenant mismatch: expected '${expectedTenant}', got '${actualTenant}'`,
      "TENANT_MISMATCH",
      {
        expectedTenant,
        actualTenant,
      },
    );
  }
}
