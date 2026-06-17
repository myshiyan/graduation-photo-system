const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'graduation_photo.db');
const db = new sqlite3.Database(dbPath);

console.log('检查数据库中的用户数据...\n');

db.all('SELECT * FROM users', (err, users) => {
    if (err) {
        console.error('查询失败:', err);
    } else if (users.length === 0) {
        console.log('没有找到用户！');
    } else {
        console.log(`找到 ${users.length} 个用户：`);
        users.forEach(user => {
            console.log(`- ID: ${user.id}, 用户名: ${user.username}, 角色: ${user.role}`);
        });
    }
    db.close();
});
