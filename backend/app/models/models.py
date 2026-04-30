from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime

Base = declarative_base()


class Carrier(Base):
    __tablename__ = "carriers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    dim_factor = Column(Integer, nullable=False)        # 体积除数
    residential_fee = Column(Float, default=0.0)         # 住宅附加费
    fuel_rate = Column(Float, default=0.20)              # 燃油费率
    max_weight_lb = Column(Integer, default=150)          # 计费重上限 (lbs)
    min_weight_lb = Column(Integer, default=1)            # 计费重下限
    zone_min = Column(Integer, default=2)
    zone_max = Column(Integer, default=8)
    has_residential_fee = Column(Boolean, default=False)
    transit_time = Column(String(50), default="1-5个工作日")

    base_rates = relationship("BaseRate", back_populates="carrier")
    surcharge_configs = relationship("SurchargeConfig", back_populates="carrier")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, default="")
    model = Column(String(100), nullable=True)
    specification = Column(String(500), nullable=True)
    price = Column(Float, nullable=True, default=0.0)
    stock_quantity = Column(Integer, nullable=True, default=0)
    # 原始单位（厘米/千克）
    length_cm = Column(Float, nullable=False)
    width_cm = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=False)
    gross_weight_kg = Column(Float, nullable=False)
    # 转换单位（英寸/磅）
    length_inch = Column(Float, nullable=True)
    width_inch = Column(Float, nullable=True)
    height_inch = Column(Float, nullable=True)
    gross_weight_lb = Column(Float, nullable=True)
    # 单位转换状态
    unit_converted = Column(Boolean, default=False, nullable=False)
    converted_at = Column(DateTime, nullable=True)
    category = Column(String(100), nullable=True)
    brand = Column(String(100), nullable=True)
    supplier = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)


class BaseRate(Base):
    __tablename__ = "base_rates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=False, index=True)
    weight_lb = Column(Integer, nullable=False)
    zone = Column(Integer, nullable=False)
    rate = Column(Float, nullable=False)

    carrier = relationship("Carrier", back_populates="base_rates")


class SurchargeConfig(Base):
    __tablename__ = "surcharge_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=False, index=True)
    surcharge_type = Column(String(50), nullable=False)  # AHS-Dim, AHS-Weight, AHS-Packaging, Oversize, DAS, Extended_DAS, Remote_DAS, DAR, USPS_NonMach
    zone_group = Column(String(20), nullable=False)       # "2", "3-4", "5-6", "7-8", "5+", "all"
    amount = Column(Float, nullable=False)

    carrier = relationship("Carrier", back_populates="surcharge_configs")


class ZoneMapping(Base):
    __tablename__ = "zone_mappings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    warehouse = Column(String(10), nullable=False, index=True)   # CA, NJ, TX, SAV
    zip_prefix = Column(String(5), nullable=False, index=True)   # 邮编前3位
    zone = Column(Integer, nullable=False)


class UnserviceableZip(Base):
    """不可达邮编"""
    __tablename__ = "unserviceable_zips"

    id = Column(Integer, primary_key=True, autoincrement=True)
    carrier_id = Column(Integer, ForeignKey("carriers.id"), nullable=True)  # NULL = 所有渠道
    state_code = Column(String(5), nullable=False)   # AK, HI, PR, GU, AA, AE, AP
    description = Column(String(100), nullable=True)


# ========== 对账系统模型 ==========

class ReconciliationBatch(Base):
    """对账批次"""
    __tablename__ = "reconciliation_batches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_no = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=True)
    file_name = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(20), nullable=False)
    total_records = Column(Integer, default=0)
    matched_records = Column(Integer, default=0)
    diff_records = Column(Integer, default=0)
    status = Column(String(20), default="processing")  # processing, completed, failed
    created_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    details = relationship("ReconciliationDetail", back_populates="batch")


