"""
FinFlow AI — Repository Tests
==============================
Tests all 20 repository classes against the in-memory store.
No Firebase credentials or running emulator required.

Run with:
    pytest backend/tests/test_repositories.py -v
"""

from __future__ import annotations

import pytest
from unittest.mock import patch

# ---------------------------------------------------------------------------
# Ensure we always use in-memory store (no Firebase / emulator required)
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def force_memory_store():
    """Patch FirestoreClient so tests always use the in-memory backend."""
    with patch(
        "backend.database.firestore_client.FirestoreClient._init_firebase",
        return_value=None,
    ):
        yield


# ---------------------------------------------------------------------------
# Helpers — isolated repository instances per test
# ---------------------------------------------------------------------------

from backend.database.repositories.repositories import (
    UserRepository,
    ApplicationRepository,
    DocumentRepository,
    EvidenceItemRepository,
    JourneyStepRepository,
    RiskAssessmentRepository,
    DecisionRepository,
    NextBestActionRepository,
    AuditLogRepository,
    PolicyDocumentRepository,
    PolicyChunkRepository,
    FinancialSnapshotRepository,
    TrustGraphNodeRepository,
    TrustGraphEdgeRepository,
    FraudSignalRepository,
    WhatIfScenarioRepository,
    HumanReviewRepository,
    FeedbackEventRepository,
    NotificationRepository,
    SystemEventRepository,
)
from backend.database.models import (
    UserModel,
    ApplicationModel,
    DocumentModel,
    EvidenceItemModel,
    JourneyStepModel,
    RiskAssessmentModel,
    DecisionModel,
    NextBestActionModel,
    AuditLogModel,
    PolicyDocumentModel,
    PolicyChunkModel,
    FinancialSnapshotModel,
    TrustGraphNodeModel,
    TrustGraphEdgeModel,
    FraudSignalModel,
    WhatIfScenarioModel,
    HumanReviewModel,
    FeedbackEventModel,
    NotificationModel,
    SystemEventModel,
)


# ============================================================================
# Fixtures — sample model factories
# ============================================================================

def make_user(suffix: str = "u1") -> UserModel:
    return UserModel(
        user_id=f"user_{suffix}",
        email=f"{suffix}@example.com",
        role="CUSTOMER",
        name=f"Test User {suffix}",
    )


def make_application(suffix: str = "a1", user_id: str = "user_u1") -> ApplicationModel:
    return ApplicationModel(
        application_id=f"app_{suffix}",
        user_id=user_id,
        business_name=f"Biz {suffix}",
        requested_amount=1_000_000.0,
        purpose="inventory",
    )


def make_document(app_id: str = "app_a1", suffix: str = "d1") -> DocumentModel:
    return DocumentModel(
        document_id=f"doc_{suffix}",
        application_id=app_id,
        type="BANK_STATEMENT",
        file_name=f"stmt_{suffix}.pdf",
        storage_path=f"/uploads/doc_{suffix}.pdf",
        file_hash=f"sha256_{suffix}",
    )


def make_evidence(app_id: str = "app_a1", doc_id: str = "doc_d1", suffix: str = "e1") -> EvidenceItemModel:
    return EvidenceItemModel(
        evidence_id=f"evd_{suffix}",
        application_id=app_id,
        document_id=doc_id,
        field_name="avg_monthly_inflow",
        value=500_000.0,
        confidence=0.95,
        source_page=1,
        extraction_method="FinFlow-OCR-v2",
        verification_status="PENDING",
    )


def make_journey_step(app_id: str = "app_a1", suffix: str = "s1") -> JourneyStepModel:
    return JourneyStepModel(
        step_id=f"step_{suffix}",
        application_id=app_id,
        stage="INTENT_CAPTURE",
    )


def make_risk(app_id: str = "app_a1", suffix: str = "r1") -> RiskAssessmentModel:
    return RiskAssessmentModel(
        risk_id=f"rsk_{suffix}",
        application_id=app_id,
        risk_score=780,
        risk_band="LOW_RISK",
        feature_values={"dscr": 1.8},
        model_version="scikit-learn-sme-v2.1",
        rule_results=[],
    )


