const https = require('https');
const fs = require('fs');
const path = require('path');

const modelFiles = [
    // Tiny Face Detector 模型
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model.bin',
];

const baseUrls = [
    'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/',
    'https://unpkg.com/@vladmandic/face-api@1.7.12/model/'
];

const modelsDir = path.join(__dirname, 'public', 'models');

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
    console.log('开始下载人脸识别模型...\n');

    for (const fileName of modelFiles) {
        let downloaded = false;
        for (const baseUrl of baseUrls) {
            const url = baseUrl + fileName;
            const filePath = path.join(modelsDir, fileName);
            
            console.log(`尝试下载 ${fileName} 从 ${baseUrl}...`);
            
            try {
                await downloadFile(url, filePath);
                console.log(`✓ 成功下载 ${fileName}`);
                downloaded = true;
                break;
            } catch (err) {
                console.warn(`✗ 下载失败: ${err.message}`);
            }
        }
        
        if (!downloaded) {
            console.error(`\n错误: 无法下载 ${fileName}，所有源都失败了`);
            process.exit(1);
        }
    }

    console.log('\n✓ 所有模型文件下载完成！');
    console.log(`模型文件保存在: ${modelsDir}`);
}

downloadModels().catch(console.error);
