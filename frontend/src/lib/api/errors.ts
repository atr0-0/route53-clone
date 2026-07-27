// Mirrors the backend's one-error-shape invariant (NFR-3): { error: { code,
// message, field } }. One parser here, reused everywhere a mutation surfaces
// an error — matches "one error shape, one handler" on the frontend too.
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    field: string | null;
  };
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const inner = (value as { error: unknown }).error;
  return typeof inner === "object" && inner !== null && "message" in inner;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  return isApiErrorBody(error) ? error.error.message : fallback;
}

export function getApiErrorField(error: unknown): string | null {
  return isApiErrorBody(error) ? error.error.field : null;
}

export function getApiErrorCode(error: unknown): string | null {
  return isApiErrorBody(error) ? error.error.code : null;
}
