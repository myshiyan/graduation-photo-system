
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'graduation_photo.db');
const db = new sqlite3.Database(dbPath);

console.log('修复剩余未关联的姓名数据...\n');

db.all('SELECT * FROM names WHERE class_id IS NULL', (err, names) => {
    if (err) {
        console.error('查询失败:', err.message);
        db.close();
        return;
    }
    
    if (names.length === 0) {
        console.log('✓ 所有姓名都已关联 class_id！');
        db.close();
        return;
    }
    
    console.log(`找到 ${names.length} 个未关联 class_id 的姓名\n`);
    
    let fixedCount = 0;
    const promises = names.map(name => {
        return new Promise((resolve, reject) => {
            db.get('SELECT class_id FROM photos WHERE id = ?', [name.photo_id], (err, photo) => {
                if (err) {
                    console.error(`查询照片 ${name.photo_id} 失败:`, err.message);
                    resolve();
                    return;
                }
                
                if (photo && photo.class_id) {
                    db.run('UPDATE names SET class_id = ? WHERE id = ?', [photo.class_id, name.id], (err) => {
                        if (err) {
                            console.error(`更新姓名 ${name.id} 失败:`, err.message);
                        } else {
                            fixedCount++;
                        }
                        resolve();
                    });
                } else {
                    console.log(`姓名 ${name.id}: 找不到对应的照片`);
                    resolve();
                }
            });
        });
    });
    
    Promise.all(promises).then(() => {
        console.log(`\n✓ 成功修复 ${fixedCount} 个姓名的 class_id 关联！`);
        
        db.all('SELECT COUNT(*) as count FROM names WHERE class_id IS NULL', (err, result) => {
            if (!err) {
                console.log(`✓ 剩余未关联的姓名数量: ${result[0].count}`);
            }
            console.log('\n修复完成！');
            db.close();
        });
    });
});
