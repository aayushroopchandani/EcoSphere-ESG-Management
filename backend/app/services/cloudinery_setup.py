from __future__ import annotations

from typing import Any

from app.core.config import settings


def _clean_secret(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = value.strip().strip('"').strip("'")
    return cleaned or None


def _cloudinary_credentials() -> tuple[str, str, str] | None:
    cloud_name = _clean_secret(settings.cloudinary_cloud_name)
    api_key = _clean_secret(settings.cloudinary_api_key)
    api_secret = _clean_secret(settings.cloudinary_api_secret)

    if not cloud_name or not api_key or not api_secret:
        return None

    return cloud_name, api_key, api_secret


def _cloudinary_configured() -> bool:
    return _cloudinary_credentials() is not None


def upload_pdf(
    file_bytes: bytes,
    *,
    folder: str,
    filename: str,
) -> dict[str, Any] | None:
    """
    Upload a PDF to Cloudinary when credentials are configured.

    Returning None is intentional: governance RAG can still index the PDF from
    the uploaded bytes during local demos even without permanent file storage.
    """
    if not _cloudinary_configured():
        return None

    try:
        import cloudinary
        import cloudinary.uploader
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "cloudinary is not installed. Install backend requirements first."
        ) from exc

    credentials = _cloudinary_credentials()
    if credentials is None:
        return None

    cloud_name, api_key, api_secret = credentials
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )

    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder.strip("/"),
        public_id=filename.rsplit(".", 1)[0],
        resource_type="raw",
        use_filename=True,
        unique_filename=True,
        overwrite=False,
    )

    return {
        "asset_id": result.get("asset_id"),
        "public_id": result.get("public_id"),
        "secure_url": result.get("secure_url"),
        "resource_type": result.get("resource_type", "raw"),
        "bytes": result.get("bytes"),
        "filename": filename,
        "storage_provider": "cloudinary",
    }


def delete_pdf(
    public_id: str,
    *,
    resource_type: str = "raw",
) -> None:
    if not public_id or not _cloudinary_configured():
        return

    try:
        import cloudinary
        import cloudinary.uploader
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "cloudinary is not installed. Install backend requirements first."
        ) from exc

    credentials = _cloudinary_credentials()
    if credentials is None:
        return

    cloud_name, api_key, api_secret = credentials
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )
    cloudinary.uploader.destroy(public_id, resource_type=resource_type)