class ReconciliationDetail(Base):
    """对账明细"""
    __tablename__ = "reconciliation_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(Integer, ForeignKey("reconciliation_batches.id"), nullable=False, index=True)
    row_no = Column(Integer, nullable=False)

    # 文件中的原始数据
    file_order_no = Column(String(100), nullable=True, index=True)
    file_tracking_no = Column(String(100), nullable=True, index=True)  # 添加索引：常用于查询和匹配
    file_sku = Column(String(50), nullable=True, index=True)  # 添加索引：常用于筛选和关联产品
    file_carrier = Column(String(50), nullable=True)
    file_service = Column(String(50), nullable=True)
    file_total_amount = Column(Float, nullable=True)
    file_base_amount = Column(Float, nullable=True)
    file_qty = Column(Integer, nullable=True)
    file_weight_lb = Column(Float, nullable=True)
    file_dim_weight_lb = Column(Float, nullable=True)
    file_billed_weight = Column(Float, nullable=True)
    file_warehouse = Column(String(50), nullable=True)
    file_zip_code = Column(String(20), nullable=True)
    file_zone = Column(String(10), nullable=True)
    file_ship_date = Column(String(20), nullable=True)
    file_store = Column(String(100), nullable=True)
    file_order_type = Column(String(50), nullable=True)

    # 系统计算的数据
    sys_total_amount = Column(Float, nullable=True)
    sys_base_amount = Column(Float, nullable=True)
    sys_weight_lb = Column(Float, nullable=True)
    sys_dim_weight_lb = Column(Float, nullable=True)
    sys_billed_weight = Column(Float, nullable=True)
    sys_zone = Column(Integer, nullable=True)

    # 差异分析
    has_diff = Column(Boolean, default=False, index=True)  # 添加索引：常用于筛选差异/一致记录
    diff_types = Column(String(500), nullable=True)  # JSON array of diff types
    diff_amount = Column(Float, nullable=True)
    diff_details = Column(Text, nullable=True)  # JSON object with detailed diffs

    batch = relationship("ReconciliationBatch", back_populates="details")


class ReconciliationDiffType:
    """差异类型常量"""
    AMOUNT_MISMATCH = "amount_mismatch"
    BASE_AMOUNT_MISMATCH = "base_amount_mismatch"
    WEIGHT_MISMATCH = "weight_mismatch"
    DIM_WEIGHT_MISMATCH = "dim_weight_mismatch"
    BILLED_WEIGHT_MISMATCH = "billed_weight_mismatch"
    ZONE_MISMATCH = "zone_mismatch"
    SKU_MISMATCH = "sku_mismatch"
    CARRIER_MISMATCH = "carrier_mismatch"
    SERVICE_MISMATCH = "service_mismatch"
    MISSING_IN_SYSTEM = "missing_in_system"
    MISSING_IN_FILE = "missing_in_file"
    SURCHARGE_MISMATCH = "surcharge_mismatch"


# ========== 配置管理模块模型 ==========

class ConfigItem(Base):
    """系统配置项"""
    __tablename__ = "config_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    config_key = Column(String(100), unique=True, nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)  # carrier, surcharge, system, zone
    sub_category = Column(String(50), nullable=True)
    display_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    current_value = Column(Text, nullable=False)
    default_value = Column(Text, nullable=True)
    suggested_value = Column(Text, nullable=True)
    value_type = Column(String(20), nullable=False, default="string")  # string, float, int, boolean, json
    unit = Column(String(20), nullable=True)  # %, $, lbs, kg, etc.
    is_editable = Column(Boolean, default=True)
    is_sensitive = Column(Boolean, default=False)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    related_entity_type = Column(String(50), nullable=True)  # Carrier, SurchargeConfig, etc.
    related_entity_id = Column(Integer, nullable=True)
    related_field = Column(String(50), nullable=True)  # 对应数据库字段名
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    # 关系
    histories = relationship("ConfigHistory", back_populates="config_item", order_by="desc(ConfigHistory.created_at)")


class ConfigHistory(Base):
    """配置变更历史"""
    __tablename__ = "config_histories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    config_id = Column(Integer, ForeignKey("config_items.id"), nullable=False, index=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=False)
    change_reason = Column(Text, nullable=True)
    changed_by = Column(String(100), nullable=False, default="system")
    change_type = Column(String(20), nullable=False, default="manual")  # manual, auto, rollback
    created_at = Column(DateTime, nullable=False)

    config_item = relationship("ConfigItem", back_populates="histories")


