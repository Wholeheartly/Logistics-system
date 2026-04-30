"""
配置发现服务

自动扫描系统中的可配置字段，包括：
- 物流商参数（燃油费率、住宅附加费、体积除数等）
- 附加费配置（AHS、DAS、偏远地区等）
- 系统参数（重量上限、Zone 范围等）
"""
import json
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.models import (
    ConfigItem, ConfigCategory, ConfigValueType,
    Carrier, SurchargeConfig
)


def _serialize_value(value: Any, value_type: str) -> str:
    """将值序列化为字符串存储"""
    if value is None:
        return ""
    if value_type == ConfigValueType.JSON:
        return json.dumps(value, ensure_ascii=False)
    if value_type == ConfigValueType.BOOLEAN:
        return "true" if value else "false"
    return str(value)


def _parse_value(value_str: str, value_type: str) -> Any:
    """将字符串解析为对应类型"""
    if not value_str:
        return None
    if value_type == ConfigValueType.FLOAT:
        return float(value_str)
    if value_type == ConfigValueType.INT:
        return int(value_str)
    if value_type == ConfigValueType.BOOLEAN:
        return value_str.lower() == "true"
    if value_type == ConfigValueType.JSON:
        return json.loads(value_str)
    return value_str


def discover_carrier_configs(session: Session) -> List[Dict]:
    """发现物流商相关配置字段"""
    configs = []
    carriers = session.query(Carrier).all()

    for carrier in carriers:
        prefix = f"carrier.{carrier.id}"

        # 燃油费率
        configs.append({
            "config_key": f"{prefix}.fuel_rate",
            "category": ConfigCategory.CARRIER,
            "sub_category": carrier.name,
            "display_name": f"{carrier.name} - 燃油费率",
            "description": f"{carrier.name} 的燃油附加费费率，基于基础运费和最高附加费计算",
            "current_value": _serialize_value(carrier.fuel_rate, ConfigValueType.FLOAT),
            "default_value": "0.20",
            "value_type": ConfigValueType.FLOAT,
            "unit": "%",
            "min_value": 0.0,
            "max_value": 1.0,
            "related_entity_type": "Carrier",
            "related_entity_id": carrier.id,
            "related_field": "fuel_rate",
        })

        # 住宅附加费
        configs.append({
            "config_key": f"{prefix}.residential_fee",
            "category": ConfigCategory.CARRIER,
            "sub_category": carrier.name,
            "display_name": f"{carrier.name} - 住宅附加费",
            "description": f"{carrier.name} 的住宅地址附加费金额",
            "current_value": _serialize_value(carrier.residential_fee, ConfigValueType.FLOAT),
            "default_value": "0.0",
            "value_type": ConfigValueType.FLOAT,
            "unit": "$",
            "min_value": 0.0,
            "max_value": 50.0,
            "related_entity_type": "Carrier",
            "related_entity_id": carrier.id,
            "related_field": "residential_fee",
        })

        # 体积除数
        configs.append({
            "config_key": f"{prefix}.dim_factor",
            "category": ConfigCategory.CARRIER,
            "sub_category": carrier.name,
            "display_name": f"{carrier.name} - 体积除数",
            "description": f"{carrier.name} 的体积重量计算除数（体积/除数=体积重）",
            "current_value": _serialize_value(carrier.dim_factor, ConfigValueType.INT),
            "default_value": "166",
            "value_type": ConfigValueType.INT,
            "unit": "",
            "related_entity_type": "Carrier",
            "related_entity_id": carrier.id,
            "related_field": "dim_factor",
        })

        # 最大计费重
        configs.append({
            "config_key": f"{prefix}.max_weight_lb",
            "category": ConfigCategory.CARRIER,
            "sub_category": carrier.name,
            "display_name": f"{carrier.name} - 最大计费重",
            "description": f"{carrier.name} 支持的最大计费重量（磅）",
            "current_value": _serialize_value(carrier.max_weight_lb, ConfigValueType.INT),
            "default_value": "150",
            "value_type": ConfigValueType.INT,
            "unit": "lbs",
            "related_entity_type": "Carrier",
            "related_entity_id": carrier.id,
            "related_field": "max_weight_lb",
        })

        # 是否收取住宅费
        configs.append({
            "config_key": f"{prefix}.has_residential_fee",
            "category": ConfigCategory.CARRIER,
            "sub_category": carrier.name,
            "display_name": f"{carrier.name} - 启用住宅附加费",
            "description": f"是否对 {carrier.name} 收取住宅地址附加费",
            "current_value": _serialize_value(carrier.has_residential_fee, ConfigValueType.BOOLEAN),
            "default_value": "false",
            "value_type": ConfigValueType.BOOLEAN,
            "unit": "",
            "related_entity_type": "Carrier",
            "related_entity_id": carrier.id,
            "related_field": "has_residential_fee",
        })

    return configs


