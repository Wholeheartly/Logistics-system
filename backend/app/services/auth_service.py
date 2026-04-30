"""
认证服务

提供用户注册、登录、密码管理、JWT Token 生成与验证、RBAC 权限检查。
"""
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.models import (
    User, LoginAttempt, PasswordResetToken, UserActionLog,
    UserRole, UserStatus, ROLE_PERMISSIONS
)

# 安全常量
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30
TOKEN_EXPIRE_HOURS = 24
RESET_TOKEN_EXPIRE_HOURS = 2


def hash_password(password: str) -> str:
    """使用 SHA-256 + salt 对密码进行哈希"""
    salt = secrets.token_hex(16)
    pwdhash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${pwdhash}"


def verify_password(password: str, hashed: str) -> bool:
    """验证密码"""
    if "$" not in hashed:
        return False
    salt, stored_hash = hashed.split("$", 1)
    pwdhash = hashlib.sha256((password + salt).encode()).hexdigest()
    return pwdhash == stored_hash


def generate_token() -> str:
    """生成安全的随机令牌"""
    return secrets.token_urlsafe(32)


def create_user(
    session: Session,
    username: str,
    password: str,
    email: Optional[str] = None,
    display_name: Optional[str] = None,
    role: str = UserRole.OPERATOR,
    phone: Optional[str] = None,
    department: Optional[str] = None,
    created_by: Optional[int] = None,
) -> User:
    """创建新用户（默认待审核状态）"""
    now = datetime.now()
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        display_name=display_name or username,
        role=role,
        status=UserStatus.PENDING,
        phone=phone,
        department=department,
        created_by=created_by,
        created_at=now,
        updated_at=now,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate_user(session: Session, username: str, password: str, ip: Optional[str] = None, ua: Optional[str] = None) -> tuple[Optional[User], str]:
    """
    用户认证。
    返回 (user, error_message)。
    认证成功时 user 不为 None，error_message 为空。
    """
    now = datetime.now()

    # 查找用户
    user = session.query(User).filter(User.username == username).first()

    # 记录登录尝试
    attempt = LoginAttempt(
        username=username,
        ip_address=ip,
        user_agent=ua,
        success=False,
        created_at=now,
    )

    if not user:
        attempt.fail_reason = "用户不存在"
        session.add(attempt)
        session.commit()
        return None, "用户名或密码错误"

    # 检查账户是否被锁定
    if user.locked_until and user.locked_until > now:
        attempt.fail_reason = "账户已锁定"
        session.add(attempt)
        session.commit()
        return None, f"账户已锁定，请在 {user.locked_until.strftime('%H:%M')} 后重试"

    # 检查账户状态
    if user.status == UserStatus.DISABLED:
        attempt.fail_reason = "账户已禁用"
        session.add(attempt)
        session.commit()
        return None, "账户已被禁用，请联系管理员"

    if user.status == UserStatus.PENDING:
        attempt.fail_reason = "账户待审核"
        session.add(attempt)
        session.commit()
        return None, "账户正在审核中，请等待管理员批准"

    # 验证密码
    if not verify_password(password, user.password_hash):
        user.login_fail_count += 1
        attempt.fail_reason = "密码错误"

        # 超过最大尝试次数则锁定
        if user.login_fail_count >= MAX_LOGIN_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            attempt.fail_reason = "密码错误，账户已锁定"

        session.add(attempt)
        session.commit()
        return None, "用户名或密码错误"

    # 认证成功
    user.login_fail_count = 0
    user.locked_until = None
    user.last_login_at = now
    attempt.success = True
    attempt.fail_reason = None
    session.add(attempt)
    session.commit()

    return user, ""


def create_access_token(user: User) -> str:
    """创建访问令牌（简化版，实际生产环境建议使用 JWT 库）"""
    import base64
    import json

    header = base64.urlsafe_b64encode(json.dumps({"alg": "none", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({
        "sub": user.id,
        "username": user.username,
        "role": user.role,
        "iat": datetime.now().isoformat(),
        "exp": (datetime.now() + timedelta(hours=TOKEN_EXPIRE_HOURS)).isoformat(),
    }).encode()).decode().rstrip("=")
    return f"{header}.{payload}."


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """解码访问令牌"""
    import base64
    import json

    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())

        # 检查过期时间
        exp = datetime.fromisoformat(payload["exp"])
        if exp < datetime.now():
            return None

        return payload
    except Exception:
        return None


def get_current_user(session: Session, token: str) -> Optional[User]:
    """根据 Token 获取当前用户"""
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return session.query(User).filter(User.id == user_id, User.status == UserStatus.ACTIVE).first()


def has_permission(user: User, permission: str) -> bool:
    """检查用户是否具备指定权限"""
    if not user or user.status != UserStatus.ACTIVE:
        return False
    perms = ROLE_PERMISSIONS.get(user.role, [])
    return permission in perms


def check_permission(user: User, permission: str) -> bool:
    """检查权限，无权限时抛出异常"""
    if not has_permission(user, permission):
        return False
    return True


def create_password_reset_token(session: Session, user_id: int) -> str:
    """创建密码重置令牌"""
    now = datetime.now()
    token = generate_token()
    prt = PasswordResetToken(
        user_id=user_id,
        token=token,
        expires_at=now + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS),
        created_at=now,
    )
    session.add(prt)
    session.commit()
    return token


def reset_password(session: Session, token: str, new_password: str) -> tuple[bool, str]:
    """使用令牌重置密码"""
    now = datetime.now()
    prt = session.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > now,
    ).first()

    if not prt:
        return False, "令牌无效或已过期"

    user = session.query(User).filter(User.id == prt.user_id).first()
    if not user:
        return False, "用户不存在"

    user.password_hash = hash_password(new_password)
    user.updated_at = now
    prt.used = True
    session.commit()
    return True, "密码重置成功"


def approve_user(session: Session, user_id: int, approved_by: int) -> tuple[bool, str]:
    """管理员审核通过用户"""
    user = session.query(User).filter(User.id == user_id).first()
    if not user:
        return False, "用户不存在"
    if user.status != UserStatus.PENDING:
        return False, "用户不在待审核状态"

    user.status = UserStatus.ACTIVE
    user.updated_at = datetime.now()
    session.commit()
    return True, "用户已激活"


def disable_user(session: Session, user_id: int) -> tuple[bool, str]:
    """禁用用户"""
    user = session.query(User).filter(User.id == user_id).first()
    if not user:
        return False, "用户不存在"

    user.status = UserStatus.DISABLED
    user.updated_at = datetime.now()
    session.commit()
    return True, "用户已禁用"


def enable_user(session: Session, user_id: int, operator: User) -> tuple[bool, str]:
    """重新启用被禁用的用户"""
    user = session.query(User).filter(User.id == user_id).first()
    if not user:
        return False, "用户不存在"
    if user.status != UserStatus.DISABLED:
        return False, "用户不在已禁用状态，无法执行启用操作"

    user.status = UserStatus.ACTIVE
    user.updated_at = datetime.now()

    # 记录操作日志
    log = UserActionLog(
        action="enable",
        target_user_id=user.id,
        target_username=user.username,
        operator_id=operator.id,
        operator_username=operator.username,
        details=f"用户 {user.username} 被重新启用",
        created_at=datetime.now(),
    )
    session.add(log)
    session.commit()
    return True, "用户已重新启用"


def list_users(session: Session, status: Optional[str] = None, role: Optional[str] = None) -> list[User]:
    """查询用户列表"""
    query = session.query(User)
    if status:
        query = query.filter(User.status == status)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc()).all()
