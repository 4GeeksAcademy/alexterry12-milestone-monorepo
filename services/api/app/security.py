"""Password hashing and verification for the TrackFlow company API."""
from passlib.hash import bcrypt


def hash_password(plain_password: str) -> str:
    """Scramble a plain-text password for storage. One direction only."""
    return bcrypt.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a typed password against the stored hash. True if they match."""
    return bcrypt.verify(plain_password, hashed_password)