def make_decision(app_id: str = "app_a1", suffix: str = "dc1") -> DecisionModel:
    return DecisionModel(
        decision_id=f"dec_{suffix}",
        application_id=app_id,
        outcome="APPROVED",
        reasons=["Good DSCR"],
        evidence_references=["evd_e1"],
        policy_references=["POL-R04"],
        model_references=["scikit-learn-sme-v2.1"],
    )


def make_audit(app_id: str = "app_a1", suffix: str = "au1") -> AuditLogModel:
    return AuditLogModel(
        audit_id=f"aud_{suffix}",
        application_id=app_id,
        actor_id="user_u1",
        actor_role="CUSTOMER",
        action="DOCUMENT_UPLOADED",
        details={"doc_id": "doc_d1"},
    )


def make_notification(user_id: str = "user_u1", suffix: str = "n1") -> NotificationModel:
    return NotificationModel(
        notification_id=f"notif_{suffix}",
        user_id=user_id,
        title="Application updated",
        message="Your application moved to VERIFICATION stage.",
        type="INFO",
    )


# ============================================================================
# 1. UserRepository
# ============================================================================

class TestUserRepository:
    def setup_method(self):
        self.repo = UserRepository()

    def test_create_and_get(self):
        user = make_user("t1")
        self.repo.create(user)
        fetched = self.repo.get("user_t1")
        assert fetched is not None
        assert fetched.email == "t1@example.com"

    def test_create_duplicate_raises(self):
        user = make_user("dup")
        self.repo.create(user)
        with pytest.raises(ValueError):
            self.repo.create(user)

    def test_update_role(self):
        user = make_user("t2")
        self.repo.create(user)
        self.repo.update("user_t2", {"role": "RM"})
        fetched = self.repo.get("user_t2")
        assert fetched.role == "RM"

    def test_list_by_role(self):
        self.repo.upsert(make_user("ra"))
        self.repo.upsert(UserModel(user_id="user_rm1", email="rm@x.com", role="RM", name="RM User"))
        rms = self.repo.list_by_role("RM")
        assert any(u.userId == "user_rm1" for u in rms)

    def test_get_nonexistent_returns_none(self):
        assert self.repo.get("nonexistent") is None

    def test_get_or_raise_nonexistent(self):
        with pytest.raises(KeyError):
            self.repo.get_or_raise("no_such_user")

    def test_list_all(self):
        self.repo.upsert(make_user("la1"))
        self.repo.upsert(make_user("la2"))
        users = self.repo.list()
        assert len(users) >= 2


# ============================================================================
# 2. ApplicationRepository
# ============================================================================

class TestApplicationRepository:
    def setup_method(self):
        self.repo = ApplicationRepository()

    def test_create_and_get(self):
        app = make_application("cr1")
        self.repo.create(app)
        fetched = self.repo.get("app_cr1")
        assert fetched.businessName == "Biz cr1"
        assert fetched.requestedAmount == 1_000_000.0

    def test_list_by_user(self):
        self.repo.upsert(make_application("lu1", user_id="user_x"))
        self.repo.upsert(make_application("lu2", user_id="user_x"))
        self.repo.upsert(make_application("lu3", user_id="user_y"))
        results = self.repo.list_by_user("user_x")
        assert all(a.userId == "user_x" for a in results)
        assert len(results) >= 2

    def test_advance_stage(self):
        app = make_application("as1")
        self.repo.create(app)
        ok = self.repo.advance_stage("app_as1", "VERIFICATION")
        assert ok is True
        updated = self.repo.get("app_as1")
        assert updated.currentStage == "VERIFICATION"

    def test_list_by_status(self):
        flagged = ApplicationModel(
            application_id="app_flag1",
            user_id="user_f",
            business_name="Flagged Co",
            requested_amount=500_000.0,
            purpose="test",
            status="FLAGGED",
        )
        self.repo.upsert(flagged)
        results = self.repo.list_by_status("FLAGGED")
        assert any(a.applicationId == "app_flag1" for a in results)

    def test_pagination(self):
        for i in range(5):
            self.repo.upsert(make_application(f"pg{i}", user_id="user_pgtest"))
        page1 = self.repo.list_by_user("user_pgtest", limit=3)
        assert len(page1) == 3


