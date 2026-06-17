# Debug Session: admin-api-save-fails

## 问题描述
1. 照片标题模板修改标题保存失败：Unexpected token '<', "<!DOCTYPE "... is not valid JSON
2. 拍摄日期需要手动输入，不需要日期选择功能
3. 二维码管理区无法上传二维码
4. 批量上传照片失败，需要上传进度条

## 复现步骤
1. 登录管理后台 (zgzhbt / 13872765710)
2. 进入管理后台
3. 尝试修改标题模板并保存
4. 尝试上传二维码
5. 尝试批量上传照片

## 假设
1. 服务器端API路由可能被错误拦截
2. 前端fetch请求的credentials配置问题
3. 文件上传的multer配置问题
4. 批量上传的进度显示逻辑问题

## 状态: [OPEN]