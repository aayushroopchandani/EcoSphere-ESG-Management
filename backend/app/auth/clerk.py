from functools import lru_cache
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError

from app.core.config import settings

ClerkClaims = dict[str, Any]

security = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_jwk_client() -> PyJWKClient:
    if not settings.clerk_jwks_url:
        raise RuntimeError("CLERK_JWKS_URL is required to verify Clerk tokens")

    return PyJWKClient(settings.clerk_jwks_url)


def decode_clerk_token(token: str) -> ClerkClaims:
    try:
        header = jwt.get_unverified_header(token)

        if header.get("alg") != "RS256":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unsupported Clerk token algorithm",
            )

        signing_key = get_jwk_client().get_signing_key_from_jwt(token)
        decode_kwargs: dict[str, Any] = {
            "algorithms": ["RS256"],
            "options": {"verify_aud": False},
        }

        if settings.clerk_issuer:
            decode_kwargs["issuer"] = settings.clerk_issuer

        claims = jwt.decode(token, signing_key.key, **decode_kwargs)

        authorized_party = claims.get("azp")
        if (
            authorized_party
            and settings.clerk_authorized_parties
            and authorized_party not in settings.clerk_authorized_parties
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Clerk authorized party",
            )

        if claims.get("sts") == "pending":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Clerk session is pending",
            )

        if not claims.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Clerk token is missing a user subject",
            )

        return claims
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except (InvalidTokenError, PyJWKClientError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Clerk session token",
        ) from exc


async def get_current_clerk_claims(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> ClerkClaims:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    return decode_clerk_token(credentials.credentials)
