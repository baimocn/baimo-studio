from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.exceptions import UserExistsException
from ..core.security import create_access_token, hash_password, verify_password
from ..models.user import User


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def register(self, email: str, password: str) -> dict:
        result = await self.session.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            raise UserExistsException()

        user = User(email=email, password_hash=hash_password(password))
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        token = create_access_token(user.id, user.email)
        return {"token": token, "email": user.email, "user_id": user.id}

    async def login(self, email: str, password: str) -> dict:
        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user is None or not verify_password(password, user.password_hash):
            from ..core.exceptions import CredentialsException
            raise CredentialsException()

        token = create_access_token(user.id, user.email)
        return {"token": token, "email": user.email, "user_id": user.id}
