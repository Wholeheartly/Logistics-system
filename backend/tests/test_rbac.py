"""
RBAC 权限控制系统单元测试

测试范围：
1. 角色权限矩阵验证
2. 权限检查函数
3. 角色分配功能
4. 权限拦截逻辑
5. 运营角色对账操作拦截
"""
import pytest
from datetime import datetime, timedelta

from app.models.models import (
    UserRole, UserStatus,
    ROLE_PERMISSIONS, Permission,
    ROLE_DISPLAY_NAMES, PERMISSION_DISPLAY_NAMES,
    ROLE_PERMISSION_MATRIX
)
from app.services.auth_service import (
    has_permission, check_permission,
    create_access_token, decode_token,
    hash_password, create_user
)


# ========== 角色与权限常量测试 ==========

class TestRoleConstants:
    def test_user_role_values(self):
        assert UserRole.OPERATOR == "operator"
        assert UserRole.FINANCE == "finance"
        assert UserRole.ADMIN == "admin"

    def test_user_status_values(self):
        assert UserStatus.PENDING == "pending"
        assert UserStatus.ACTIVE == "active"
        assert UserStatus.DISABLED == "disabled"

    def test_permission_constants(self):
        assert Permission.SHIPPING_COMPARE == "shipping.compare"
        assert Permission.PRODUCT_VIEW == "product.view"
        assert Permission.RECONCILIATION_VIEW == "reconciliation.view"
        assert Permission.RECONCILIATION_UPLOAD == "reconciliation.upload"
        assert Permission.RECONCILIATION_EXPORT == "reconciliation.export"
        assert Permission.CONFIG_MANAGE == "config.manage"
        assert Permission.USER_MANAGE == "user.manage"
        assert Permission.ROLE_MANAGE == "role.manage"
        assert Permission.ROLE_ASSIGN == "role.assign"

    def test_all_permissions_unique(self):
        assert len(Permission.ALL_PERMISSIONS) == len(set(Permission.ALL_PERMISSIONS))

    def test_role_display_names(self):
        assert ROLE_DISPLAY_NAMES[UserRole.OPERATOR] == "运营"
        assert ROLE_DISPLAY_NAMES[UserRole.FINANCE] == "财务"
        assert ROLE_DISPLAY_NAMES[UserRole.ADMIN] == "管理员"

    def test_permission_display_names(self):
        assert PERMISSION_DISPLAY_NAMES[Permission.SHIPPING_COMPARE] == "物流比价"
        assert PERMISSION_DISPLAY_NAMES[Permission.RECONCILIATION_VIEW] == "对账查看"
        assert PERMISSION_DISPLAY_NAMES[Permission.ROLE_MANAGE] == "角色管理"


# ========== 角色权限矩阵测试 ==========

class TestRolePermissionMatrix:
    def test_operator_permissions(self):
        perms = ROLE_PERMISSIONS[UserRole.OPERATOR]
        assert Permission.SHIPPING_COMPARE in perms
        assert Permission.PRODUCT_VIEW in perms
        assert Permission.PROFILE_MANAGE in perms
        assert Permission.RECONCILIATION_VIEW not in perms
        assert Permission.RECONCILIATION_UPLOAD not in perms
        assert Permission.RECONCILIATION_EXPORT not in perms
        assert Permission.CONFIG_MANAGE not in perms
        assert Permission.USER_MANAGE not in perms
        assert Permission.ROLE_MANAGE not in perms
        assert Permission.ROLE_ASSIGN not in perms

    def test_finance_permissions(self):
        perms = ROLE_PERMISSIONS[UserRole.FINANCE]
        assert Permission.SHIPPING_COMPARE in perms
        assert Permission.PRODUCT_VIEW in perms
        assert Permission.RECONCILIATION_VIEW in perms
        assert Permission.RECONCILIATION_UPLOAD in perms
        assert Permission.RECONCILIATION_EXPORT in perms
        assert Permission.PROFILE_MANAGE in perms
        assert Permission.CONFIG_MANAGE not in perms
        assert Permission.USER_MANAGE not in perms
        assert Permission.ROLE_MANAGE not in perms
        assert Permission.ROLE_ASSIGN not in perms

    def test_admin_permissions(self):
        perms = ROLE_PERMISSIONS[UserRole.ADMIN]
        # 包含运营所有权限
        assert Permission.SHIPPING_COMPARE in perms
        assert Permission.PRODUCT_VIEW in perms
        # 包含财务所有权限
        assert Permission.RECONCILIATION_VIEW in perms
        assert Permission.RECONCILIATION_UPLOAD in perms
        assert Permission.RECONCILIATION_EXPORT in perms
        # 管理员专属权限
        assert Permission.CONFIG_MANAGE in perms
        assert Permission.USER_MANAGE in perms
        assert Permission.USER_CREATE in perms
        assert Permission.USER_EDIT in perms
        assert Permission.USER_DELETE in perms
        assert Permission.USER_APPROVE in perms
        assert Permission.ROLE_MANAGE in perms
        assert Permission.ROLE_ASSIGN in perms
        assert Permission.PROFILE_MANAGE in perms

    def test_admin_has_all_permissions(self):
        admin_perms = set(ROLE_PERMISSIONS[UserRole.ADMIN])
        for perm in Permission.ALL_PERMISSIONS:
            assert perm in admin_perms, f"管理员缺少权限: {perm}"

    def test_matrix_structure(self):
        assert "角色" in ROLE_PERMISSION_MATRIX
        assert "角色标识" in ROLE_PERMISSION_MATRIX
        assert len(ROLE_PERMISSION_MATRIX["角色"]) == 3
        assert ROLE_PERMISSION_MATRIX["角色"] == ["运营", "财务", "管理员"]


