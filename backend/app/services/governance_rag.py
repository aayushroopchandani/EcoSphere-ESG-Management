from __future__ import annotations

import hashlib
import re
import uuid
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.models.governance import ComplianceSeverity, PolicyCategory
from app.schemas.governance import GovernanceCitation
from app.utils.prompts import (
    get_governance_human_message,
    get_governance_risk_human_message,
    get_governance_risk_system_message,
    get_governance_system_message,
)

GOVERNANCE_VECTOR_SIZE = 1536
NOT_FOUND_PHRASE = "I could not find this information in the uploaded governance documents."


@dataclass(frozen=True)
class ExtractedPage:
    page_number: int
    text: str


@dataclass(frozen=True)
class PolicyChunk:
    chunk_index: int
    page_number: int
    text: str


@dataclass(frozen=True)
class IndexedPolicyDocument:
    page_count: int
    chunk_count: int


@dataclass(frozen=True)
class RetrievedPolicyChunk:
    score: float
    payload: dict[str, Any]


@dataclass(frozen=True)
class GovernanceRagResult:
    answer: str
    citations: list[GovernanceCitation]
    answer_found: bool


def compute_document_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def _require_dependency(module_name: str, package_name: str | None = None):
    try:
        return __import__(module_name)
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            f"{package_name or module_name} is not installed. "
            "Install backend requirements before using Governance RAG."
        ) from exc


@lru_cache(maxsize=1)
def _get_openai_client():
    openai_module = _require_dependency("openai")
    api_key = settings.openai_api_key or settings.openrouter_api_key

    if not api_key:
        raise RuntimeError("OPENAI_API_KEY or OPENROUTER_API_KEY is required")

    base_url = (
        settings.openrouter_base_url
        if settings.openrouter_api_key
        else settings.openai_base_url
    )

    return openai_module.OpenAI(api_key=api_key, base_url=base_url)


@lru_cache(maxsize=1)
def _get_embedding_client():
    openai_module = _require_dependency("openai")

    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required for document embeddings")

    return openai_module.OpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
    )


@lru_cache(maxsize=1)
def _get_qdrant_client():
    qdrant_client_module = _require_dependency("qdrant_client", "qdrant-client")
    qdrant_client = qdrant_client_module.QdrantClient

    if settings.qdrant_url:
        kwargs: dict[str, Any] = {"url": settings.qdrant_url}
        if settings.qdrant_api_key:
            kwargs["api_key"] = settings.qdrant_api_key
        return qdrant_client(**kwargs)

    if settings.qdrant_host:
        kwargs = {
            "host": settings.qdrant_host,
            "port": settings.qdrant_port,
        }
        if settings.qdrant_api_key:
            kwargs["api_key"] = settings.qdrant_api_key
        return qdrant_client(**kwargs)

    qdrant_path = settings.qdrant_path or "qdrant_storage"
    path = Path(qdrant_path)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path

    return qdrant_client(path=str(path.resolve()))


def _qdrant_models():
    qdrant_client_module = _require_dependency("qdrant_client", "qdrant-client")
    return qdrant_client_module.models


@lru_cache(maxsize=1)
def ensure_governance_collection() -> None:
    client = _get_qdrant_client()
    models = _qdrant_models()
    collection_name = settings.governance_qdrant_collection

    if not client.collection_exists(collection_name):
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=GOVERNANCE_VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )

    for field_name in (
        "policy_id",
        "document_id",
        "category",
        "department_id",
        "ingestion_status",
    ):
        try:
            client.create_payload_index(
                collection_name=collection_name,
                field_name=field_name,
                field_schema=models.PayloadSchemaType.KEYWORD,
                wait=True,
            )
        except Exception:
            # Qdrant raises when an index already exists; this path is harmless.
            pass


def extract_pdf_pages(file_bytes: bytes) -> list[ExtractedPage]:
    _require_dependency("fitz", "PyMuPDF")
    import fitz

    document = fitz.open(stream=file_bytes, filetype="pdf")
    pages: list[ExtractedPage] = []

    try:
        for page_index, page in enumerate(document, start=1):
            text = re.sub(r"\s+", " ", page.get_text("text") or "").strip()
            if text:
                pages.append(ExtractedPage(page_number=page_index, text=text))
    finally:
        document.close()

    if not pages:
        raise ValueError("PDF does not contain extractable text")

    return pages


