import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.models.models import Base

DB_URL = os.environ.get("DATABASE_URL", "")

if not DB_URL:
    DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "logistics.db")
    DB_URL = f"sqlite:///{os.path.abspath(DB_PATH)}"

_engine_kwargs = {}
if DB_URL.startswith("postgresql"):
    _engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    })
else:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DB_URL, echo=False, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(engine)


def get_session() -> Session:
    return SessionLocal()