# ============================================================================
# 3. DocumentRepository
# ============================================================================

class TestDocumentRepository:
    def setup_method(self):
        self.repo = DocumentRepository()

    def test_create_and_list_by_application(self):
        self.repo.create(make_document("app_a1", "da1"))
        self.repo.create(make_document("app_a1", "da2"))
        docs = self.repo.list_by_application("app_a1")
        assert len(docs) >= 2

    def test_update_ocr_status(self):
        self.repo.upsert(make_document("app_b1", "do1"))
        self.repo.update_ocr_status("doc_do1", "COMPLETED")
        doc = self.repo.get("doc_do1")
        assert doc.ocrStatus == "COMPLETED"

    def test_get_by_hash_dedup(self):
        doc = make_document("app_c1", "hash1")
        self.repo.upsert(doc)
        found = self.repo.get_by_hash("sha256_hash1")
        assert found is not None
        assert found.documentId == "doc_hash1"

    def test_update_verification_status(self):
        self.repo.upsert(make_document("app_d1", "vs1"))
        self.repo.update_verification_status("doc_vs1", "VERIFIED")
        doc = self.repo.get("doc_vs1")
        assert doc.verificationStatus == "VERIFIED"


# ============================================================================
# 4. EvidenceItemRepository
# ============================================================================

class TestEvidenceItemRepository:
    def setup_method(self):
        self.repo = EvidenceItemRepository()

    def test_create_and_list(self):
        self.repo.create(make_evidence("app_ev1", "doc_d1", "ev1"))
        items = self.repo.list_by_application("app_ev1")
        assert len(items) >= 1

    def test_as_field_map(self):
        ev = EvidenceItemModel(
            evidence_id="evd_fm1",
            application_id="app_fm1",
            document_id="doc_d1",
            field_name="avg_monthly_inflow",
            value=300_000.0,
            normalized_value=300_000.0,
            confidence=0.98,
            source_page=2,
            extraction_method="FinFlow-OCR-v2",
            verification_status="VERIFIED",
        )
        self.repo.upsert(ev)
        field_map = self.repo.as_field_map("app_fm1")
        assert "avg_monthly_inflow" in field_map
        assert field_map["avg_monthly_inflow"] == 300_000.0

    def test_verify(self):
        self.repo.upsert(make_evidence("app_ver1", "doc_d1", "ver1"))
        self.repo.verify("evd_ver1")
        ev = self.repo.get("evd_ver1")
        assert ev.verificationStatus == "VERIFIED"


# ============================================================================
# 5. JourneyStepRepository — immutable
# ============================================================================

class TestJourneyStepRepository:
    def setup_method(self):
        self.repo = JourneyStepRepository()

    def test_create_and_list(self):
        self.repo.create(make_journey_step("app_js1", "js1"))
        steps = self.repo.list_by_application("app_js1")
        assert len(steps) >= 1

    def test_update_forbidden(self):
        self.repo.upsert(make_journey_step("app_js2", "js2"))
        with pytest.raises(PermissionError):
            self.repo.update("step_js2", {"status": "FAILED"})

    def test_delete_forbidden(self):
        self.repo.upsert(make_journey_step("app_js3", "js3"))
        with pytest.raises(PermissionError):
            self.repo.delete("step_js3")

    def test_latest_step(self):
        self.repo.upsert(make_journey_step("app_latest", "lt1"))
        self.repo.upsert(make_journey_step("app_latest", "lt2"))
        latest = self.repo.latest_step("app_latest")
        assert latest is not None


# ============================================================================
# 6. RiskAssessmentRepository — immutable
# ============================================================================