def chunk_pages(pages: list[ExtractedPage]) -> list[PolicyChunk]:
    chunks: list[PolicyChunk] = []
    chunk_size = settings.governance_rag_chunk_size
    overlap = min(settings.governance_rag_chunk_overlap, max(0, chunk_size - 1))

    for page in pages:
        start = 0
        while start < len(page.text):
            end = min(len(page.text), start + chunk_size)
            chunk_text = page.text[start:end].strip()
            if chunk_text:
                chunks.append(
                    PolicyChunk(
                        chunk_index=len(chunks),
                        page_number=page.page_number,
                        text=chunk_text,
                    )
                )

            if end >= len(page.text):
                break

            start = max(0, end - overlap)

    return chunks


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    client = _get_embedding_client()
    embeddings: list[list[float]] = []
    batch_size = 64

    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        response = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=batch,
        )
        embeddings.extend([item.embedding for item in response.data])

    return embeddings


def index_policy_pdf(
    *,
    file_bytes: bytes,
    document_id: str,
    policy_id: str,
    policy_title: str,
    category: PolicyCategory,
    filename: str,
    uploaded_by: str,
    department_id: str | None = None,
) -> IndexedPolicyDocument:
    pages = extract_pdf_pages(file_bytes)
    chunks = chunk_pages(pages)

    if not chunks:
        raise ValueError("PDF did not produce any searchable chunks")

    embeddings = embed_texts([chunk.text for chunk in chunks])
    ensure_governance_collection()

    client = _get_qdrant_client()
    models = _qdrant_models()
    points = []

    for chunk, embedding in zip(chunks, embeddings, strict=True):
        point_id = str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"governance:{document_id}:{chunk.chunk_index}",
            )
        )
        points.append(
            models.PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "document_id": document_id,
                    "policy_id": policy_id,
                    "policy_title": policy_title,
                    "category": category.value,
                    "department_id": department_id,
                    "document_name": filename,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "uploaded_by": uploaded_by,
                    "ingestion_status": "ready",
                    "text": chunk.text,
                },
            )
        )

    client.upsert(
        collection_name=settings.governance_qdrant_collection,
        points=points,
        wait=True,
    )

    return IndexedPolicyDocument(
        page_count=len(pages),
        chunk_count=len(chunks),
    )


def _build_filter(
    *,
    policy_ids: list[str] | None = None,
    document_ids: list[str] | None = None,
) -> Any | None:
    models = _qdrant_models()
    must = [
        models.FieldCondition(
            key="ingestion_status",
            match=models.MatchValue(value="ready"),
        )
    ]

    if policy_ids:
        must.append(
            models.FieldCondition(
                key="policy_id",
                match=models.MatchAny(any=policy_ids),
            )
        )

    if document_ids:
        must.append(
            models.FieldCondition(
                key="document_id",
                match=models.MatchAny(any=document_ids),
            )
        )

    return models.Filter(must=must)


def retrieve_policy_chunks(
    *,
    query: str,
    policy_ids: list[str] | None = None,
    document_ids: list[str] | None = None,
    limit: int | None = None,
) -> list[RetrievedPolicyChunk]:
    ensure_governance_collection()
    query_vector = embed_texts([query])[0]
    client = _get_qdrant_client()
    query_filter = _build_filter(policy_ids=policy_ids, document_ids=document_ids)
    top_k = limit or settings.governance_rag_top_k

    if hasattr(client, "query_points"):
        result = client.query_points(
            collection_name=settings.governance_qdrant_collection,
            query=query_vector,
            query_filter=query_filter,
            limit=top_k,
            with_payload=True,
        )
        points = result.points
    else:
        points = client.search(
            collection_name=settings.governance_qdrant_collection,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=top_k,
            with_payload=True,
        )

    return [
        RetrievedPolicyChunk(
            score=float(getattr(point, "score", 0) or 0),
            payload=dict(getattr(point, "payload", None) or {}),
        )
        for point in points
    ]


