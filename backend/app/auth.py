"""
Authentication module for JWT token verification.

Uses Supabase JWT tokens issued by the frontend auth flow.
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.config import settings

# HTTP Bearer security scheme
security = HTTPBearer()


class AuthenticatedUser(BaseModel):
    """Authenticated user information extracted from JWT token."""
    user_id: str
    email: str | None = None
    
    
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> AuthenticatedUser:
    """
    Verify JWT token and extract user information.
    
    This dependency can be added to any route that requires authentication.
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        AuthenticatedUser with user_id extracted from token
        
    Raises:
        HTTPException 401 if token is invalid or expired
    """
    token = credentials.credentials
    
    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT secret not configured"
        )
    
    try:
        # Decode and verify the JWT token
        # Supabase uses HS256 algorithm by default
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",  # Supabase sets this for authenticated users
        )
        
        # Extract user ID from 'sub' claim (standard JWT subject)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID"
            )
        
        # Extract email if available
        email = payload.get("email")
        
        return AuthenticatedUser(user_id=user_id, email=email)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


# Dependency alias for cleaner imports
get_current_user = verify_token