class TestRiskAssessmentRepository:
    def setup_method(self):
        self.repo = RiskAssessmentRepository()

    def test_create_and_get_latest(self):
        self.repo.create(make_risk("app_rk1", "rk1"))
        latest = self.repo.latest("app_rk1")
        assert latest is not None
        assert latest.riskScore == 780

    def test_update_forbidden(self):
        self.repo.upsert(make_risk("app_rk2", "rk2"))
        with pytest.raises(PermissionError):
            self.repo.update("rsk_rk2", {"riskScore": 500})

    def test_delete_forbidden(self):
        self.repo.upsert(make_risk("app_rk3", "rk3"))
        with pytest.raises(PermissionError):
            self.repo.delete("rsk_rk3")


# ============================================================================
# 7. DecisionRepository — immutable
# ============================================================================

class TestDecisionRepository:
    def setup_method(self):
        self.repo = DecisionRepository()

    def test_create_and_latest(self):
        self.repo.create(make_decision("app_dc1", "dc1"))
        decision = self.repo.latest("app_dc1")
        assert decision is not None
        assert decision.outcome == "APPROVED"

    def test_update_forbidden(self):
        self.repo.upsert(make_decision("app_dc2", "dc2"))
        with pytest.raises(PermissionError):
            self.repo.update("dec_dc2", {"outcome": "REJECTED"})

    def test_delete_forbidden(self):
        self.repo.upsert(make_decision("app_dc3", "dc3"))
        with pytest.raises(PermissionError):
            self.repo.delete("dec_dc3")


# ============================================================================
# 8. AuditLogRepository — APPEND-ONLY
# ============================================================================

class TestAuditLogRepository:
    def setup_method(self):
        self.repo = AuditLogRepository()

    def test_append_and_list(self):
        event = make_audit("app_au1", "au1")
        self.repo.append(event)
        events = self.repo.list_by_application("app_au1")
        assert len(events) >= 1
        assert events[0].action == "DOCUMENT_UPLOADED"

    def test_update_forbidden(self):
        event = make_audit("app_au2", "au2")
        self.repo.append(event)
        with pytest.raises(PermissionError):
            self.repo.update("aud_au2", {"action": "TAMPERED"})

    def test_delete_forbidden(self):
        event = make_audit("app_au3", "au3")
        self.repo.append(event)
        with pytest.raises(PermissionError):
            self.repo.delete("aud_au3")

    def test_create_forbidden_in_favour_of_append(self):
        """Direct create() should succeed (it calls set internally),
        but in practice callers MUST use append() to ensure timestamp stamping."""
        event = make_audit("app_au4", "au4")
        # create() is technically available but timestamp may not be stamped —
        # test that append() correctly overwrites timestamp
        self.repo.append(event)
        fetched = self.repo.get("aud_au4")
        assert fetched is not None
        assert fetched.timestamp  # Server-stamped

    def test_build_event_factory(self):
        ev = AuditLogRepository.build_event(
            application_id="app_build1",
            actor_id="user_u1",
            actor_role="RM",
            action="STAGE_ADVANCED",
            details={"from": "VERIFICATION", "to": "RISK_ASSESSMENT"},
            old_state="VERIFICATION",
            new_state="RISK_ASSESSMENT",
        )
        self.repo.append(ev)
        fetched = self.repo.get(ev.auditId)
        assert fetched.action == "STAGE_ADVANCED"
        assert fetched.oldState == "VERIFICATION"

    def test_list_by_actor(self):
        for i in range(3):
            ev = AuditLogRepository.build_event(
                application_id=f"app_actor{i}",
                actor_id="actor_x",
                actor_role="ADMIN",
                action="CONFIG_CHANGED",
            )
            self.repo.append(ev)
        results = self.repo.list_by_actor("actor_x")
        assert len(results) >= 3

    def test_list_with_pagination(self):
        for i in range(6):
            ev = AuditLogRepository.build_event(
                application_id="app_pg_audit",
                actor_id="user_u1",
                actor_role="CUSTOMER",
                action=f"ACTION_{i}",
            )
            self.repo.append(ev)
        page = self.repo.list_by_application("app_pg_audit", limit=3)
        assert len(page) == 3


# ============================================================================
# 9. PolicyDocumentRepository
# ============================================================================

