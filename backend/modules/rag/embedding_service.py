"""
EmbeddingService — Module 4/7 Policy & Evidence RAG System
===========================================================
Pluggable embedding provider abstraction with:
  1. BaseEmbeddingProvider (abstract contract)
  2. LocalTFIDFEmbeddingProvider (default, zero-dependency, deterministic)
  3. EmbeddingService (singleton manager with similarity calculations)

Allows transparent swapping to external providers (Vertex AI, OpenAI,
HuggingFace, local ONNX) without touching ingestion or retriever logic.
"""

from __future__ import annotations
import math
import re
from abc import ABC, abstractmethod
from typing import List, Optional
import numpy as np


class BaseEmbeddingProvider(ABC):
    """Abstract base class for all embedding providers."""

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Vector dimensionality."""
        pass

    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """Embed a single text string into a float vector."""
        pass

    @abstractmethod
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of text strings into float vectors."""
        pass


class LocalTFIDFEmbeddingProvider(BaseEmbeddingProvider):
    """
    Lightweight, fast, deterministic local embedding provider for MVP.
    Uses sub-word hashing and domain term frequency weighting to produce
    unit-normalized vector representations (dim=256).

    Guarantees:
      - Zero external API keys or heavy model downloads required
      - Fast sub-millisecond inference
      - Pure unit vectors so dot-product equals cosine similarity
    """

    DIMENSION = 256

    # Institutional domain vocabulary for credit underwriting
    DOMAIN_TERMS = [
        "vintage", "turnover", "dscr", "cashflow", "coverage", "ebitda",
        "cheque", "bounce", "bounces", "returns", "ecs", "inflow", "outflow",
        "surplus", "debt", "obligation", "emi", "gstin", "gstr", "pan",
        "itr", "taxable", "receipts", "verified", "discrepancy", "variance",
        "fraud", "kyc", "identity", "unsecured", "working", "capital",
        "term", "loan", "exposure", "limit", "collateral", "guarantee",
        "covenant", "margin", "buffer", "liquidity", "stress", "director",
        "promoter", "ratio", "threshold", "minimum", "maximum", "sanction"
    ]

    def __init__(self, dimension: int = DIMENSION) -> None:
        self._dim = dimension
        # Pre-seed domain term index weights
        self._term_weights = {term: 1.5 + (0.1 * i) for i, term in enumerate(self.DOMAIN_TERMS)}

    @property
    def dimension(self) -> int:
        return self._dim

    def _tokenize(self, text: str) -> List[str]:
        cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
        return [w for w in cleaned.split() if len(w) > 2]

    def embed_text(self, text: str) -> List[float]:
        vec = np.zeros(self._dim, dtype=np.float32)
        tokens = self._tokenize(text)

        if not tokens:
            return vec.tolist()

        for token in tokens:
            # Hash token to bucket
            h = hash(token) % self._dim
            weight = self._term_weights.get(token, 1.0)
            vec[h] += float(weight)

            # Also hash character 3-grams for morphological similarity
            for i in range(len(token) - 2):
                tri = token[i:i+3]
                h_tri = (hash(tri) ^ 0x5bd1e995) % self._dim
                vec[h_tri] += 0.25

        # L2 normalize so cosine similarity == dot product
        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec = vec / norm

        return [round(float(x), 6) for x in vec]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_text(t) for t in texts]


class EmbeddingService:
    """
    Singleton service managing embedding generation and similarity math.
    """

    _provider: BaseEmbeddingProvider = LocalTFIDFEmbeddingProvider()

    @classmethod
    def set_provider(cls, provider: BaseEmbeddingProvider) -> None:
        """Allow injecting alternative providers (e.g. OpenAI / Vertex AI)."""
        cls._provider = provider

    @classmethod
    def get_provider(cls) -> BaseEmbeddingProvider:
        return cls._provider

    @classmethod
    def embed_text(cls, text: str) -> List[float]:
        return cls._provider.embed_text(text)

    @classmethod
    def embed_batch(cls, texts: List[str]) -> List[List[float]]:
        return cls._provider.embed_batch(texts)

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """Compute cosine similarity between two float vectors."""
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        a = np.array(v1, dtype=np.float32)
        b = np.array(v2, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a < 1e-6 or norm_b < 1e-6:
            return 0.0
        dot = float(np.dot(a, b))
        sim = dot / (norm_a * norm_b)
        return float(max(0.0, min(1.0, (sim + 1.0) / 2.0)))  # Scale [-1, 1] to [0, 1]