def discover_surcharge_configs(session: Session) -> List[Dict]:
    """发现附加费配置字段"""
    configs = []
    surcharges = session.query(SurchargeConfig).all()

    for sc in surcharges:
        carrier_name = sc.carrier.name if sc.carrier else "Unknown"
        prefix = f"surcharge.{sc.id}"

        configs.append({
            "config_key": f"{prefix}.amount",
            "category": ConfigCategory.SURCHARGE,
            "sub_category": f"{carrier_name} - {sc.surcharge_type}",
            "display_name": f"{carrier_name} - {sc.surcharge_type} ({sc.zone_group})",
            "description": f"{carrier_name} 的 {sc.surcharge_type} 附加费金额，适用于 Zone {sc.zone_group}",
            "current_value": _serialize_value(sc.amount, ConfigValueType.FLOAT),
            "default_value": "0.0",
            "value_type": ConfigValueType.FLOAT,
            "unit": "$",
            "min_value": 0.0,
            "max_value": 100.0,
            "related_entity_type": "SurchargeConfig",
            "related_entity_id": sc.id,
            "related_field": "amount",
        })

    return configs


def discover_system_configs(session: Session) -> List[Dict]:
    """发现系统级配置字段"""
    configs = []

    # 全局系统配置（不绑定具体实体）
    configs.append({
        "config_key": "system.default_warehouse",
        "category": ConfigCategory.SYSTEM,
        "sub_category": "默认设置",
        "display_name": "默认发货仓",
        "description": "系统默认的发货仓库代码",
        "current_value": "CA",
        "default_value": "CA",
        "value_type": ConfigValueType.STRING,
        "unit": "",
        "related_entity_type": None,
        "related_entity_id": None,
        "related_field": None,
    })

    configs.append({
        "config_key": "system.weight_precision",
        "category": ConfigCategory.SYSTEM,
        "sub_category": "计算精度",
        "display_name": "重量精度",
        "description": "重量计算保留的小数位数",
        "current_value": "2",
        "default_value": "2",
        "value_type": ConfigValueType.INT,
        "unit": "位",
        "min_value": 0.0,
        "max_value": 4.0,
        "related_entity_type": None,
        "related_entity_id": None,
        "related_field": None,
    })

    configs.append({
        "config_key": "system.price_precision",
        "category": ConfigCategory.SYSTEM,
        "sub_category": "计算精度",
        "display_name": "金额精度",
        "description": "金额计算保留的小数位数",
        "current_value": "2",
        "default_value": "2",
        "value_type": ConfigValueType.INT,
        "unit": "位",
        "min_value": 0.0,
        "max_value": 4.0,
        "related_entity_type": None,
        "related_entity_id": None,
        "related_field": None,
    })

    return configs


