const https = require('https');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'mediapipe');

async function downloadFile(url, filePath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {});
            reject(err);
        });
    });
}

async function downloadModels() {
    console.log('开始下载 MediaPipe BlazeFace 模型...\n');

    // MediaPipe Face Detection 模型 (BlazeFace)
    const modelFiles = [
        {
            url: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            filename: 'blaze_face_short_range.tflite'
        }
    ];

    for (const model of modelFiles) {
        const filePath = path.join(modelsDir, model.filename);
        console.log(`下载 ${model.filename}...`);
        try {
            await downloadFile(model.url, filePath);
            console.log(`✓ 成功下载 ${model.filename}`);
        } catch (err) {
            console.error(`✗ 下载失败: ${err.message}`);
            process.exit(1);
        }
    }

    console.log('\n✓ 所有 MediaPipe 模型文件下载完成！');
    console.log(`模型文件保存在: ${modelsDir}`);
}

downloadModels().catch(console.error);