# 权限控制系统使用说明

## 一、系统概述

本系统基于 RBAC（Role-Based Access Control，基于角色的访问控制）模型实现权限管理，明确划分三个标准角色：运营、财务、管理员。权限控制在前端界面和后端 API 层面同时生效，形成双重保障。

## 二、角色体系

### 2.1 标准角色定义

| 角色标识 | 角色名称 | 职责描述 |
|---------|---------|---------|
| `operator` | 运营 | 负责物流比价、产品查询等日常运营操作 |
| `finance` | 财务 | 负责对账、账单查看等财务相关操作 |
| `admin` | 管理员 | 拥有系统全部操作权限，负责用户和角色管理 |

### 2.2 角色权限矩阵

| 权限 / 角色 | 运营 | 财务 | 管理员 |
|------------|:--:|:--:|:--:|
| 物流比价 | ✓ | ✓ | ✓ |
| 产品查询 | ✓ | ✓ | ✓ |
| 对账查看 | — | ✓ | ✓ |
| 对账上传 | — | ✓ | ✓ |
| 对账导出 | — | ✓ | ✓ |
| 配置管理 | — | — | ✓ |
| 用户管理 | — | — | ✓ |
| 创建用户 | — | — | ✓ |
| 编辑用户 | — | — | ✓ |
| 禁用用户 | — | — | ✓ |
| 审核用户 | — | — | ✓ |
| 角色管理 | — | — | ✓ |
| 角色分配 | — | — | ✓ |
| 个人信息管理 | ✓ | ✓ | ✓ |

## 三、权限控制细则

### 3.1 运营角色权限边界

- **允许操作**：
  - 物流比价（`shipping.compare`）
  - 产品查询（`product.view`）
  - 个人信息管理（`profile.manage`）

- **明确禁止**：
  - 对账查看（`reconciliation.view`）
  - 对账上传（`reconciliation.upload`）
  - 对账导出（`reconciliation.export`）
  - 配置管理（`config.manage`）
  - 用户管理（`user.manage`）
  - 角色管理（`role.manage`）

### 3.2 财务角色权限边界

- **允许操作**：
  - 物流比价（`shipping.compare`）
  - 产品查询（`product.view`）
  - 对账查看、上传、导出（`reconciliation.*`）
  - 个人信息管理（`profile.manage`）

- **明确禁止**：
  - 配置管理（`config.manage`）
  - 用户管理（`user.manage`）
  - 角色管理（`role.manage`）

### 3.3 管理员角色权限

- 拥有系统全部操作权限
- 唯一拥有角色创建、修改和分配权限的角色
- 可执行用户审核、禁用、密码重置等操作

## 四、权限验证与提示

### 4.1 后端拦截

当无权限用户尝试访问受保护资源时，后端返回 HTTP 403 状态码：

```json
{
  "detail": "您的权限不足，无法执行此操作"
}
```

### 4.2 前端控制

- 无权限的菜单项和按钮不会显示
- 权限变更后前端自动刷新用户状态
- 对账视图在权限被撤销时自动切换回比价视图

## 五、角色管理功能

### 5.1 功能入口

仅管理员可在「用户管理」模块中：

1. 查看角色权限矩阵
2. 为其他用户分配角色（不能修改自己的角色）
3. 创建新用户并指定角色

### 5.2 角色分配 API

```
POST /api/users/{user_id}/role?token={token}
Content-Type: application/json

{
  "role": "finance"
}
```

### 5.3 权限检查 API

```
POST /api/roles/check?token={token}
Content-Type: application/json

{
  "permission": "reconciliation.view"
}
```

响应：
```json
{
  "permission": "reconciliation.view",
  "granted": false,
  "role": "operator"
}
```

## 六、权限变更实时生效

权限基于角色绑定，角色变更后：

1. 后端权限检查立即生效（无需重新登录）
2. 前端通过 `refreshUser()` 自动同步最新权限
3. 若用户失去当前视图权限，自动跳转至有权限的默认视图

## 七、测试报告

运行权限测试：

```bash
cd backend
.\venv\Scripts\python -m pytest tests/test_rbac.py -v
```

测试结果：42 个测试用例全部通过，覆盖：

- 角色权限矩阵验证
- 各角色权限边界检查
- 运营角色对账操作拦截
- 职责分离验证
- Token 生成与验证
- 权限变更实时生效