def _excerpt(text: str, limit: int = 260) -> str:
    normalized = re.sub(r"\s+", " ", text).strip()
    return normalized[:limit] + ("..." if len(normalized) > limit else "")


def format_chunks_for_prompt(
    chunks: list[RetrievedPolicyChunk],
) -> tuple[str, list[GovernanceCitation]]:
    blocks: list[str] = []
    citations: list[GovernanceCitation] = []

    for index, chunk in enumerate(chunks, start=1):
        payload = chunk.payload
        citation_id = f"C{index}"
        text = str(payload.get("text") or "").strip()

        if not text:
            continue

        citation = GovernanceCitation(
            citation_id=citation_id,
            document_id=str(payload.get("document_id") or "unknown"),
            policy_id=str(payload.get("policy_id") or "unknown"),
            document_name=str(payload.get("document_name") or "Unknown document"),
            policy_title=str(payload.get("policy_title") or "Unknown policy"),
            page_number=payload.get("page_number"),
            excerpt=_excerpt(text),
        )
        citations.append(citation)

        page = (
            f"\nPage: {citation.page_number}"
            if citation.page_number is not None
            else ""
        )
        blocks.append(
            "\n".join(
                [
                    f"[{citation_id}]",
                    f"Policy: {citation.policy_title}",
                    f"Document: {citation.document_name}",
                    f"Document ID: {citation.document_id}",
                    page.strip(),
                    "",
                    text,
                ]
            ).strip()
        )

    return "\n\n---\n\n".join(blocks), citations


def _chat_model_name() -> str:
    if settings.openrouter_api_key:
        return settings.governance_llm_model

    return settings.openai_chat_model


def _generate_chat_completion(system_prompt: str, human_prompt: str) -> str:
    client = _get_openai_client()
    response = client.chat.completions.create(
        model=_chat_model_name(),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": human_prompt},
        ],
        temperature=0.2,
    )

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("The governance copilot returned an empty response")

    return content.strip()


def _filter_used_citations(
    answer: str,
    citations: list[GovernanceCitation],
) -> list[GovernanceCitation]:
    if NOT_FOUND_PHRASE.lower() in answer.lower():
        return []

    used_ids = {f"C{number}" for number in re.findall(r"\[C(\d+)\]", answer)}
    if not used_ids:
        return citations[:3]

    return [citation for citation in citations if citation.citation_id in used_ids]


def answer_governance_question(
    *,
    question: str,
    policy_ids: list[str] | None = None,
    document_ids: list[str] | None = None,
) -> GovernanceRagResult:
    chunks = retrieve_policy_chunks(
        query=question,
        policy_ids=policy_ids,
        document_ids=document_ids,
    )

    if not chunks:
        return GovernanceRagResult(
            answer=NOT_FOUND_PHRASE,
            citations=[],
            answer_found=False,
        )

    context, citations = format_chunks_for_prompt(chunks)
    answer = _generate_chat_completion(
        system_prompt=get_governance_system_message(),
        human_prompt=get_governance_human_message(question, context),
    )
    used_citations = _filter_used_citations(answer, citations)

    return GovernanceRagResult(
        answer=answer,
        citations=used_citations,
        answer_found=bool(used_citations)
        and NOT_FOUND_PHRASE.lower() not in answer.lower(),
    )


def _extract_risk_level(answer: str) -> ComplianceSeverity | None:
    match = re.search(
        r"risk level\s*:\s*(low|medium|high|critical)",
        answer,
        flags=re.IGNORECASE,
    )

    if not match:
        return None

    return ComplianceSeverity(match.group(1).lower())


def generate_governance_risk_summary(
    *,
    issue_details: str,
    policy_ids: list[str] | None = None,
) -> tuple[str, list[GovernanceCitation], ComplianceSeverity | None]:
    chunks = retrieve_policy_chunks(
        query=issue_details,
        policy_ids=policy_ids,
        limit=max(settings.governance_rag_top_k, 10),
    )
    context, citations = format_chunks_for_prompt(chunks)
    answer = _generate_chat_completion(
        system_prompt=get_governance_risk_system_message(),
        human_prompt=get_governance_risk_human_message(issue_details, context),
    )
    used_citations = _filter_used_citations(answer, citations)

    return answer, used_citations, _extract_risk_level(answer)
