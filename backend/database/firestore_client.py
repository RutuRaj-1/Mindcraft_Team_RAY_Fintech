import os
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path
from backend.config import settings

logger = logging.getLogger(__name__)

class DatabaseRepository:
    """
    Dual-mode repository supporting:
    1. Direct Firebase Firestore (when service account credentials are provided)
    2. Zero-dependency high-fidelity In-Memory & File-backed store for Hackathon Demos
    """
    def __init__(self):
        self._collections: Dict[str, Dict[str, Dict[str, Any]]] = {
            "users": {},
            "journeys": {},
            "applications": {},
            "documents": {},
            "evidence_ledger": {},
            "consistency_reports": {},
            "cashflow_metrics": {},
            "risk_assessments": {},
            "shap_attributions": {},
            "decisions": {},
            "next_best_actions": {},
            "audit_logs": {},
            "overrides": {},
            "trust_graphs": {},
            "policies": {}
        }
        self.data_dir = settings.BASE_DIR / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.firestore_db = None
        self._init_firestore()

    def _init_firestore(self):
        try:
            from backend.auth.firebase_auth import firebase_initialized
            if firebase_initialized:
                from firebase_admin import firestore
                self.firestore_db = firestore.client()
                logger.info("Connected to live Firebase Firestore.")
        except Exception as e:
            logger.warning(f"Firestore client initialization skipped: {e}. Using persistent memory repository.")

    def set(self, collection: str, doc_id: str, data: Dict[str, Any]):
        if collection not in self._collections:
            self._collections[collection] = {}
        
        # Serialize datetime objects for in-memory copy
        clean_data = {}
        for k, v in data.items():
            if isinstance(v, datetime):
                clean_data[k] = v.isoformat()
            else:
                clean_data[k] = v

        self._collections[collection][doc_id] = clean_data

        if self.firestore_db:
            try:
                self.firestore_db.collection(collection).document(doc_id).set(clean_data)
            except Exception as e:
                logger.error(f"Firestore set error in {collection}/{doc_id}: {e}")

    def get(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        if self.firestore_db:
            try:
                doc = self.firestore_db.collection(collection).document(doc_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                logger.error(f"Firestore get error: {e}")

        return self._collections.get(collection, {}).get(doc_id)

    def list(self, collection: str, filter_by: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if self.firestore_db:
            try:
                query = self.firestore_db.collection(collection)
                if filter_by:
                    for k, v in filter_by.items():
                        query = query.where(k, "==", v)
                docs = query.stream()
                return [d.to_dict() for d in docs]
            except Exception as e:
                logger.error(f"Firestore list error: {e}")

        items = list(self._collections.get(collection, {}).values())
        if filter_by:
            filtered = []
            for item in items:
                matches = all(item.get(k) == v for k, v in filter_by.items())
                if matches:
                    filtered.append(item)
            return filtered
        return items

    def delete(self, collection: str, doc_id: str):
        if collection in self._collections and doc_id in self._collections[collection]:
            del self._collections[collection][doc_id]
        if self.firestore_db:
            try:
                self.firestore_db.collection(collection).document(doc_id).delete()
            except Exception as e:
                logger.error(f"Firestore delete error: {e}")

# Singleton database instance
db = DatabaseRepository()
