
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'graduation_photo.db');
const db = new sqlite3.Database(dbPath);

console.log('清理无用的姓名数据...\n');

db.all('SELECT * FROM names WHERE class_id IS NULL', (err, names) => {
    if (err) {
        console.error('查询失败:', err.message);
        db.close();
        return;
    }
    
    if (names.length === 0) {
        console.log('✓ 没有需要清理的数据！');
        db.close();
        return;
    }
    
    console.log(`找到 ${names.length} 个无用的姓名数据（关联的照片已不存在）\n`);
    
    const ids = names.map(n => n.id);
    const placeholders = ids.map(() => '?').join(',');
    
    db.run(`DELETE FROM names WHERE id IN (${placeholders})`, ids, (err) => {
        if (err) {
            console.error('删除失败:', err.message);
        } else {
            console.log(`✓ 成功删除 ${names.length} 个无用的姓名数据！`);
        }
        
        console.log('\n清理完成！');
        db.close();
    });
});