class TestPolicyDocumentRepository:
    def setup_method(self):
        self.repo = PolicyDocumentRepository()

    def test_create_and_get(self):
        policy = PolicyDocumentModel(
            policy_id="pol_001",
            title="Credit Risk Policy",
            category="CREDIT_RISK",
            version="2026.1",
            content="R01: Minimum vintage 24 months.",
        )
        self.repo.create(policy)
        fetched = self.repo.get("pol_001")
        assert fetched.title == "Credit Risk Policy"

    def test_list_by_category(self):
        self.repo.upsert(
            PolicyDocumentModel(
                policy_id="pol_kyc",
                title="KYC Policy",
                category="KYC",
                version="1.0",
                content="Verify PAN and GSTIN.",
            )
        )
        results = self.repo.list_by_category("KYC")
        assert any(p.policyId == "pol_kyc" for p in results)


# ============================================================================
# 10. PolicyChunkRepository
# ============================================================================

class TestPolicyChunkRepository:
    def setup_method(self):
        self.repo = PolicyChunkRepository()

    def test_create_and_keyword_search(self):
        chunk = PolicyChunkModel(
            chunk_id="chk_001",
            policy_id="pol_001",
            clause_id="R04",
            text="DSCR must be >= 1.25 for loan approval.",
            relevance_keywords=["dscr", "loan"],
        )
        self.repo.create(chunk)
        results = self.repo.keyword_search("dscr")
        assert any(c.chunkId == "chk_001" for c in results)

    def test_list_by_policy(self):
        for i in range(3):
            self.repo.upsert(
                PolicyChunkModel(
                    chunk_id=f"chk_p_{i}",
                    policy_id="pol_multi",
                    clause_id=f"R0{i}",
                    text=f"Rule {i}",
                    relevance_keywords=[],
                )
            )
        results = self.repo.list_by_policy("pol_multi")
        assert len(results) >= 3


# ============================================================================
# 11. FinancialSnapshotRepository — immutable
# ============================================================================

class TestFinancialSnapshotRepository:
    def setup_method(self):
        self.repo = FinancialSnapshotRepository()

    def test_create_and_latest(self):
        snap = FinancialSnapshotModel(
            snapshot_id="snap_001",
            application_id="app_fs1",
            dscr=1.8,
            avg_monthly_inflow=500_000.0,
            avg_monthly_outflow=300_000.0,
            operating_cash_flow=200_000.0,
            cash_burn_rate=300_000.0,
            buffer_days=45,
            volatility_index=0.12,
        )
        self.repo.create(snap)
        latest = self.repo.latest("app_fs1")
        assert latest is not None
        assert latest.dscr == 1.8

    def test_update_forbidden(self):
        snap = FinancialSnapshotModel(
            snapshot_id="snap_upd",
            application_id="app_fs2",
            dscr=1.2,
            avg_monthly_inflow=200_000.0,
            avg_monthly_outflow=180_000.0,
            operating_cash_flow=20_000.0,
            cash_burn_rate=180_000.0,
            buffer_days=10,
            volatility_index=0.3,
        )
        self.repo.create(snap)
        with pytest.raises(PermissionError):
            self.repo.update("snap_upd", {"dscr": 2.0})


# ============================================================================
# 12. TrustGraphNodeRepository
# ============================================================================

class TestTrustGraphNodeRepository:
    def setup_method(self):
        self.repo = TrustGraphNodeRepository()

    def test_create_and_list_by_application(self):
        node = TrustGraphNodeModel(
            node_id="node_001",
            application_id="app_tg1",
            label="Sharma Textiles",
            node_type="BUSINESS",
            risk_level="LOW",
            trust_score=850,
            details={"gstin": "29AAAAA0000A1Z5"},
        )
        self.repo.create(node)
        nodes = self.repo.list_by_application("app_tg1")
        assert len(nodes) >= 1

    def test_update_trust_score(self):
        node = TrustGraphNodeModel(
            node_id="node_upd",
            application_id="app_tg2",
            label="Test Co",
            node_type="BUSINESS",
            risk_level="LOW",
            trust_score=700,
            details={},
        )
        self.repo.create(node)
        self.repo.update_trust_score("node_upd", 600, "MEDIUM")
        updated = self.repo.get("node_upd")
        assert updated.trustScore == 600
        assert updated.riskLevel == "MEDIUM"


