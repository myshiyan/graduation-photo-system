
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'graduation_photo.db');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(__dirname, `graduation_photo.db.backup_${timestamp}`);

console.log('正在备份数据库...');
console.log(`源文件: ${dbPath}`);
console.log(`备份文件: ${backupPath}`);

fs.copyFile(dbPath, backupPath, (err) => {
    if (err) {
        console.error('备份失败:', err.message);
    } else {
        console.log('✓ 数据库备份成功！');
    }
});

