"""
初始化用户数据脚本
创建默认管理员账户用于测试登录
运行: cd backend && python scripts/init_users.py
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models.models import Base, User, UserRole, UserStatus
from app.services.auth_service import hash_password

DB_URL = os.environ.get("DATABASE_URL", "")
if not DB_URL:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    DB_PATH = os.path.join(PROJECT_ROOT, "backend", "logistics.db")
    DB_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DB_URL, echo=False)
Base.metadata.create_all(engine)


def init_users():
    with Session(engine) as session:
        now = datetime.now()

        existing = session.query(User).filter(User.username == "admin").first()
        if existing:
            print("默认用户已存在，跳过创建")
            print("  管理员: admin / admin123")
            print("  运营:   operator / operator123")
            print("  财务:   finance / finance123")
            return

        admin = User(
            username="admin",
            email="admin@example.com",
            password_hash=hash_password("admin123"),
            display_name="系统管理员",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            phone="13800138000",
            department="管理部",
            created_at=now,
            updated_at=now,
        )

        operator = User(
            username="operator",
            email="operator@example.com",
            password_hash=hash_password("operator123"),
            display_name="运营人员",
            role=UserRole.OPERATOR,
            status=UserStatus.ACTIVE,
            phone="13800138001",
            department="运营部",
            created_at=now,
            updated_at=now,
        )

        finance = User(
            username="finance",
            email="finance@example.com",
            password_hash=hash_password("finance123"),
            display_name="财务人员",
            role=UserRole.FINANCE,
            status=UserStatus.ACTIVE,
            phone="13800138002",
            department="财务部",
            created_at=now,
            updated_at=now,
        )

        session.add(admin)
        session.add(operator)
        session.add(finance)
        session.commit()

        print("默认用户创建成功:")
        print("  管理员: admin / admin123")
        print("  运营:   operator / operator123")
        print("  财务:   finance / finance123")


if __name__ == "__main__":
    init_users()