# ============================================================================
# 13. TrustGraphEdgeRepository
# ============================================================================

class TestTrustGraphEdgeRepository:
    def setup_method(self):
        self.repo = TrustGraphEdgeRepository()

    def test_create_and_flag(self):
        edge = TrustGraphEdgeModel(
            edge_id="edge_001",
            application_id="app_te1",
            source="node_001",
            target="node_002",
            relation="INVOICED",
            weight=1.0,
            flagged=False,
        )
        self.repo.create(edge)
        self.repo.flag_edge("edge_001", "Circular invoicing detected")
        fetched = self.repo.get("edge_001")
        assert fetched.flagged is True
        assert fetched.flagReason == "Circular invoicing detected"

    def test_list_flagged(self):
        self.repo.upsert(
            TrustGraphEdgeModel(
                edge_id="edge_fl1",
                application_id="app_te2",
                source="n1",
                target="n2",
                relation="OWNS",
                weight=1.0,
                flagged=True,
                flag_reason="Identity mismatch",
            )
        )
        results = self.repo.list_flagged("app_te2")
        assert any(e.edgeId == "edge_fl1" for e in results)


# ============================================================================
# 14. FraudSignalRepository — immutable
# ============================================================================

class TestFraudSignalRepository:
    def setup_method(self):
        self.repo = FraudSignalRepository()

    def test_create_and_list(self):
        signal = FraudSignalModel(
            signal_id="sig_001",
            application_id="app_fr1",
            signal_type="CIRCULAR_INVOICE",
            severity="HIGH",
            description="Circular invoicing between 3 entities",
            evidence_ids=["evd_1"],
            details={"entities": ["A", "B", "C"]},
        )
        self.repo.create(signal)
        results = self.repo.list_by_application("app_fr1")
        assert len(results) >= 1

    def test_has_critical_signals(self):
        self.repo.upsert(
            FraudSignalModel(
                signal_id="sig_crit",
                application_id="app_crit1",
                signal_type="DUPLICATE_GSTIN",
                severity="CRITICAL",
                description="Duplicate GSTIN across 5 applications",
                evidence_ids=[],
                details={},
            )
        )
        assert self.repo.has_critical_signals("app_crit1") is True
        assert self.repo.has_critical_signals("app_nocrit") is False

    def test_update_forbidden(self):
        signal = FraudSignalModel(
            signal_id="sig_upd",
            application_id="app_fr2",
            signal_type="IDENTITY_MISMATCH",
            severity="MEDIUM",
            description="Name mismatch on PAN vs bank account",
            evidence_ids=[],
            details={},
        )
        self.repo.create(signal)
        with pytest.raises(PermissionError):
            self.repo.update("sig_upd", {"severity": "LOW"})


# ============================================================================
# 15. WhatIfScenarioRepository — immutable
# ============================================================================

class TestWhatIfScenarioRepository:
    def setup_method(self):
        self.repo = WhatIfScenarioRepository()

    def test_create_and_list(self):
        scenario = WhatIfScenarioModel(
            scenario_id="scn_001",
            application_id="app_wi1",
            requested_inputs={"revenue_delta_pct": 15.0},
            simulated_outputs={"simulated_dscr": 2.1, "simulated_risk_band": "LOW_RISK"},
            insights=["Higher revenue improves DSCR to 2.1"],
        )
        self.repo.create(scenario)
        results = self.repo.list_by_application("app_wi1")
        assert len(results) >= 1

    def test_update_forbidden(self):
        scenario = WhatIfScenarioModel(
            scenario_id="scn_upd",
            application_id="app_wi2",
            requested_inputs={},
            simulated_outputs={},
            insights=[],
        )
        self.repo.create(scenario)
        with pytest.raises(PermissionError):
            self.repo.update("scn_upd", {"insights": ["tampered"]})


