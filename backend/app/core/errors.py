"""Typed DomainError hierarchy -> one FastAPI exception handler -> the NFR-3 body.

Routers never hand-build error responses (invariant 7). `code` is AWS-shaped so the
frontend can branch on it; `field` names the offending input so the error attaches to
the right FormField rather than only raising a toast.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class DomainError(Exception):
    code: str = "InternalError"
    status_code: int = 500
    default_message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None, field: str | None = None) -> None:
        self.message = message or self.default_message
        self.field = field
        super().__init__(self.message)


class NotAuthenticatedError(DomainError):
    code = "NotAuthenticated"
    status_code = 401
    default_message = "Not authenticated."


class NoSuchHostedZoneError(DomainError):
    code = "NoSuchHostedZone"
    status_code = 404
    default_message = "No such hosted zone."


class NoSuchRecordError(DomainError):
    code = "NoSuchRecord"
    status_code = 404
    default_message = "No such record."


class ConflictingDomainExistsError(DomainError):
    code = "ConflictingDomainExists"
    status_code = 409
    # [UNVERIFIED] — UI spec §7 copy deck
    default_message = "A hosted zone with the specified name already exists."


class HostedZoneNotEmptyError(DomainError):
    code = "HostedZoneNotEmpty"
    status_code = 409
    # [VERIFIED] — verbatim AWS message, UI spec §7 / FR-B18. Raised starting Slice 5.
    default_message = (
        "The specified hosted zone contains non-required resource record sets "
        "and so cannot be deleted."
    )


class RecordSetAlreadyExistsError(DomainError):
    code = "RecordSetAlreadyExists"
    status_code = 409
    default_message = "A record set with this name, type, and identifier already exists."


class InvalidChangeBatchError(DomainError):
    code = "InvalidChangeBatch"
    status_code = 400
    default_message = "The change batch is invalid."


class LimitsExceededError(DomainError):
    code = "LimitsExceeded"
    status_code = 400
    default_message = "A Route 53 quota has been exceeded."


class InvalidInputError(DomainError):
    code = "InvalidInput"
    status_code = 422
    default_message = "The request could not be validated."


def _error_body(code: str, message: str, field: str | None = None) -> dict:
    return {"error": {"code": code, "message": message, "field": field}}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.code, exc.message, exc.field),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = exc.errors()
        first = errors[0] if errors else {}
        field = ".".join(str(p) for p in first.get("loc", ()) if p != "body") or None
        message = first.get("msg", "Validation failed.")
        return JSONResponse(
            status_code=422,
            content=_error_body("InvalidInput", message, field),
        )
