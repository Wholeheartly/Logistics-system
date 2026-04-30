"""
基础运费查表服务
"""
from sqlalchemy.orm import Session
from app.models.models import BaseRate


def get_base_rate(session: Session, carrier_id: int, weight_lb: int, zone: int) -> float | None:
    """查基础运费表。weight_lb 为计费重（int），不足 1lb 按 1lb 计。"""
    rate = (
        session.query(BaseRate)
        .filter(
            BaseRate.carrier_id == carrier_id,
            BaseRate.weight_lb == weight_lb,
            BaseRate.zone == zone,
        )
        .first()
    )
    return rate.rate if rate else None
