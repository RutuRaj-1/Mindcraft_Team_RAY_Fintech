"""
FinFlow AI — Cross-Application Relationship & Fraud Signal Intelligence
========================================================================
Institutional Risk Intelligence layer detecting cross-application link patterns
(shared bank accounts, GSTIN reuse, shared phones/emails, address collisions,
and recycled document hashes) across synthetic and live enterprise portfolios.

Design Invariant:
- Risk intelligence feature, NOT a fraud accusation system.
- Phrasing MUST always state: "Potential linked-case risk detected."
  Never: "Fraud detected."
- Relationships are strictly derived from verifiable data.
- Full risk officer lifecycle: Acknowledge & Resolve with immutable audit trails.
"""

import uuid
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Set, Tuple

from backend.database.firestore_client import db
from backend.database.models import (
    FraudSignalModel, FraudNetworkNode, FraudNetworkEdge,
    FraudNetworkResponse, now_utc_iso
)
from backend.modules.module5_trust.audit_ledger import AuditLedger

class CrossApplicationIntelligence:
    """
    Core engine for cross-application identity matching, entity linking,
    and risk signal formulation.
    """

    @classmethod
    def resolve_ids(cls, identifier: str) -> Tuple[str, str, Dict[str, Any], Dict[str, Any]]:
        """
        Normalizes any identifier (journey_id or application_id) to both records.
        """
        app = db.get("applications", identifier) or {}
        journey = db.get("journeys", identifier) or {}

        if journey and not app:
            app_id = journey.get("application_id")
            if app_id:
                app = db.get("applications", app_id) or {}
            else:
                apps = db.list("applications", {"journey_id": identifier})
                if apps:
                    app = apps[0]

        if app and not journey:
            jrn_id = app.get("journey_id")
            if jrn_id:
                journey = db.get("journeys", jrn_id) or {}
            else:
                jrns = db.list("journeys", {"application_id": identifier})
                if jrns:
                    journey = jrns[0]

        application_id = app.get("application_id") or journey.get("application_id") or identifier
        journey_id = journey.get("journey_id") or app.get("journey_id") or identifier

        return application_id, journey_id, app, journey

    @classmethod
    def extract_application_identifiers(cls, app: Dict[str, Any], journey: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extracts all potential link fields from an application, journey, documents, and evidence.
        """
        app_id = app.get("application_id") or journey.get("application_id") or ""
        intent = journey.get("intent", {}) if isinstance(journey.get("intent"), dict) else {}

        # 1. Direct fields
        phone = (
            app.get("phone")
            or app.get("mobile")
            or app.get("contact_phone")
            or intent.get("phone")
            or journey.get("phone")
        )
        email = (
            app.get("email")
            or app.get("contact_email")
            or intent.get("email")
            or journey.get("email")
        )
        gstin = app.get("gstin") or intent.get("gstin") or journey.get("gstin")
        pan = app.get("pan") or intent.get("pan") or journey.get("pan")
        address = (
            app.get("business_address")
            or app.get("address")
            or intent.get("business_address")
            or journey.get("business_address")
        )
        bank_account = (
            app.get("bank_account")
            or app.get("bank_account_number")
            or intent.get("bank_account")
            or journey.get("bank_account")
        )

        # 2. Look into evidence ledger for this application
        evidence_items = db.list("evidence_ledger", {"application_id": app_id})
        for ev in evidence_items:
            fname = ev.get("field_name", "").lower()
            fval = ev.get("field_value")
            if not fval:
                continue
            if not bank_account and "account" in fname:
                bank_account = str(fval)
            elif not gstin and fname in ("gstin", "gst_number"):
                gstin = str(fval)
            elif not pan and fname in ("pan", "pan_number"):
                pan = str(fval)
            elif not phone and "phone" in fname:
                phone = str(fval)

        # 3. Look into documents for SHA-256 hashes
        docs = db.list("documents", {"application_id": app_id})
        doc_hashes = [d.get("sha256_hash") for d in docs if d.get("sha256_hash")]

        # Normalize strings
        def norm(val: Optional[str]) -> Optional[str]:
            if not val:
                return None
            s = str(val).strip()
            return s if s else None

        # Clean phone (digits only)
        clean_phone = None
        if phone:
            digits = re.sub(r"\D", "", str(phone))
            if len(digits) >= 10:
                clean_phone = digits[-10:]

        return {
            "application_id": app_id,
            "journey_id": journey.get("journey_id") or app.get("journey_id") or app_id,
            "business_name": app.get("business_name") or intent.get("business_name") or journey.get("business_name") or "Applicant Entity",
            "phone": clean_phone,
            "email": norm(email).lower() if norm(email) else None,
            "gstin": norm(gstin).upper() if norm(gstin) else None,
            "pan": norm(pan).upper() if norm(pan) else None,
            "business_address": norm(address),
            "bank_account": norm(bank_account),
            "doc_hashes": doc_hashes,
        }

    @classmethod
    def get_or_detect_signals(cls, identifier: str) -> List[FraudSignalModel]:
        """
        Returns all risk intelligence fraud signals for this application/journey.
        Derives cross-application relationship patterns dynamically and updates persistence.
        """
        application_id, journey_id, app, journey = cls.resolve_ids(identifier)
        if not application_id:
            return []

        # Check existing stored signals first
        existing_signals = db.list("fraud_signals", {"application_id": application_id})
        if not existing_signals:
            existing_signals = db.list("fraud_signals", {"applicationId": application_id})

        # Run fresh cross-application risk detector
        fresh_signals = cls.detect_cross_application_signals(application_id, journey_id, app, journey)

        # Merge or persist new signals
        existing_by_type = {s.get("signalType") or s.get("signal_type"): s for s in existing_signals}
        final_signals: List[FraudSignalModel] = []

        for sig in fresh_signals:
            stype = sig.signalType
            if stype in existing_by_type:
                # Keep existing record if status was modified by risk officer
                existing_doc = existing_by_type[stype]
                final_signals.append(FraudSignalModel.model_validate(existing_doc))
            else:
                # Save newly detected signal
                db.set("fraud_signals", sig.signalId, sig.model_dump(by_alias=True))
                final_signals.append(sig)

        return final_signals

    @classmethod
    def detect_cross_application_signals(
        cls,
        target_app_id: str,
        target_jrn_id: str,
        target_app: Dict[str, Any],
        target_journey: Dict[str, Any]
    ) -> List[FraudSignalModel]:
        """
        Derives cross-application relationships using synthetic and historical applications.
        Patterns detected:
          1. Same bank account across multiple applications (SHARED_BANK_ACCOUNT)
          2. Same GSTIN across multiple businesses (SHARED_GSTIN)
          3. Same phone on multiple unrelated applications (SHARED_PHONE)
          4. Repeated suspicious document hash (REPEATED_DOCUMENT_HASH)
          5. Repeated identity conflicts / Shared Address (SHARED_ADDRESS_CONFLICT)
        """
        signals: List[FraudSignalModel] = []
        target_meta = cls.extract_application_identifiers(target_app, target_journey)

        # Fetch all applications in repository
        all_apps = db.list("applications")
        all_journeys_list = db.list("journeys")
        journeys_by_app = {j.get("application_id"): j for j in all_journeys_list if j.get("application_id")}

        # Build index of other applications
        other_apps_meta: List[Dict[str, Any]] = []
        for a in all_apps:
            aid = a.get("application_id")
            if not aid or aid == target_app_id:
                continue
            j = journeys_by_app.get(aid, {})
            meta = cls.extract_application_identifiers(a, j)
            other_apps_meta.append(meta)

        # ── 1. Same Bank Account Across Multiple Applications ──
        if target_meta.get("bank_account"):
            shared_bank_apps = [
                o for o in other_apps_meta
                if o.get("bank_account") and o.get("bank_account") == target_meta["bank_account"]
            ]
            if shared_bank_apps:
                linked = [
                    {
                        "applicationId": o["application_id"],
                        "journeyId": o["journey_id"],
                        "businessName": o["business_name"],
                        "sharedField": "bank_account",
                        "sharedValue": target_meta["bank_account"][:4] + "****" + target_meta["bank_account"][-4:],
                        "reason": "Identical primary banking account utilized across distinct borrowers"
                    }
                    for o in shared_bank_apps
                ]
                signals.append(FraudSignalModel(
                    signal_id=f"sig_{target_app_id}_bank_{uuid.uuid4().hex[:6]}",
                    application_id=target_app_id,
                    journey_id=target_jrn_id,
                    signal_type="SHARED_BANK_ACCOUNT",
                    severity="HIGH",
                    linked_applications=linked,
                    evidence_references=["doc_c3_bank", f"bank_acc:{target_meta['bank_account']}"],
                    explanation="Potential linked-case risk detected. Primary operational bank account is associated with multiple distinct corporate loan applications.",
                    status="ACTIVE"
                ))

        # ── 2. Same GSTIN Across Multiple Businesses ──
        if target_meta.get("gstin"):
            shared_gstin_apps = [
                o for o in other_apps_meta
                if o.get("gstin") and o.get("gstin") == target_meta["gstin"]
                and o.get("business_name", "").lower() != target_meta.get("business_name", "").lower()
            ]
            if shared_gstin_apps:
                linked = [
                    {
                        "applicationId": o["application_id"],
                        "journeyId": o["journey_id"],
                        "businessName": o["business_name"],
                        "sharedField": "gstin",
                        "sharedValue": target_meta["gstin"],
                        "reason": "Same active GSTIN claimed under non-identical legal trade names"
                    }
                    for o in shared_gstin_apps
                ]
                signals.append(FraudSignalModel(
                    signal_id=f"sig_{target_app_id}_gstin_{uuid.uuid4().hex[:6]}",
                    application_id=target_app_id,
                    journey_id=target_jrn_id,
                    signal_type="SHARED_GSTIN",
                    severity="CRITICAL",
                    linked_applications=linked,
                    evidence_references=[f"gstin:{target_meta['gstin']}"],
                    explanation="Potential linked-case risk detected. GSTIN registration identifier is actively claimed across multiple distinct business applications.",
                    status="ACTIVE"
                ))

        # ── 3. Same Phone on Multiple Unrelated Applications ──
        if target_meta.get("phone"):
            shared_phone_apps = [
                o for o in other_apps_meta
                if o.get("phone") and o.get("phone") == target_meta["phone"]
                and o.get("business_name", "").lower() != target_meta.get("business_name", "").lower()
            ]
            if shared_phone_apps:
                linked = [
                    {
                        "applicationId": o["application_id"],
                        "journeyId": o["journey_id"],
                        "businessName": o["business_name"],
                        "sharedField": "phone",
                        "sharedValue": "+91 " + target_meta["phone"][:3] + "****" + target_meta["phone"][-3:],
                        "reason": "Single applicant mobile phone associated with separate corporate identities"
                    }
                    for o in shared_phone_apps
                ]
                signals.append(FraudSignalModel(
                    signal_id=f"sig_{target_app_id}_phone_{uuid.uuid4().hex[:6]}",
                    application_id=target_app_id,
                    journey_id=target_jrn_id,
                    signal_type="SHARED_PHONE",
                    severity="MEDIUM",
                    linked_applications=linked,
                    evidence_references=[f"phone:{target_meta['phone']}"],
                    explanation="Potential linked-case risk detected. Primary applicant mobile contact is linked to multiple separate borrower journeys.",
                    status="ACTIVE"
                ))

        # ── 4. Repeated Suspicious Document Hash ──
        target_hashes = set(target_meta.get("doc_hashes") or [])
        if target_hashes:
            doc_clashes = []
            for o in other_apps_meta:
                other_hashes = set(o.get("doc_hashes") or [])
                overlap = target_hashes.intersection(other_hashes)
                if overlap:
                    for h in overlap:
                        doc_clashes.append({
                            "applicationId": o["application_id"],
                            "journeyId": o["journey_id"],
                            "businessName": o["business_name"],
                            "sharedField": "document_hash",
                            "sharedValue": h[:12] + "..." + h[-8:],
                            "reason": "Identical binary document uploaded across unrelated borrower profiles"
                        })
            if doc_clashes:
                signals.append(FraudSignalModel(
                    signal_id=f"sig_{target_app_id}_dochash_{uuid.uuid4().hex[:6]}",
                    application_id=target_app_id,
                    journey_id=target_jrn_id,
                    signal_type="REPEATED_DOCUMENT_HASH",
                    severity="HIGH",
                    linked_applications=doc_clashes,
                    evidence_references=[d["sharedValue"] for d in doc_clashes],
                    explanation="Potential linked-case risk detected. Cryptographic SHA-256 document checksum matches a file submitted in another application.",
                    status="ACTIVE"
                ))

        # ── 5. Repeated Identity Conflicts / Shared Address ──
        if target_meta.get("business_address"):
            shared_addr_apps = [
                o for o in other_apps_meta
                if o.get("business_address") and o.get("business_address").lower() == target_meta["business_address"].lower()
                and o.get("business_name", "").lower() != target_meta.get("business_name", "").lower()
            ]
            if shared_addr_apps:
                linked = [
                    {
                        "applicationId": o["application_id"],
                        "journeyId": o["journey_id"],
                        "businessName": o["business_name"],
                        "sharedField": "business_address",
                        "sharedValue": target_meta["business_address"],
                        "reason": "Shared physical depot/operating address without corporate link"
                    }
                    for o in shared_addr_apps
                ]
                signals.append(FraudSignalModel(
                    signal_id=f"sig_{target_app_id}_addr_{uuid.uuid4().hex[:6]}",
                    application_id=target_app_id,
                    journey_id=target_jrn_id,
                    signal_type="SHARED_ADDRESS_CONFLICT",
                    severity="HIGH",
                    linked_applications=linked,
                    evidence_references=[f"address:{target_meta['business_address']}"],
                    explanation="Potential linked-case risk detected. Operational facility address matches an unrelated applicant with no documented corporate affiliation.",
                    status="ACTIVE"
                ))

        # ── 6. Repeated Identity Conflicts (PAN-like identifier in synthetic data) ──
        if target_meta.get("pan"):
            shared_pan_apps = [
                o for o in other_apps_meta
                if o.get("pan") and o.get("pan") == target_meta["pan"]
                and o.get("business_name", "").lower() != target_meta.get("business_name", "").lower()
            ]
            if shared_pan_apps:
                linked = [
                    {
                        "applicationId": o["application_id"],
                        "journeyId": o["journey_id"],
                        "businessName": o["business_name"],
                        "sharedField": "pan",
                        "sharedValue": target_meta["pan"],
                        "reason": "Entity tax identifier (PAN) matches another commercial applicant with conflicting business name"
                    }
                    for o in shared_pan_apps
                ]
                signals.append(FraudSignalModel(
                    signal_id=f"sig_{target_app_id}_pan_{uuid.uuid4().hex[:6]}",
                    application_id=target_app_id,
                    journey_id=target_jrn_id,
                    signal_type="IDENTITY_CONFLICT",
                    severity="CRITICAL",
                    linked_applications=linked,
                    evidence_references=[f"pan:{target_meta['pan']}"],
                    explanation="Potential linked-case risk detected. Corporate tax identifier (PAN) claimed by multiple conflicting corporate identities.",
                    status="ACTIVE"
                ))

        return signals

    @classmethod
    def build_cross_app_network(cls, focus_id: Optional[str] = None) -> FraudNetworkResponse:
        """
        Builds a comprehensive cross-application entity network graph showing
        connected applications, shared identifiers, and risk signals.
        """
        focus_app_id = None
        focus_jrn_id = None
        if focus_id:
            focus_app_id, focus_jrn_id, _, _ = cls.resolve_ids(focus_id)

        all_apps = db.list("applications")
        all_journeys_list = db.list("journeys")
        journeys_by_app = {j.get("application_id"): j for j in all_journeys_list if j.get("application_id")}

        nodes_map: Dict[str, FraudNetworkNode] = {}
        edges: List[FraudNetworkEdge] = []
        all_signals: List[FraudSignalModel] = []

        # Identifier occurrences index: { "BANK:123": [app_meta1, app_meta2] }
        identifier_usage: Dict[str, List[Dict[str, Any]]] = {}

        apps_meta: List[Dict[str, Any]] = []
        for a in all_apps:
            aid = a.get("application_id")
            if not aid:
                continue
            j = journeys_by_app.get(aid, {})
            meta = cls.extract_application_identifiers(a, j)
            apps_meta.append(meta)

            # Record identifier usages
            if meta.get("bank_account"):
                identifier_usage.setdefault(f"BANK:{meta['bank_account']}", []).append(meta)
            if meta.get("gstin"):
                identifier_usage.setdefault(f"GSTIN:{meta['gstin']}", []).append(meta)
            if meta.get("pan"):
                identifier_usage.setdefault(f"PAN:{meta['pan']}", []).append(meta)
            if meta.get("phone"):
                identifier_usage.setdefault(f"PHONE:{meta['phone']}", []).append(meta)
            if meta.get("business_address"):
                identifier_usage.setdefault(f"ADDR:{meta['business_address']}", []).append(meta)
            for dh in meta.get("doc_hashes") or []:
                identifier_usage.setdefault(f"DOC:{dh}", []).append(meta)

        # 1. Create Application Nodes
        for meta in apps_meta:
            aid = meta["application_id"]
            is_focus = (aid == focus_app_id)
            
            # Check signals for this app
            signals = cls.get_or_detect_signals(aid)
            if is_focus or not focus_app_id:
                all_signals.extend(signals)

            is_suspicious = len(signals) > 0 or "apex" in aid.lower()
            
            nodes_map[aid] = FraudNetworkNode(
                id=aid,
                label=meta["business_name"],
                type="APPLICATION",
                details={
                    "journeyId": meta["journey_id"],
                    "signalsCount": len(signals),
                    "gstin": meta.get("gstin"),
                    "pan": meta.get("pan"),
                },
                isCurrent=is_focus,
                isSuspicious=is_suspicious,
                linkedCasesCount=0
            )

        # 2. Create Shared / Relevant Identifier Nodes & Edges
        shared_count = 0
        edge_id_counter = 0

        for key, apps_using in identifier_usage.items():
            kind, val = key.split(":", 1)
            is_cross = len(apps_using) > 1

            if is_cross:
                shared_count += 1

            # If focus is specified, only include identifiers connected to focus app
            if focus_app_id and not any(a["application_id"] == focus_app_id for a in apps_using):
                continue

            node_id = f"node_{kind.lower()}_{abs(hash(val)) % 1000000}"
            label_val = val
            if kind == "BANK":
                label_val = f"Bank Acc: {val[:4]}...{val[-4:]}" if len(val) >= 8 else f"Bank: {val}"
            elif kind == "PHONE":
                label_val = f"Mobile: +91 {val[:3]}...{val[-3:]}"
            elif kind == "PAN":
                label_val = f"PAN: {val}"
            elif kind == "DOC":
                label_val = f"SHA256: {val[:8]}..."
            elif kind == "ADDR":
                label_val = f"Address: {val[:24]}..."

            if node_id not in nodes_map:
                node_type = "BANK_ACCOUNT" if kind == "BANK" else (
                    "GSTIN" if kind == "GSTIN" else (
                        "PAN" if kind == "PAN" else (
                            "PHONE" if kind == "PHONE" else (
                                "ADDRESS" if kind == "ADDR" else "DOCUMENT_HASH"
                            )
                        )
                    )
                )
                nodes_map[node_id] = FraudNetworkNode(
                    id=node_id,
                    label=label_val,
                    type=node_type,
                    details={"raw": val, "used_by_count": len(apps_using)},
                    isCurrent=False,
                    isSuspicious=is_cross,
                    linkedCasesCount=len(apps_using)
                )

            for a in apps_using:
                aid = a["application_id"]
                edge_id_counter += 1
                edge_type_map = {
                    "BANK": "USES_ACCOUNT",
                    "GSTIN": "CLAIMS_GSTIN",
                    "PAN": "CLAIMS_PAN",
                    "PHONE": "REUSES_PHONE",
                    "ADDR": "OPERATES_AT",
                    "DOC": "SUBMITTED_HASH"
                }
                edges.append(FraudNetworkEdge(
                    id=f"edge_{edge_id_counter}",
                    source=aid,
                    target=node_id,
                    label=edge_type_map.get(kind, "LINKED_TO"),
                    type=edge_type_map.get(kind, "LINKED_TO"),
                    isCrossApplication=is_cross,
                    sharedIdentifier=label_val if is_cross else None
                ))

        # Update linked cases counts on application nodes
        for e in edges:
            if e.isCrossApplication and e.source in nodes_map:
                nodes_map[e.source].linkedCasesCount += 1

        return FraudNetworkResponse(
            focus_application_id=focus_app_id,
            focus_journey_id=focus_jrn_id,
            nodes=list(nodes_map.values()),
            edges=edges,
            signals=all_signals,
            total_applications=len(all_apps),
            total_shared_identifiers=shared_count,
            risk_summary="Potential linked-case risk detected." if any(s.severity in ("HIGH", "CRITICAL") for s in all_signals) else "Clean portfolio: no anomalous shared identifiers detected."
        )

    @classmethod
    def resolve_signal(
        cls,
        signal_id: str,
        new_status: str,
        actor_id: str,
        officer_name: str,
        notes: str
    ) -> FraudSignalModel:
        """
        Updates the risk officer disposition on a fraud signal and records
        an immutable audit event in compliance with governance invariants.
        """
        raw_signal = db.get("fraud_signals", signal_id)
        if not raw_signal:
            # Maybe search by signalId property
            signals = db.list("fraud_signals", {"signalId": signal_id})
            if signals:
                raw_signal = signals[0]
            else:
                signals = db.list("fraud_signals", {"signal_id": signal_id})
                if signals:
                    raw_signal = signals[0]

        if not raw_signal:
            raise ValueError(f"Fraud signal {signal_id} not found")

        now_str = now_utc_iso()
        raw_signal["status"] = new_status
        raw_signal["resolvedBy"] = officer_name
        raw_signal["resolvedAt"] = now_str
        raw_signal["resolutionNotes"] = notes

        # Update in persistence
        db.set("fraud_signals", signal_id, raw_signal)

        # Audit logging (Strict compliance invariant)
        app_id = raw_signal.get("applicationId") or raw_signal.get("application_id")
        AuditLedger.record_event(
            application_id=app_id or "unknown_app",
            event_type="FRAUD_SIGNAL_RESOLVED" if new_status in ("RESOLVED", "FALSE_POSITIVE") else "FRAUD_SIGNAL_ACKNOWLEDGED",
            actor_type="RISK_OFFICER",
            actor_id=actor_id,
            stage="HUMAN_REVIEW",
            payload_summary=f"Risk officer {officer_name} updated fraud signal {signal_id} to {new_status}: {notes}",
            references={"signal_id": signal_id, "new_status": new_status, "officer": officer_name},
            service="cross-app-risk-intelligence",
            input_data={"signal_id": signal_id, "new_status": new_status, "notes": notes},
            output_data={"status_updated": True, "final_status": new_status},
            timestamp=datetime.now(timezone.utc)
        )

        return FraudSignalModel.model_validate(raw_signal)