class ConfigAuditLog(Base):
    """配置操作审计日志"""
    __tablename__ = "config_audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(50), nullable=False)  # view, edit, create, delete, export
    config_key = Column(String(100), nullable=False, index=True)
    config_id = Column(Integer, ForeignKey("config_items.id"), nullable=True)
    details = Column(Text, nullable=True)  # JSON
    user_id = Column(String(100), nullable=False, default="anonymous")
    user_name = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False)


class ConfigCategory:
    """配置分类常量"""
    CARRIER = "carrier"
    SURCHARGE = "surcharge"
    SYSTEM = "system"
    ZONE = "zone"
    RATE = "rate"
    PRODUCT = "product"


class ConfigValueType:
    """配置值类型常量"""
    STRING = "string"
    FLOAT = "float"
    INT = "int"
    BOOLEAN = "boolean"
    JSON = "json"


# ========== 用户认证与权限模型 ==========

class UserRole:
    """用户角色常量"""
    OPERATOR = "operator"      # 运营
    FINANCE = "finance"        # 财务
    ADMIN = "admin"            # 管理员


class UserStatus:
    """用户状态常量"""
    PENDING = "pending"        # 待审核
    ACTIVE = "active"          # 已激活
    DISABLED = "disabled"      # 已禁用


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100), nullable=True)
    role = Column(String(20), nullable=False, default=UserRole.OPERATOR)
    status = Column(String(20), nullable=False, default=UserStatus.PENDING)
    phone = Column(String(20), nullable=True)
    department = Column(String(50), nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    login_fail_count = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)


class LoginAttempt(Base):
    """登录尝试记录"""
    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, index=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    success = Column(Boolean, default=False)
    fail_reason = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False)


class PasswordResetToken(Base):
    """密码重置令牌"""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, nullable=False)


class UserActionLog(Base):
    """用户操作日志"""
    __tablename__ = "user_action_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(50), nullable=False)  # enable, disable, approve, create, edit, reset_password
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    target_username = Column(String(50), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    operator_username = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, nullable=False)


# 权限常量定义（所有系统权限的完整列表）
class Permission:
    """系统权限常量"""
    # 物流比价权限
    SHIPPING_COMPARE = "shipping.compare"
    # 产品查询权限
    PRODUCT_VIEW = "product.view"
    PRODUCT_CREATE = "product.create"
    # 对账相关权限
    RECONCILIATION_VIEW = "reconciliation.view"
    RECONCILIATION_UPLOAD = "reconciliation.upload"
    RECONCILIATION_EXPORT = "reconciliation.export"
    # 配置管理权限
    CONFIG_MANAGE = "config.manage"
    # 用户管理权限
    USER_MANAGE = "user.manage"
    USER_CREATE = "user.create"
    USER_EDIT = "user.edit"
    USER_DELETE = "user.delete"
    USER_APPROVE = "user.approve"
    # 角色管理权限（仅管理员）
    ROLE_MANAGE = "role.manage"
    ROLE_ASSIGN = "role.assign"
    # 个人信息管理
    PROFILE_MANAGE = "profile.manage"

    # 所有权限列表
    ALL_PERMISSIONS = [
        SHIPPING_COMPARE,
        PRODUCT_VIEW,
        PRODUCT_CREATE,
        RECONCILIATION_VIEW,
        RECONCILIATION_UPLOAD,
        RECONCILIATION_EXPORT,
        CONFIG_MANAGE,
        USER_MANAGE,
        USER_CREATE,
        USER_EDIT,
        USER_DELETE,
        USER_APPROVE,
        ROLE_MANAGE,
        ROLE_ASSIGN,
        PROFILE_MANAGE,
    ]


# 角色权限映射
# 部门与角色对应关系
DEPARTMENT_ROLE_MAP: dict[str, list[str]] = {
    "运营部": [UserRole.OPERATOR],
    "财务部": [UserRole.FINANCE],
    "技术部": [UserRole.ADMIN, UserRole.OPERATOR, UserRole.FINANCE],
    "管理部": [UserRole.ADMIN, UserRole.OPERATOR, UserRole.FINANCE],
}

