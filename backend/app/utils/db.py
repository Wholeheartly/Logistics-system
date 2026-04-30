"""
数据库连接辅助
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.models.models import Base

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "logistics.db")
DB_URL = f"sqlite:///{os.path.abspath(DB_PATH)}"

engine = create_engine(DB_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)

# 确保所有表已创建
Base.metadata.create_all(engine)


def get_session() -> Session:
    return SessionLocal()