# ============================================================================
# 16. HumanReviewRepository — immutable
# ============================================================================

class TestHumanReviewRepository:
    def setup_method(self):
        self.repo = HumanReviewRepository()

    def test_create_and_list(self):
        review = HumanReviewModel(
            review_id="rev_001",
            application_id="app_hr1",
            decision_id="dec_dc1",
            officer_id="user_rm1",
            officer_role="RM",
            original_outcome="NEEDS_REVIEW",
            new_outcome="CONDITIONAL_APPROVAL",
            reason_code="STRONG_CASH_FLOW",
            rationale_notes="Cash flow justifies conditional approval at lower amount.",
        )
        self.repo.create(review)
        results = self.repo.list_by_application("app_hr1")
        assert len(results) >= 1
        assert results[0].newOutcome == "CONDITIONAL_APPROVAL"

    def test_update_forbidden(self):
        review = HumanReviewModel(
            review_id="rev_upd",
            application_id="app_hr2",
            decision_id="dec_dc1",
            officer_id="user_rm1",
            officer_role="RM",
            original_outcome="REJECTED",
            new_outcome="APPROVED",
            reason_code="MANAGEMENT_OVERRIDE",
            rationale_notes="Exception approved by head office.",
        )
        self.repo.create(review)
        with pytest.raises(PermissionError):
            self.repo.update("rev_upd", {"newOutcome": "REJECTED"})


# ============================================================================
# 17. FeedbackEventRepository — immutable
# ============================================================================

class TestFeedbackEventRepository:
    def setup_method(self):
        self.repo = FeedbackEventRepository()

    def test_create_and_list(self):
        fb = FeedbackEventModel(
            feedback_id="fb_001",
            application_id="app_fb1",
            decision_id="dec_dc1",
            performance_outcome="ON_TIME_REPAYMENT",
            repayment_rate_pct=100.0,
        )
        self.repo.create(fb)
        results = self.repo.list_by_application("app_fb1")
        assert len(results) >= 1

    def test_list_by_outcome(self):
        self.repo.upsert(
            FeedbackEventModel(
                feedback_id="fb_def",
                application_id="app_fb2",
                decision_id="dec_dc2",
                performance_outcome="DEFAULT",
                repayment_rate_pct=0.0,
            )
        )
        defaults = self.repo.list_by_outcome("DEFAULT")
        assert any(f.feedbackId == "fb_def" for f in defaults)


# ============================================================================
# 18. NotificationRepository
# ============================================================================

class TestNotificationRepository:
    def setup_method(self):
        self.repo = NotificationRepository()

    def test_create_and_list_for_user(self):
        self.repo.create(make_notification("user_ntf1", "n1"))
        self.repo.create(make_notification("user_ntf1", "n2"))
        results = self.repo.list_for_user("user_ntf1")
        assert len(results) >= 2

    def test_mark_read(self):
        self.repo.upsert(make_notification("user_mr1", "mr1"))
        self.repo.mark_read("notif_mr1")
        n = self.repo.get("notif_mr1")
        assert n.read is True

    def test_unread_count(self):
        self.repo.upsert(make_notification("user_uc1", "uc1"))
        self.repo.upsert(make_notification("user_uc1", "uc2"))
        count = self.repo.unread_count("user_uc1")
        assert count >= 2

    def test_mark_all_read(self):
        self.repo.upsert(make_notification("user_mar1", "mar1"))
        self.repo.upsert(make_notification("user_mar1", "mar2"))
        marked = self.repo.mark_all_read("user_mar1")
        assert marked >= 2
        assert self.repo.unread_count("user_mar1") == 0


# ============================================================================
# 19. SystemEventRepository — append-only
# ============================================================================