# 角色权限配置（RBAC核心定义）
ROLE_PERMISSIONS = {
    UserRole.OPERATOR: [
        Permission.SHIPPING_COMPARE,   # 物流比价
        Permission.PRODUCT_VIEW,       # 产品查询
        Permission.PRODUCT_CREATE,     # 产品添加
        Permission.PROFILE_MANAGE,     # 个人信息管理
    ],
    UserRole.FINANCE: [
        Permission.SHIPPING_COMPARE,   # 物流比价
        Permission.PRODUCT_VIEW,       # 产品查询
        Permission.PRODUCT_CREATE,     # 产品添加
        Permission.RECONCILIATION_VIEW,   # 订单对账查看
        Permission.RECONCILIATION_UPLOAD, # 上传对账文件
        Permission.RECONCILIATION_EXPORT, # 导出对账结果
        Permission.PROFILE_MANAGE,     # 个人信息管理
    ],
    UserRole.ADMIN: [
        # 包含运营所有权限
        Permission.SHIPPING_COMPARE,
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_CREATE,
        # 包含财务所有权限
        Permission.RECONCILIATION_VIEW,
        Permission.RECONCILIATION_UPLOAD,
        Permission.RECONCILIATION_EXPORT,
        # 管理员专属权限
        Permission.CONFIG_MANAGE,      # 配置管理
        Permission.USER_MANAGE,        # 用户管理
        Permission.USER_CREATE,        # 创建用户
        Permission.USER_EDIT,          # 编辑用户
        Permission.USER_DELETE,        # 删除/禁用用户
        Permission.USER_APPROVE,       # 审核用户
        Permission.ROLE_MANAGE,        # 角色管理（创建/修改角色）
        Permission.ROLE_ASSIGN,        # 角色分配
        Permission.PROFILE_MANAGE,     # 个人信息管理
    ],
}

# 角色权限矩阵（用于文档和前端展示）
ROLE_PERMISSION_MATRIX = {
    "角色": ["运营", "财务", "管理员"],
    "角色标识": [UserRole.OPERATOR, UserRole.FINANCE, UserRole.ADMIN],
    "物流比价": [True, True, True],
    "产品查询": [True, True, True],
    "对账查看": [False, True, True],
    "对账上传": [False, True, True],
    "对账导出": [False, True, True],
    "配置管理": [False, False, True],
    "用户管理": [False, False, True],
    "创建用户": [False, False, True],
    "编辑用户": [False, False, True],
    "禁用用户": [False, False, True],
    "审核用户": [False, False, True],
    "角色管理": [False, False, True],
    "角色分配": [False, False, True],
    "个人信息管理": [True, True, True],
}

# 角色中文名称映射
ROLE_DISPLAY_NAMES = {
    UserRole.OPERATOR: "运营",
    UserRole.FINANCE: "财务",
    UserRole.ADMIN: "管理员",
}

# 权限中文名称映射
PERMISSION_DISPLAY_NAMES = {
    Permission.SHIPPING_COMPARE: "物流比价",
    Permission.PRODUCT_VIEW: "产品查询",
    Permission.RECONCILIATION_VIEW: "对账查看",
    Permission.RECONCILIATION_UPLOAD: "对账上传",
    Permission.RECONCILIATION_EXPORT: "对账导出",
    Permission.CONFIG_MANAGE: "配置管理",
    Permission.USER_MANAGE: "用户管理",
    Permission.USER_CREATE: "创建用户",
    Permission.USER_EDIT: "编辑用户",
    Permission.USER_DELETE: "禁用用户",
    Permission.USER_APPROVE: "审核用户",
    Permission.ROLE_MANAGE: "角色管理",
    Permission.ROLE_ASSIGN: "角色分配",
    Permission.PROFILE_MANAGE: "个人信息管理",
    Permission.PRODUCT_CREATE: "产品添加",
}
