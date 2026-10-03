"""
FinFlow AI — Repository Base
============================
Abstract base class for all Firestore repository implementations.
Provides common CRUD, pagination, and timestamp helpers.
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from pydantic import BaseModel

from backend.database.firestore_client import firestore_client

M = TypeVar("M", bound=BaseModel)


def utc_now() -> str:
    """Return current UTC time as ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str = "") -> str:
    """Generate a short unique document ID with an optional prefix."""
    uid = uuid.uuid4().hex[:12]
    return f"{prefix}{uid}" if prefix else uid


class BaseRepository(ABC, Generic[M]):
    """
    Abstract repository providing typed CRUD over a Firestore collection.

    Subclasses define:
      - COLLECTION: str  — Firestore collection name
      - MODEL: Type[M]   — Pydantic model class for this collection
    """

    COLLECTION: str
    MODEL: Type[M]

    def __init__(self) -> None:
        self._client = firestore_client

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _to_dict(self, model: M) -> Dict[str, Any]:
        """Serialize model to a plain dict (by alias)."""
        return model.model_dump(by_alias=False)

    def _from_dict(self, data: Dict[str, Any]) -> M:
        return self.MODEL(**data)

    # ------------------------------------------------------------------
    # Core CRUD
    # ------------------------------------------------------------------

    def create(self, model: M) -> M:
        """Persist a new document. Raises ValueError if ID already exists."""
        data = self._to_dict(model)
        doc_id = self._doc_id(data)
        if self._client.get(self.COLLECTION, doc_id) is not None:
            raise ValueError(
                f"Document already exists: {self.COLLECTION}/{doc_id}"
            )
        self._client.set(self.COLLECTION, doc_id, data)
        return model

    def upsert(self, model: M) -> M:
        """Create or fully replace a document."""
        data = self._to_dict(model)
        doc_id = self._doc_id(data)
        self._client.set(self.COLLECTION, doc_id, data)
        return model

    def get(self, doc_id: str) -> Optional[M]:
        """Fetch a single document by ID, or None."""
        data = self._client.get(self.COLLECTION, doc_id)
        if data is None:
            return None
        return self._from_dict(data)

    def get_or_raise(self, doc_id: str) -> M:
        """Fetch or raise KeyError."""
        model = self.get(doc_id)
        if model is None:
            raise KeyError(f"{self.COLLECTION}/{doc_id} not found")
        return model

    def update(self, doc_id: str, updates: Dict[str, Any]) -> bool:
        """
        Partial update.  Raises PermissionError for append-only collections.
        """
        self._guard_update()
        return self._client.update(self.COLLECTION, doc_id, updates)

    def transactional_update(self, doc_id: str, updates: Dict[str, Any]) -> bool:
        """Consistent read-then-write update wrapped in a Firestore transaction."""
        self._guard_update()
        return self._client.transactional_update(self.COLLECTION, doc_id, updates)

    def delete(self, doc_id: str) -> None:
        """Delete a document. Raises PermissionError for append-only collections."""
        self._guard_delete()
        self._client.delete(self.COLLECTION, doc_id)

    def list(
        self,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
        start_after: Optional[str] = None,
    ) -> List[M]:
        """
        List documents with optional filtering, sorting, and pagination.

        Args:
            filters:    Equality filters {field: value}.
            order_by:   Field name; prefix '-' for descending order.
            limit:      Max results.
            start_after: Document ID cursor for keyset pagination.
        """
        rows = self._client.list(
            self.COLLECTION,
            filters=filters,
            order_by=order_by,
            limit=limit,
            start_after=start_after,
        )
        return [self._from_dict(r) for r in rows]

    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        return self._client.count(self.COLLECTION, filters=filters)

    # ------------------------------------------------------------------
    # Abstract helpers
    # ------------------------------------------------------------------

    @abstractmethod
    def _doc_id(self, data: Dict[str, Any]) -> str:
        """Extract the document ID from the serialized model dict."""

    # ------------------------------------------------------------------
    # Guards (overridden by append-only repos)
    # ------------------------------------------------------------------

    def _guard_update(self) -> None:
        """Override to block update operations."""

    def _guard_delete(self) -> None:
        """Override to block delete operations."""