class TestSystemEventRepository:
    def setup_method(self):
        self.repo = SystemEventRepository()

    def test_create_and_list_by_type(self):
        ev = SystemEventModel(
            event_id="se_001",
            event_type="MODEL_RETRAINED",
            source_component="ml_risk_model",
            payload={"model_version": "v2.2"},
        )
        self.repo.create(ev)
        results = self.repo.list_by_type("MODEL_RETRAINED")
        assert any(e.eventId == "se_001" for e in results)

    def test_update_forbidden(self):
        ev = SystemEventModel(
            event_id="se_upd",
            event_type="SEED_COMPLETED",
            source_component="demo_seeder",
            payload={},
        )
        self.repo.create(ev)
        with pytest.raises(PermissionError):
            self.repo.update("se_upd", {"payload": {"tampered": True}})

    def test_list_by_component(self):
        for i in range(3):
            self.repo.upsert(
                SystemEventModel(
                    event_id=f"se_comp_{i}",
                    event_type="HEALTH_CHECK",
                    source_component="heartbeat",
                    payload={"iteration": i},
                )
            )
        results = self.repo.list_by_component("heartbeat")
        assert len(results) >= 3


# ============================================================================
# 20. NextBestActionRepository
# ============================================================================

class TestNextBestActionRepository:
    def setup_method(self):
        self.repo = NextBestActionRepository()

    def test_create_and_list_by_application(self):
        action = NextBestActionModel(
            action_id="nba_001",
            application_id="app_nba1",
            title="Upload Bank Statement",
            description="Please upload last 12 months of bank statements.",
            action_type="UPLOAD_DOCUMENT",
            priority=1,
            guardrail_status="SAFE",
            target_persona="CUSTOMER",
        )
        self.repo.create(action)
        results = self.repo.list_by_application("app_nba1")
        assert len(results) >= 1

    def test_list_for_persona(self):
        self.repo.upsert(
            NextBestActionModel(
                action_id="nba_rm1",
                application_id="app_nba2",
                title="RM: Verify discrepancy",
                description="Verify GST vs Bank turnover discrepancy.",
                action_type="VERIFY_DISCREPANCY",
                priority=2,
                guardrail_status="SAFE",
                target_persona="RM",
            )
        )
        rm_actions = self.repo.list_for_persona("app_nba2", "RM")
        assert all(a.targetPersona == "RM" for a in rm_actions)


# ============================================================================
# Cross-collection integration: Application + AuditLog + Decision
# ============================================================================

class TestCrossCollectionIntegration:
    def setup_method(self):
        self.app_repo = ApplicationRepository()
        self.audit_repo = AuditLogRepository()
        self.decision_repo = DecisionRepository()

    def test_full_lifecycle(self):
        # 1. Create application
        app = make_application("intg1", user_id="user_intg")
        self.app_repo.create(app)

        # 2. Append audit event for creation
        ev = AuditLogRepository.build_event(
            application_id="app_intg1",
            actor_id="user_intg",
            actor_role="CUSTOMER",
            action="APPLICATION_CREATED",
            new_state="INTENT_CAPTURE",
        )
        self.audit_repo.append(ev)

        # 3. Advance stage
        self.app_repo.advance_stage("app_intg1", "RISK_ASSESSMENT")
        stage_ev = AuditLogRepository.build_event(
            application_id="app_intg1",
            actor_id="user_intg",
            actor_role="CUSTOMER",
            action="STAGE_ADVANCED",
            old_state="INTENT_CAPTURE",
            new_state="RISK_ASSESSMENT",
        )
        self.audit_repo.append(stage_ev)

        # 4. Record decision
        decision = make_decision("app_intg1", "intgdc1")
        self.decision_repo.create(decision)

        # Verify
        updated_app = self.app_repo.get("app_intg1")
        assert updated_app.currentStage == "RISK_ASSESSMENT"

        logs = self.audit_repo.list_by_application("app_intg1")
        assert len(logs) >= 2
        actions = {log.action for log in logs}
        assert "APPLICATION_CREATED" in actions
        assert "STAGE_ADVANCED" in actions

        d = self.decision_repo.latest("app_intg1")
        assert d.outcome == "APPROVED"

        # Audit log must not be mutable
        with pytest.raises(PermissionError):
            self.audit_repo.update(logs[0].auditId, {"action": "TAMPERED"})
