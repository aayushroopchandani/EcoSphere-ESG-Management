from __future__ import annotations

import os
from typing import Any


def _cloudinary_configured() -> bool:
    return bool(
        os.getenv("CLOUDINARY_CLOUD_NAME")
        and os.getenv("CLOUDINARY_API_KEY")
        and os.getenv("CLOUDINARY_API_SECRET")
    )


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

    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
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

    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True,
    )
    cloudinary.uploader.destroy(public_id, resource_type=resource_type)
