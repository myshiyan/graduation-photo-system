#!/bin/bash
# ============================================
# 毕业合影姓名校对管理系统 - 极空间一键部署脚本
# 使用方法：在极空间 SSH 终端中执行：bash deploy.sh
# ============================================

set -e

# 获取脚本所在目录（项目根目录）
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================"
echo "  毕业合影姓名校对管理系统 - 部署工具"
echo "========================================"
echo ""
echo "📂 项目目录: $PROJECT_DIR"
echo ""

# --------------------------
# 步骤1：检查环境
# --------------------------
echo "🔍 步骤1：检查环境..."

if ! command -v docker &> /dev/null; then
    echo "❌ 未找到 docker 命令，请先在极空间安装 Docker"
    exit 1
fi
echo "  ✓ Docker 已安装"

# 检查 Dockerfile 是否存在
if [ ! -f "$PROJECT_DIR/Dockerfile" ]; then
    echo "❌ 未找到 Dockerfile，请确认项目文件完整"
    exit 1
fi
echo "  ✓ Dockerfile 已找到"

# 检查关键文件
for f in server.js database.js package.json views/index.html; do
    if [ ! -f "$PROJECT_DIR/$f" ]; then
        echo "❌ 未找到 $f"
        exit 1
    fi
done
echo "  ✓ 项目文件完整"

# --------------------------
# 步骤2：清理旧容器和镜像
# --------------------------
echo ""
echo "🧹 步骤2：清理旧容器和镜像..."

# 停止并删除旧容器
if docker ps -a --format '{{.Names}}' | grep -q "^graduation-photo$"; then
    echo "  停止旧容器..."
    docker stop graduation-photo 2>/dev/null || true
    echo "  删除旧容器..."
    docker rm graduation-photo 2>/dev/null || true
    echo "  ✓ 旧容器已删除"
else
    echo "  ✓ 没有旧容器需要清理"
fi

# 删除旧镜像（可选，先不自动删，用 build --no-cache 来强制重建）
# if docker images --format '{{.Repository}}' | grep -q "^graduation-photo$"; then
#     docker rmi graduation-photo:latest 2>/dev/null || true
#     echo "  ✓ 旧镜像已删除"
# fi

# --------------------------
# 步骤3：构建镜像
# --------------------------
echo ""
echo "🏗️  步骤3：构建 Docker 镜像（这可能需要几分钟）..."
echo "  （首次构建需要下载 node:18 基础镜像，请耐心等待）"
echo "  采用 Dockerfile.simple - 最稳健，极空间推荐使用"
echo ""

# 优先使用 Dockerfile.simple（单阶段 node:18，极空间最稳）
DOCKERFILE="$PROJECT_DIR/Dockerfile.simple"
if [ ! -f "$DOCKERFILE" ]; then
    DOCKERFILE="$PROJECT_DIR/Dockerfile"
fi

echo "  使用 Dockerfile: $DOCKERFILE"
echo ""

docker build --no-cache -f "$DOCKERFILE" -t graduation-photo:latest "$PROJECT_DIR"

if [ $? -eq 0 ]; then
    echo ""
    echo "  ✓ 镜像构建成功"
else
    echo ""
    echo "❌ 镜像构建失败，请检查上方错误信息"
    exit 1
fi

# --------------------------
# 步骤4：创建持久化目录
# --------------------------
echo ""
echo "💾 步骤4：准备持久化目录..."

mkdir -p "$PROJECT_DIR/data"
mkdir -p "$PROJECT_DIR/public/uploads"

# 设置权限（避免容器内权限问题）
chmod -R 755 "$PROJECT_DIR/data"
chmod -R 755 "$PROJECT_DIR/public/uploads"
echo "  ✓ 持久化目录已准备"

# --------------------------
# 步骤5：启动容器
# --------------------------
echo ""
echo "🚀 步骤5：启动容器..."

docker run -d \
    --name graduation-photo \
    --restart unless-stopped \
    -p 3000:3000 \
    -v "$PROJECT_DIR/data:/app/data" \
    -v "$PROJECT_DIR/public/uploads:/app/public/uploads" \
    -e NODE_ENV=production \
    -e DB_PATH=/app/data/graduation_photo.db \
    graduation-photo:latest

if [ $? -eq 0 ]; then
    echo "  ✓ 容器已启动"
else
    echo "❌ 容器启动失败"
    exit 1
fi

# --------------------------
# 步骤6：等待并验证
# --------------------------
echo ""
echo "⏳ 步骤6：等待应用启动（约5-10秒）..."
sleep 8

echo ""
echo "📋 容器状态："
docker ps --filter name=graduation-photo --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📋 启动日志："
docker logs graduation-photo 2>&1 | tail -20

echo ""
echo "========================================"
echo "🎉 部署完成！"
echo "========================================"
echo ""
echo "📡 访问地址: http://$(hostname -I 2>/dev/null || echo '极空间IP'):3000"
echo ""
echo "🔑 默认管理员账号：zgzhbt / 13872765710"
echo ""
echo "常用命令："
echo "  查看日志: docker logs graduation-photo"
echo "  进入容器: docker exec -it graduation-photo /bin/bash"
echo "  停止容器: docker stop graduation-photo"
echo "  重启容器: docker restart graduation-photo"
echo ""
