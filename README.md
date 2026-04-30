# 跨境电商订单核算与物流优化助手

面向跨境电商卖家的智能助手，基于预置的产品数据库、物流费率表和邮编分区表，提供订单批量核算与对账、多渠道路由比价与最便宜发货方案推荐。

## 功能特性

- **订单批量核算与对账**：一键批量核对订单应收与实收差异，快速定位异常订单
- **物流费用查询**：基于 SKU 和目的地邮编，自动计算五大物流渠道的预估总费用
- **最便宜方案推荐**：按总费用升序排列，推荐最经济的发货方案
- **产品管理**：产品数据库管理，支持批量上传

## 技术栈

### 后端
- **框架**：FastAPI
- **ORM**：SQLAlchemy
- **数据库**：SQLite
- **认证**：JWT Token

### 前端
- **框架**：React 19
- **语言**：TypeScript
- **构建工具**：Vite
- **测试**：Vitest

## 项目结构

```
logistics-system/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 业务逻辑
│   │   └── utils/          # 工具函数
│   ├── tests/              # 测试文件
│   ├── scripts/            # 脚本文件
│   └── requirements.txt    # Python 依赖
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # 公共组件
│   │   ├── modules/        # 功能模块
│   │   ├── context/        # 上下文
│   │   └── types/          # 类型定义
│   └── package.json        # Node 依赖
└── docs/                   # 文档
```

## 快速开始

### 环境要求

- Python 3.12+
- Node.js 20+
- npm 或 pnpm

### 后端启动

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
.\venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt

# 启动服务
python run.py
```

后端服务运行在 http://localhost:8000

### 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

前端服务运行在 http://localhost:5173

## API 文档

启动后端服务后，访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 测试

### 后端测试

```bash
cd backend
pytest
```

### 前端测试

```bash
cd frontend
npm run test
```

## 环境变量

复制 `.env.example` 为 `.env` 并配置：

```env
DATABASE_URL=sqlite:///./logistics.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:5173
```

## 许可证

[MIT License](LICENSE)

## 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request
