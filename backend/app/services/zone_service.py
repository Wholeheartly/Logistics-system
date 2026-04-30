"""
邮编分区查询服务
"""
from sqlalchemy.orm import Session
from app.models.models import ZoneMapping


def get_zone(session: Session, warehouse: str, zip_code: str) -> int | None:
    """根据邮编和发货仓查找 Zone。返回 None 表示找不到。"""
    zip_prefix = str(zip_code).strip()[:3]
    mapping = (
        session.query(ZoneMapping)
        .filter(ZoneMapping.warehouse == warehouse.upper(), ZoneMapping.zip_prefix == zip_prefix)
        .first()
    )
    return mapping.zone if mapping else None
