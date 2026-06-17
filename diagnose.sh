#!/bin/bash
# ============================================
# 部署诊断脚本 - 检查容器运行状态和常见问题
# 使用方法：bash diagnose.sh
# ============================================

echo "========================================"
echo "  部署诊断工具"
echo "========================================"
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 1. 检查容器状态
echo "1️⃣  容器状态检查"
echo "----------------------------------------"
if docker ps -a --format '{{.Names}}' | grep -q "^graduation-photo$"; then
    STATUS=$(docker inspect --format='{{.State.Status}}' graduation-photo 2>/dev/null)
    RESTARTS=$(docker inspect --format='{{.RestartCount}}' graduation-photo 2>/dev/null)
    PORTS=$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{$p}} -> {{(index $conf 0).HostIp}}:{{(index $conf 0).HostPort}} {{end}}' graduation-photo 2>/dev/null)
    echo "  容器名称: graduation-photo"
    echo "  当前状态: $STATUS"
    echo "  重启次数: $RESTARTS"
    echo "  端口映射: $PORTS"

    if [ "$STATUS" = "running" ]; then
        echo "  ✅ 容器运行正常"
    elif [ "$STATUS" = "restarting" ]; then
        echo "  ❌ 容器处于重启循环！请查看日志"
    else
        echo "  ⚠️  容器状态: $STATUS"
    fi
else
    echo "  ❌ 未找到 graduation-photo 容器"
fi
echo ""

# 2. 查看最近日志
echo "2️⃣  最近 30 行启动日志"
echo "----------------------------------------"
if docker ps -a --format '{{.Names}}' | grep -q "^graduation-photo$"; then
    docker logs graduation-photo 2>&1 | tail -30
    echo ""
    echo "  （完整日志命令: docker logs graduation-photo）"
else
    echo "  无日志（容器未创建）"
fi
echo ""

# 3. 检查关键文件是否在镜像中
echo "3️⃣  镜像内容检查"
echo "----------------------------------------"
if docker ps --format '{{.Names}}' | grep -q "^graduation-photo$"; then
    echo "  检查关键文件是否存在:"
    for f in server.js database.js node_modules/sqlite3/build/Release/node_sqlite3.node views/index.html; do
        if docker exec graduation-photo test -f "$f" 2>/dev/null; then
            echo "    ✅ $f"
        else
            echo "    ❌ $f - 缺失！"
        fi
    done
    echo ""
    echo "  数据库目录:"
    docker exec graduation-photo ls -la /app/data/ 2>/dev/null || echo "    空或不存在"
else
    echo "  容器未运行，无法检查"
fi
echo ""

# 4. 检查宿主机持久化目录
echo "4️⃣  宿主机数据目录检查"
echo "----------------------------------------"
echo "  项目目录: $PROJECT_DIR"
echo "  data 目录:"
if [ -d "$PROJECT_DIR/data" ]; then
    ls -lh "$PROJECT_DIR/data/"
else
    echo "    ❌ 目录不存在"
fi
echo ""
echo "  uploads 目录:"
if [ -d "$PROJECT_DIR/public/uploads" ]; then
    ls -lh "$PROJECT_DIR/public/uploads/"
else
    echo "    ❌ 目录不存在"
fi
echo ""

# 5. Docker 版本
echo "5️⃣  Docker 环境"
echo "----------------------------------------"
docker version --format '  客户端版本: {{.Client.Version}} ({{.Client.Os}}/{{.Client.Arch}})' 2>/dev/null
docker version --format '  服务端版本: {{.Server.Version}} ({{.Server.Os}}/{{.Server.Arch}})' 2>/dev/null
echo ""

echo "========================================"
echo "  诊断完成"
echo "========================================"
