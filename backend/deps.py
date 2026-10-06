"""Shared FastAPI dependencies — extracting the authenticated user from the JWT."""

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from auth_utils import decode_access_token

# "Authorize" button in the Swagger UI, and also makes it easier to extract the token from the header.
_security = HTTPBearer()


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> str:
    try:
        return decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
