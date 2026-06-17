# ============================================
# 第一阶段：构建依赖（使用完整 Debian 镜像，含 gcc/python）
# 目的：确保 sqlite3 原生模块能成功编译
# ============================================
FROM node:18 AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装生产依赖（完整镜像有 gcc/make/python，sqlite3 能编译成功）
# --omit=dev 不装 devDependencies，减少体积
RUN npm install --omit=dev --no-audit --no-fund

# ============================================
# 第二阶段：运行镜像（使用 slim 镜像，体积小）
# ============================================
FROM node:18-slim

WORKDIR /app

# 复制已编译好的依赖（从 builder 阶段）
COPY --from=builder /app/node_modules ./node_modules

# 复制应用代码（注意：.dockerignore 会排除本地 node_modules）
COPY . .

# 确保必要目录存在
RUN mkdir -p public/uploads data

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]
