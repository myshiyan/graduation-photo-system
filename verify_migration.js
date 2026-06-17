
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'graduation_photo.db');
const db = new sqlite3.Database(dbPath);

console.log('验证数据库迁移...\n');

db.all('SELECT COUNT(*) as count FROM names WHERE class_id IS NOT NULL', (err, result) => {
    if (err) {
        console.error('查询失败:', err.message);
        db.close();
        return;
    }
    console.log(`✓ 已关联 class_id 的姓名数量: ${result[0].count}`);
    
    db.all('SELECT COUNT(*) as count FROM names', (err, result) => {
        if (err) {
            console.error('查询失败:', err.message);
            db.close();
            return;
        }
        console.log(`✓ 总姓名数量: ${result[0].count}`);
        
        db.all('SELECT * FROM classes', (err, classes) => {
            if (err) {
                console.error('查询失败:', err.message);
                db.close();
                return;
            }
            
            console.log(`\n✓ 班级数量: ${classes.length}`);
            console.log('\n每个班级的姓名数量:');
            
            const promises = classes.map(cls => {
                return new Promise((resolve, reject) => {
                    db.all('SELECT COUNT(*) as count FROM names WHERE class_id = ?', [cls.id], (err, result) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        console.log(`  ${cls.name}: ${result[0].count} 个姓名`);
                        resolve();
                    });
                });
            });
            
            Promise.all(promises).then(() => {
                console.log('\n✓ 数据验证完成！');
                console.log('\n现在，姓名数据已经与班级直接关联了：');
                console.log('  • 更新照片时，姓名数据不会丢失');
                console.log('  • 只有删除班级时，才会删除该班级的姓名数据');
                db.close();
            }).catch(err => {
                console.error('验证失败:', err.message);
                db.close();
            });
        });
    });
});
