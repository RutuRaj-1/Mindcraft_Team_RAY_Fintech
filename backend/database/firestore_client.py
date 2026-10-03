"""
FinFlow AI — Firestore Client
=============================
Dual-mode database client:
  1. Live Firebase Firestore (when credentials / FIRESTORE_EMULATOR_HOST is set)
  2. Zero-dependency in-memory store (DEMO_MODE fallback)

This module is the ONLY place that imports `firebase_admin.firestore`.
All business logic goes through repository classes, never this client directly.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Emulator support — set BEFORE firebase_admin is initialised
# ---------------------------------------------------------------------------
_emulator_host = os.environ.get("FIRESTORE_EMULATOR_HOST", "")
if _emulator_host:
    # firebase-admin reads this env var automatically
    os.environ["FIRESTORE_EMULATOR_HOST"] = _emulator_host
    logger.info("Firestore emulator mode: %s", _emulator_host)


class _InMemoryStore:
    """Thread-safe in-memory fallback store used when Firestore is unavailable."""

    def __init__(self) -> None:
        self._data: Dict[str, Dict[str, Dict[str, Any]]] = {}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _col(self, collection: str) -> Dict[str, Dict[str, Any]]:
        if collection not in self._data:
            self._data[collection] = {}
        return self._data[collection]

    @staticmethod
    def _serialize(data: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize datetime objects to ISO strings for consistency."""
        out: Dict[str, Any] = {}
        for k, v in data.items():
            if isinstance(v, datetime):
                out[k] = v.isoformat()
            elif isinstance(v, dict):
                out[k] = _InMemoryStore._serialize(v)
            else:
                out[k] = v
        return out

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    def set(self, collection: str, doc_id: str, data: Dict[str, Any]) -> None:
        self._col(collection)[doc_id] = self._serialize(data)

    def get(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        return self._col(collection).get(doc_id)

    def update(self, collection: str, doc_id: str, updates: Dict[str, Any]) -> bool:
        col = self._col(collection)
        if doc_id not in col:
            return False
        col[doc_id].update(self._serialize(updates))
        return True

    def delete(self, collection: str, doc_id: str) -> None:
        self._col(collection).pop(doc_id, None)

    def list(
        self,
        collection: str,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
        start_after: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        items = list(self._col(collection).values())

        # Filter
        if filters:
            items = [
                item for item in items
                if all(item.get(k) == v for k, v in filters.items())
            ]

        # Order
        if order_by:
            reverse = order_by.startswith("-")
            field = order_by.lstrip("-")
            items = sorted(items, key=lambda x: x.get(field, ""), reverse=reverse)

        # Pagination
        if start_after:
            ids = [
                doc_id for doc_id, doc in self._col(collection).items()
                if doc in items
            ]
            try:
                idx = ids.index(start_after)
                items = items[idx + 1:]
            except ValueError:
                pass

        if limit:
            items = items[:limit]

        return items

    def transaction_update(
        self, collection: str, doc_id: str, updates: Dict[str, Any]
    ) -> bool:
        """Atomic update (in-memory: same as update, transactions not needed)."""
        return self.update(collection, doc_id, updates)

    def count(self, collection: str, filters: Optional[Dict[str, Any]] = None) -> int:
        return len(self.list(collection, filters=filters))


class FirestoreClient:
    """
    Unified Firestore client.

    Route handlers and service modules MUST NOT import this directly.
    Use the repository layer instead.
    """

    def __init__(self) -> None:
        self._memory = _InMemoryStore()
        self._db = None  # firebase_admin.firestore.Client or None
        self._use_firestore = False
        self._init_firebase()

    # ------------------------------------------------------------------
    # Initialization
    # ------------------------------------------------------------------

    def _init_firebase(self) -> None:
        try:
            from backend.auth.firebase_auth import firebase_initialized  # type: ignore

            if not firebase_initialized:
                logger.info("Firebase not initialized; using in-memory store.")
                return

            from firebase_admin import firestore  # type: ignore

            self._db = firestore.client()
            self._use_firestore = True
            mode = "emulator" if _emulator_host else "live"
            logger.info("FirestoreClient connected (%s mode).", mode)

        except ImportError:
            logger.warning("firebase_admin not installed; using in-memory store.")
        except Exception as exc:  # pylint: disable=broad-except
            logger.warning(
                "Firestore init failed (%s); falling back to in-memory store.", exc
            )

    # ------------------------------------------------------------------
    # Public CRUD API (used exclusively by repository classes)
    # ------------------------------------------------------------------

    def set(self, collection: str, doc_id: str, data: Dict[str, Any]) -> None:
        """Create or fully replace a document."""
        self._memory.set(collection, doc_id, data)
        if self._use_firestore:
            try:
                self._db.collection(collection).document(doc_id).set(data)
            except Exception as exc:  # pylint: disable=broad-except
                logger.error("Firestore set error [%s/%s]: %s", collection, doc_id, exc)

    def get(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        """Return a single document by ID, or None."""
        if self._use_firestore:
            try:
                snap = self._db.collection(collection).document(doc_id).get()
                if snap.exists:
                    doc = snap.to_dict()
                    self._memory.set(collection, doc_id, doc)  # warm cache
                    return doc
                return None
            except Exception as exc:  # pylint: disable=broad-except
                logger.error("Firestore get error [%s/%s]: %s", collection, doc_id, exc)

        return self._memory.get(collection, doc_id)

    def update(
        self,
        collection: str,
        doc_id: str,
        updates: Dict[str, Any],
    ) -> bool:
        """
        Partial update (merge). Returns True if document existed.
        Always stamps updatedAt.
        """
        updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
        self._memory.update(collection, doc_id, updates)

        if self._use_firestore:
            try:
                from google.cloud.firestore_v1 import SERVER_TIMESTAMP  # type: ignore

                ref = self._db.collection(collection).document(doc_id)
                ref.update(updates)
                return True
            except Exception as exc:  # pylint: disable=broad-except
                logger.error(
                    "Firestore update error [%s/%s]: %s", collection, doc_id, exc
                )
                return False

        return True

    def delete(self, collection: str, doc_id: str) -> None:
        """Delete a document. NOT exposed on audit_logs."""
        self._memory.delete(collection, doc_id)
        if self._use_firestore:
            try:
                self._db.collection(collection).document(doc_id).delete()
            except Exception as exc:  # pylint: disable=broad-except
                logger.error(
                    "Firestore delete error [%s/%s]: %s", collection, doc_id, exc
                )

    def list(
        self,
        collection: str,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
        start_after: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Query a collection with optional equality filters, ordering, and pagination.

        Args:
            collection:   Firestore collection name.
            filters:      {field: value} equality filters.
            order_by:     Field name to sort by. Prefix with '-' for descending.
            limit:        Maximum number of results.
            start_after:  Document ID cursor for pagination.
        """
        if self._use_firestore:
            try:
                return self._list_firestore(
                    collection, filters, order_by, limit, start_after
                )
            except Exception as exc:  # pylint: disable=broad-except
                logger.error("Firestore list error [%s]: %s", collection, exc)

        return self._memory.list(
            collection,
            filters=filters,
            order_by=order_by,
            limit=limit,
            start_after=start_after,
        )

    def _list_firestore(
        self,
        collection: str,
        filters: Optional[Dict[str, Any]],
        order_by: Optional[str],
        limit: Optional[int],
        start_after: Optional[str],
    ) -> List[Dict[str, Any]]:
        query = self._db.collection(collection)

        if filters:
            for field, value in filters.items():
                query = query.where(field, "==", value)

        if order_by:
            from google.cloud.firestore_v1 import Query  # type: ignore

            if order_by.startswith("-"):
                query = query.order_by(order_by[1:], direction=Query.DESCENDING)
            else:
                query = query.order_by(order_by)

        if start_after:
            cursor_snap = (
                self._db.collection(collection).document(start_after).get()
            )
            if cursor_snap.exists:
                query = query.start_after(cursor_snap)

        if limit:
            query = query.limit(limit)

        docs = query.stream()
        results = [d.to_dict() for d in docs]

        # Warm in-memory cache
        for doc in results:
            doc_id = (
                doc.get("applicationId")
                or doc.get("userId")
                or doc.get("auditId")
                or ""
            )
            if doc_id:
                self._memory.set(collection, doc_id, doc)

        return results

    def transactional_update(
        self,
        collection: str,
        doc_id: str,
        updates: Dict[str, Any],
    ) -> bool:
        """
        Runs a Firestore transaction for consistent reads + writes.
        Falls back to a regular update when using in-memory store.
        """
        updates["updatedAt"] = datetime.now(timezone.utc).isoformat()

        if self._use_firestore:
            try:

                @self._db.transaction()
                def _txn(transaction, ref):  # type: ignore
                    snap = ref.get(transaction=transaction)
                    if not snap.exists:
                        return False
                    transaction.update(ref, updates)
                    return True

                ref = self._db.collection(collection).document(doc_id)
                result = _txn(ref)
                self._memory.update(collection, doc_id, updates)
                return result
            except Exception as exc:  # pylint: disable=broad-except
                logger.error(
                    "Firestore transaction error [%s/%s]: %s", collection, doc_id, exc
                )
                return False

        return self._memory.update(collection, doc_id, updates)

    def count(
        self, collection: str, filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """Return count of matching documents."""
        return len(self.list(collection, filters=filters))

    @property
    def using_firestore(self) -> bool:
        return self._use_firestore

    @property
    def using_emulator(self) -> bool:
        return self._use_firestore and bool(_emulator_host)


# ---------------------------------------------------------------------------
# Singleton — import this in repository classes
# ---------------------------------------------------------------------------
firestore_client = FirestoreClient()

# ---------------------------------------------------------------------------
# Backwards-compatible alias so existing code that imports `db` still works
# during the migration period.
# ---------------------------------------------------------------------------


class _LegacyAdapter:
    """Thin shim to make old `db.set / db.get / db.list / db.delete` calls work."""

    def set(self, collection: str, doc_id: str, data: Dict[str, Any]) -> None:
        firestore_client.set(collection, doc_id, data)

    def get(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        return firestore_client.get(collection, doc_id)

    def list(
        self,
        collection: str,
        filter_by: Optional[Dict[str, Any]] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        f = filters if filters is not None else filter_by
        return firestore_client.list(collection, filters=f)

    def delete(self, collection: str, doc_id: str) -> None:
        firestore_client.delete(collection, doc_id)


db = _LegacyAdapter()
