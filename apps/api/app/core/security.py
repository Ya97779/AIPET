from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(user_id: str) -> str:
    """Simple token: base64(user_id:expiry). Not JWT - sufficient for MVP."""
    import base64
    expiry = datetime.now(timezone.utc) + timedelta(days=7)
    payload = f"{user_id}:{expiry.isoformat()}"
    return base64.b64encode(payload.encode()).decode()


def decode_token(token: str) -> str | None:
    """Returns user_id if valid, None if expired or invalid."""
    import base64
    try:
        payload = base64.b64decode(token.encode()).decode()
        user_id, expiry_str = payload.split(":", 1)
        expiry = datetime.fromisoformat(expiry_str)
        if datetime.now(timezone.utc) > expiry:
            return None
        return user_id
    except Exception:
        return None
