# 毕业合影姓名校对管理系统

## 功能特点

- 班级照片管理：支持多班级照片上传和管理
- 人脸识别：自动检测照片中的人脸并标注
- 姓名编辑：分排编辑姓名，支持自动格式化
- 数据导入：支持从Excel或文本粘贴导入姓名
- 权限管理：管理员和老师不同权限级别

## 安装运行

### 1. 安装依赖

```bash
npm install
```

### 2. 下载人脸识别模型

需要下载 face-api.js 的模型文件到 `public/models/` 目录：

- tiny_face_detector_model-shard1
- tiny_face_detector_model-weights_manifest.json

可以从以下地址下载：
https://github.com/justadudewhohacks/face-api.js-models

### 3. 启动服务

```bash
npm start
```

### 4. 访问系统

打开浏览器访问：http://localhost:3000

## 默认账户

- 用户名：admin
- 密码：admin123

## 项目结构

```
毕业合影姓名校对管理系统/
├── package.json
├── server.js              # 后端服务
├── database.js            # 数据库初始化
├── README.md
├── views/
│   ├── index.html         # 主界面
│   └── admin.html         # 管理员界面
└── public/
    ├── css/
    │   └── style.css      # 样式文件
    ├── js/
    │   ├── main.js        # 主界面脚本
    │   ├── admin.js       # 管理员脚本
    │   └── face-api.min.js # 人脸识别库
    ├── models/            # 人脸识别模型
    └── uploads/           # 上传照片存储
```