def sync_config_items(session: Session) -> Dict[str, int]:
    """
    同步系统配置到 config_items 表。
    扫描所有可配置字段，创建或更新配置项。
    返回统计信息。
    """
    stats = {"created": 0, "updated": 0, "unchanged": 0}
    now = datetime.now()

    # 收集所有发现的配置
    all_configs = []
    all_configs.extend(discover_carrier_configs(session))
    all_configs.extend(discover_surcharge_configs(session))
    all_configs.extend(discover_system_configs(session))

    for config_data in all_configs:
        existing = session.query(ConfigItem).filter(
            ConfigItem.config_key == config_data["config_key"]
        ).first()

        if existing:
            # 更新现有配置（只更新当前值和元数据，不覆盖用户修改）
            if existing.related_entity_id and existing.related_field:
                # 从关联实体同步当前值
                current_val = _fetch_entity_value(
                    session,
                    existing.related_entity_type,
                    existing.related_entity_id,
                    existing.related_field
                )
                if current_val is not None:
                    existing.current_value = _serialize_value(current_val, existing.value_type)

            existing.display_name = config_data["display_name"]
            existing.description = config_data["description"]
            existing.updated_at = now
            stats["updated"] += 1
        else:
            # 创建新配置项
            new_item = ConfigItem(
                config_key=config_data["config_key"],
                category=config_data["category"],
                sub_category=config_data.get("sub_category"),
                display_name=config_data["display_name"],
                description=config_data.get("description"),
                current_value=config_data["current_value"],
                default_value=config_data.get("default_value"),
                value_type=config_data["value_type"],
                unit=config_data.get("unit"),
                min_value=config_data.get("min_value"),
                max_value=config_data.get("max_value"),
                related_entity_type=config_data.get("related_entity_type"),
                related_entity_id=config_data.get("related_entity_id"),
                related_field=config_data.get("related_field"),
                created_at=now,
                updated_at=now,
            )
            session.add(new_item)
            stats["created"] += 1

    session.commit()
    return stats


def _fetch_entity_value(session: Session, entity_type: str, entity_id: int, field: str) -> Any:
    """从关联实体获取字段当前值"""
    if entity_type == "Carrier":
        entity = session.query(Carrier).filter(Carrier.id == entity_id).first()
        if entity:
            return getattr(entity, field, None)
    elif entity_type == "SurchargeConfig":
        entity = session.query(SurchargeConfig).filter(SurchargeConfig.id == entity_id).first()
        if entity:
            return getattr(entity, field, None)
    return None


def apply_config_change(session: Session, config_item: ConfigItem, new_value: str, reason: str = "", user: str = "system") -> bool:
    """
    应用配置变更。
    1. 记录历史
    2. 更新 config_items
    3. 同步到关联实体
    """
    from app.models.models import ConfigHistory

    old_value = config_item.current_value

    # 创建历史记录
    history = ConfigHistory(
        config_id=config_item.id,
        old_value=old_value,
        new_value=new_value,
        change_reason=reason,
        changed_by=user,
        change_type="manual",
        created_at=datetime.now(),
    )
    session.add(history)

    # 更新配置项
    config_item.current_value = new_value
    config_item.updated_at = datetime.now()

    # 同步到关联实体
    if config_item.related_entity_type and config_item.related_entity_id and config_item.related_field:
        _update_entity_value(
            session,
            config_item.related_entity_type,
            config_item.related_entity_id,
            config_item.related_field,
            new_value,
            config_item.value_type
        )

    session.commit()
    return True


def _update_entity_value(session: Session, entity_type: str, entity_id: int, field: str, value_str: str, value_type: str):
    """更新关联实体的字段值"""
    parsed_value = _parse_value(value_str, value_type)

    if entity_type == "Carrier":
        entity = session.query(Carrier).filter(Carrier.id == entity_id).first()
        if entity:
            setattr(entity, field, parsed_value)
    elif entity_type == "SurchargeConfig":
        entity = session.query(SurchargeConfig).filter(SurchargeConfig.id == entity_id).first()
        if entity:
            setattr(entity, field, parsed_value)
