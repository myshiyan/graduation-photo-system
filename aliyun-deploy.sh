#!/bin/bash
# ============================================
# 毕业合影姓名校对管理系统 - 阿里云一键部署脚本
# 适用系统：Ubuntu 22.04 LTS / 20.04 LTS
# 执行方式：
#   1) 先把本项目文件夹上传到服务器任意目录
#   2) cd 到项目目录
#   3) chmod +x aliyun-deploy.sh
#   4) sudo bash aliyun-deploy.sh
# ============================================

set -e

# ---------- 颜色输出 ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  毕业合影姓名校对管理系统 - 阿里云一键部署    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}开始时间${NC}: $(date)"
echo ""

# ---------- 检查是否为 root ----------
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}❌ 请以 root 身份执行此脚本${NC}"
    echo "   方式：sudo bash $0"
    exit 1
fi

# ---------- 检测项目目录 ----------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$SCRIPT_DIR/package.json" ] || [ ! -f "$SCRIPT_DIR/server.js" ]; then
    echo -e "${RED}❌ 未在脚本目录检测到 package.json 和 server.js${NC}"
    echo "   请确保脚本放在项目根目录中"
    echo "   当前目录：$SCRIPT_DIR"
    echo ""
    echo "   目录文件列表："
    ls -la "$SCRIPT_DIR" | head -20
    exit 1
fi

APP_DIR="/opt/graduation-photo"
echo -e "${GREEN}✓ 项目目录${NC}: $SCRIPT_DIR"
echo -e "${GREEN}✓ 部署目录${NC}: $APP_DIR"
echo ""

# ============================================
# 步骤 1：更新系统
# ============================================
echo -e "${YELLOW}[步骤 1/6]${NC} 更新系统软件包..."
export DEBIAN_FRONTEND=noninteractive
apt update -qq 2>&1 | tail -3
apt upgrade -y -qq 2>&1 | tail -3
echo -e "${GREEN}  ✓ 系统更新完成${NC}"
echo ""

# ============================================
# 步骤 2：安装 Node.js 和编译工具
# ============================================
echo -e "${YELLOW}[步骤 2/6]${NC} 安装 Node.js 18.x 和编译工具..."

apt install -y -qq curl build-essential python3 2>&1 | tail -3

# 安装 Node.js（使用国内镜像加速）
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
    echo "  正在添加 Node.js 官方源..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt install -y -qq nodejs 2>&1 | tail -3
fi

echo "  Node.js 版本: $(node --version)"
echo "  npm 版本: $(npm --version)"

# 配置 npm 使用国内镜像（加速安装）
npm config set registry https://registry.npmmirror.com

echo -e "${GREEN}  ✓ Node.js 和编译工具安装完成${NC}"
echo ""

# ============================================
# 步骤 3：安装 PM2（进程管理器）
# ============================================
echo -e "${YELLOW}[步骤 3/6]${NC} 安装 PM2 进程管理器..."

npm install -g pm2 -s 2>&1 | tail -3
echo "  PM2 版本: $(pm2 --version 2>&1 | head -1)"

echo -e "${GREEN}  ✓ PM2 安装完成${NC}"
echo ""

# ============================================
# 步骤 4：部署应用代码
# ============================================
echo -e "${YELLOW}[步骤 4/6]${NC} 部署应用代码..."

# 停止之前可能存在的旧进程
pm2 delete graduation-photo 2>/dev/null || true

# 创建应用目录
mkdir -p $APP_DIR

# 复制文件（排除 node_modules，在服务器重新安装）
echo "  复制项目文件到 $APP_DIR ..."
cd "$SCRIPT_DIR"
# 排除 node_modules 和 .git 等，复制其他文件
find . -maxdepth 1 ! -path . -type d \( ! -name 'node_modules' ! -name '.git' ! -name '.github' \) -exec cp -r {} $APP_DIR/ \; 2>/dev/null || true
cp -f package.json package-lock.json server.js database.js *.html $APP_DIR/ 2>/dev/null || true
# 复制 views 和 public 目录（如果存在）
[ -d "$SCRIPT_DIR/views" ] && cp -r "$SCRIPT_DIR/views" $APP_DIR/
[ -d "$SCRIPT_DIR/public" ] && cp -r "$SCRIPT_DIR/public" $APP_DIR/

cd $APP_DIR

# 安装 Node.js 依赖
echo "  安装依赖包（第一次需要 2-5 分钟，请耐心等待）..."
npm install --omit=dev --no-audit --no-fund --loglevel=error 2>&1 | tail -5

# 确保上传目录和数据目录存在
mkdir -p $APP_DIR/public/uploads
mkdir -p $APP_DIR/data

echo -e "${GREEN}  ✓ 应用代码部署完成${NC}"
echo ""

# ============================================
# 步骤 5：配置防火墙
# ============================================
echo -e "${YELLOW}[步骤 5/6]${NC} 配置防火墙..."

if command -v ufw &> /dev/null; then
    ufw allow 22/tcp > /dev/null 2>&1
    ufw allow 3000/tcp > /dev/null 2>&1
    ufw allow 80/tcp > /dev/null 2>&1
    ufw allow 443/tcp > /dev/null 2>&1
    echo -e "${GREEN}  ✓ 本地 ufw 防火墙已开放 22/3000/80/443 端口${NC}"
else
    echo "  提示：未检测到 ufw（轻量应用服务器使用阿里云控制台防火墙）"
fi

echo ""
echo -e "${YELLOW}  ⚠  重要提醒${NC}：请在阿里云控制台检查并开放 3000 端口"
echo "     - 轻量应用服务器：控制台 → 防火墙 → 添加规则：TCP 3000"
echo "     - ECS：控制台 → 安全组 → 入方向 → 添加：TCP:3000"
echo ""

# ============================================
# 步骤 6：启动应用并配置开机自启
# ============================================
echo -e "${YELLOW}[步骤 6/6]${NC} 启动应用..."

cd $APP_DIR

# 启动应用
pm2 start server.js --name graduation-photo --time

# 保存进程列表（开机自启用）
pm2 save

# 配置 PM2 开机自启
pm2 startup systemd -u root --hp /root > /dev/null 2>&1

echo ""

# ============================================
# 完成输出
# ============================================

# 获取公网 IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "您的公网IP")

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    🎉 部署完成               ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}访问地址${NC}: http://$PUBLIC_IP:3000"
echo ""
echo -e "${GREEN}默认管理员账号${NC}: zgzhbt / 13872765710"
echo ""
echo -e "${CYAN}应用管理命令${NC}:"
echo "  查看所有进程: pm2 status"
echo "  查看实时日志: pm2 logs graduation-photo"
echo "  查看最近50行: pm2 logs graduation-photo --lines 50"
echo "  重启应用:     pm2 restart graduation-photo"
echo "  停止应用:     pm2 stop graduation-photo"
echo ""
echo -e "${CYAN}常用操作${NC}:"
echo "  修改代码后: 将新文件上传到 $APP_DIR/ 然后执行 pm2 restart graduation-photo"
echo "  查看数据库: ls -la $APP_DIR/graduation_photo.db"
echo "  备份数据:   cp $APP_DIR/graduation_photo.db $APP_DIR/backup_$(date +%Y%m%d).db"
echo ""
echo -e "${YELLOW}⚠  如浏览器无法访问${NC}：请确保在阿里云控制台开放了 3000 端口"
echo ""
echo "完成时间: $(date)"
echo ""

# 最后显示进程状态
echo "当前进程状态："
pm2 status 2>&1 | head -10
echo ""
