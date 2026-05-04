#!/bin/bash
set -e

echo "============================================"
echo "  物流比价系统 - 服务器部署脚本"
echo "============================================"

SERVER_IP=${1:-""}
if [ -z "$SERVER_IP" ]; then
    echo "Usage: ./deploy.sh <SERVER_IP>"
    echo "Example: ./deploy.sh 47.100.xx.xx"
    exit 1
fi

SSH_USER=${SSH_USER:-root}
SSH_KEY=${SSH_KEY:-""}
PROJECT_DIR="/opt/logistics-system"

echo "[1/6] 安装Docker和Docker Compose..."
ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SERVER_IP} << 'REMOTE'
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully"
else
    echo "Docker already installed: $(docker --version)"
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "Docker Compose installed successfully"
else
    echo "Docker Compose already installed"
fi
REMOTE

echo "[2/6] 创建项目目录..."
ssh ${SSH_USER}@${SERVER_IP} "mkdir -p ${PROJECT_DIR}/deploy/nginx ${PROJECT_DIR}/deploy/logs/backend ${PROJECT_DIR}/deploy/logs/nginx ${PROJECT_DIR}/deploy/backup"

echo "[3/6] 上传项目文件..."
scp -r ../backend ${SSH_USER}@${SERVER_IP}:${PROJECT_DIR}/
scp -r ../frontend ${SSH_USER}@${SERVER_IP}:${PROJECT_DIR}/
scp ../docker-compose.yml ${SSH_USER}@${SERVER_IP}:${PROJECT_DIR}/
scp .env.production ${SSH_USER}@${SERVER_IP}:${PROJECT_DIR}/.env
scp nginx/default.conf ${SSH_USER}@${SERVER_IP}:${PROJECT_DIR}/deploy/nginx/
scp nginx/ssl.conf ${SSH_USER}@${SERVER_IP}:${PROJECT_DIR}/deploy/nginx/

echo "[4/6] 配置防火墙规则..."
ssh ${SSH_USER}@${SERVER_IP} << 'REMOTE'
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 22/tcp
    echo "UFW rules added"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=80/tcp
    firewall-cmd --permanent --add-port=443/tcp
    firewall-cmd --permanent --add-port=22/tcp
    firewall-cmd --reload
    echo "Firewalld rules added"
else
    echo "No firewall detected, please manually open ports 80, 443, 22"
fi
REMOTE

echo "[5/6] 启动Docker Compose..."
ssh ${SSH_USER}@${SERVER_IP} "cd ${PROJECT_DIR} && docker compose --env-file .env up -d --build"

echo "[6/6] 验证服务状态..."
sleep 10
ssh ${SSH_USER}@${SERVER_IP} "cd ${PROJECT_DIR} && docker compose ps"

echo ""
echo "============================================"
echo "  部署完成！"
echo "============================================"
echo ""
echo "  后端API: http://${SERVER_IP}/api/health"
echo "  前端页面: http://${SERVER_IP}/"
echo ""
echo "  下一步：在EdgeOne中配置源站"
echo "  源站地址: ${SERVER_IP}"
echo "  源站端口: 80"
echo "  协议: HTTP"
echo ""
echo "  运行以下命令配置EdgeOne源站："
echo "  python deploy/edgeone_deploy.py set_origin ${SERVER_IP}"
echo "============================================"