# ========== has_permission 函数测试 ==========

class TestHasPermission:
    def test_operator_can_compare_shipping(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.SHIPPING_COMPARE) is True

    def test_operator_cannot_view_reconciliation(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.RECONCILIATION_VIEW) is False

    def test_operator_cannot_upload_reconciliation(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.RECONCILIATION_UPLOAD) is False

    def test_operator_cannot_export_reconciliation(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.RECONCILIATION_EXPORT) is False

    def test_operator_cannot_manage_config(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.CONFIG_MANAGE) is False

    def test_operator_cannot_manage_users(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.USER_MANAGE) is False

    def test_operator_cannot_manage_roles(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.ROLE_MANAGE) is False

    def test_operator_cannot_assign_roles(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.ROLE_ASSIGN) is False

    def test_finance_can_view_reconciliation(self):
        user = type("User", (), {"role": UserRole.FINANCE, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.RECONCILIATION_VIEW) is True

    def test_finance_can_upload_reconciliation(self):
        user = type("User", (), {"role": UserRole.FINANCE, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.RECONCILIATION_UPLOAD) is True

    def test_finance_can_export_reconciliation(self):
        user = type("User", (), {"role": UserRole.FINANCE, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.RECONCILIATION_EXPORT) is True

    def test_finance_cannot_manage_config(self):
        user = type("User", (), {"role": UserRole.FINANCE, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.CONFIG_MANAGE) is False

    def test_finance_cannot_manage_users(self):
        user = type("User", (), {"role": UserRole.FINANCE, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.USER_MANAGE) is False

    def test_finance_cannot_manage_roles(self):
        user = type("User", (), {"role": UserRole.FINANCE, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.ROLE_MANAGE) is False

    def test_admin_has_all_permissions(self):
        user = type("User", (), {"role": UserRole.ADMIN, "status": UserStatus.ACTIVE})()
        for perm in Permission.ALL_PERMISSIONS:
            assert has_permission(user, perm) is True, f"管理员应拥有权限: {perm}"

    def test_inactive_user_has_no_permissions(self):
        user = type("User", (), {"role": UserRole.ADMIN, "status": UserStatus.DISABLED})()
        assert has_permission(user, Permission.SHIPPING_COMPARE) is False
        assert has_permission(user, Permission.USER_MANAGE) is False

    def test_pending_user_has_no_permissions(self):
        user = type("User", (), {"role": UserRole.ADMIN, "status": UserStatus.PENDING})()
        assert has_permission(user, Permission.SHIPPING_COMPARE) is False

    def test_none_user_has_no_permissions(self):
        assert has_permission(None, Permission.SHIPPING_COMPARE) is False


# ========== 运营角色对账拦截测试 ==========

class TestOperatorReconciliationBlock:
    """
    运营角色对账操作拦截测试
    确保运营角色无法执行任何对账相关操作
    """

    def test_operator_blocked_from_reconciliation_view(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.RECONCILIATION_VIEW) is False

    def test_operator_blocked_from_reconciliation_upload(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.RECONCILIATION_UPLOAD) is False

    def test_operator_blocked_from_reconciliation_export(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.RECONCILIATION_EXPORT) is False

    def test_operator_allowed_shipping_compare(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.SHIPPING_COMPARE) is True

    def test_operator_allowed_product_view(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        assert has_permission(user, Permission.PRODUCT_VIEW) is True


# ========== 职责分离测试 ==========

class TestSegregationOfDuties:
    """
    职责分离测试
    确保运营和财务的权限边界清晰
    """

    def test_operator_vs_finance_reconciliation(self):
        op = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        fin = type("User", (), {"role": UserRole.FINANCE, "status": UserStatus.ACTIVE})()

        # 运营不能对账，财务可以
        assert has_permission(op, Permission.RECONCILIATION_VIEW) is False
        assert has_permission(fin, Permission.RECONCILIATION_VIEW) is True

        assert has_permission(op, Permission.RECONCILIATION_UPLOAD) is False
        assert has_permission(fin, Permission.RECONCILIATION_UPLOAD) is True

    def test_only_admin_can_manage_users(self):
        op = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        fin = type("User", (), {"role": UserRole.FINANCE, "status": UserStatus.ACTIVE})()
        adm = type("User", (), {"role": UserRole.ADMIN, "status": UserStatus.ACTIVE})()

        assert has_permission(op, Permission.USER_MANAGE) is False
        assert has_permission(fin, Permission.USER_MANAGE) is False
        assert has_permission(adm, Permission.USER_MANAGE) is True

    def test_only_admin_can_manage_roles(self):
        op = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        fin = type("User", (), {"role": UserRole.FINANCE, "status": UserStatus.ACTIVE})()
        adm = type("User", (), {"role": UserRole.ADMIN, "status": UserStatus.ACTIVE})()

        assert has_permission(op, Permission.ROLE_MANAGE) is False
        assert has_permission(fin, Permission.ROLE_MANAGE) is False
        assert has_permission(adm, Permission.ROLE_MANAGE) is True

    def test_only_admin_can_assign_roles(self):
        op = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()
        fin = type("User", (), {"role": UserRole.FINANCE, "status": UserStatus.ACTIVE})()
        adm = type("User", (), {"role": UserRole.ADMIN, "status": UserStatus.ACTIVE})()

        assert has_permission(op, Permission.ROLE_ASSIGN) is False
        assert has_permission(fin, Permission.ROLE_ASSIGN) is False
        assert has_permission(adm, Permission.ROLE_ASSIGN) is True


# ========== Token 测试 ==========

class TestToken:
    def test_create_and_decode_token(self):
        user = type("User", (), {
            "id": 1,
            "username": "test",
            "role": UserRole.OPERATOR,
        })()
        token = create_access_token(user)
        assert token is not None
        assert "." in token

        decoded = decode_token(token)
        assert decoded is not None
        assert decoded["sub"] == 1
        assert decoded["username"] == "test"
        assert decoded["role"] == UserRole.OPERATOR

    def test_decode_expired_token(self):
        import base64
        import json

        header = base64.urlsafe_b64encode(json.dumps({"alg": "none", "typ": "JWT"}).encode()).decode().rstrip("=")
        payload = base64.urlsafe_b64encode(json.dumps({
            "sub": 1,
            "username": "test",
            "role": UserRole.OPERATOR,
            "iat": (datetime.now() - timedelta(days=2)).isoformat(),
            "exp": (datetime.now() - timedelta(days=1)).isoformat(),
        }).encode()).decode().rstrip("=")
        expired_token = f"{header}.{payload}."

        decoded = decode_token(expired_token)
        assert decoded is None

    def test_decode_invalid_token(self):
        assert decode_token("invalid-token") is None
        assert decode_token("") is None


# ========== 权限变更实时生效测试 ==========

class TestPermissionRealtime:
    """
    权限变更实时生效测试
    由于权限基于角色，角色变更后权限立即生效
    """

    def test_role_change_immediate_effect(self):
        user = type("User", (), {"role": UserRole.OPERATOR, "status": UserStatus.ACTIVE})()

        # 初始状态：运营没有对账权限
        assert has_permission(user, Permission.RECONCILIATION_VIEW) is False

        # 角色变更为财务
        user.role = UserRole.FINANCE
        assert has_permission(user, Permission.RECONCILIATION_VIEW) is True

        # 角色变更为管理员
        user.role = UserRole.ADMIN
        assert has_permission(user, Permission.USER_MANAGE) is True
        assert has_permission(user, Permission.ROLE_MANAGE) is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
