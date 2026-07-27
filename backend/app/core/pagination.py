"""Page[T] envelope and offset pagination parsing (NFR-2, DD-13). One envelope,
one shape, used identically by every list endpoint."""

import math
from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel

T = TypeVar("T")

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int
    total_pages: int


def make_page(items: list, *, page: int, page_size: int, total: int) -> dict:
    """Returns a plain dict rather than a parametrized `Page[T]` instance — Pydantic
    generics need a concrete type at `__class_getitem__` time, which a runtime
    TypeVar inside a generic helper function can't provide. Each router declares
    `response_model=Page[XResponse]`, which validates this dict shape against the
    concrete type."""
    total_pages = math.ceil(total / page_size) if total else 0
    return {"items": items, "page": page, "page_size": page_size, "total": total, "total_pages": total_pages}


class PaginationParams:
    def __init__(
        self,
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    ) -> None:
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
