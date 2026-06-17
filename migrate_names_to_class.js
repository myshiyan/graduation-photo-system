
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'graduation_photo.db');
const db = new sqlite3.Database(dbPath);

console.log('开始迁移数据库...');

db.serialize(() => {
    // 1. 先备份当前数据库
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `graduation_photo.db.backup_before_migrate_${timestamp}`);
    
    const fs = require('fs');
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✓ 数据库已备份到: ${backupPath}`);

    // 2. 为names表添加class_id列
    db.run('ALTER TABLE names ADD COLUMN class_id INTEGER', (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('添加class_id到names失败:', err.message);
        } else {
            console.log('✓ names表已添加class_id列');
        }

        // 3. 为faces表添加class_id列
        db.run('ALTER TABLE faces ADD COLUMN class_id INTEGER', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('添加class_id到faces失败:', err.message);
            } else {
                console.log('✓ faces表已添加class_id列');
            }

            // 4. 迁移现有的names数据：将photo_id关联到class_id
            db.all(`
                UPDATE names 
                SET class_id = (SELECT class_id FROM photos WHERE photos.id = names.photo_id)
                WHERE names.class_id IS NULL
            `, (err) => {
                if (err) {
                    console.error('迁移names数据失败:', err.message);
                } else {
                    console.log('✓ names数据已迁移到class_id关联');
                }

                // 5. 迁移现有的faces数据：将photo_id关联到class_id
                db.all(`
                    UPDATE faces 
                    SET class_id = (SELECT class_id FROM photos WHERE photos.id = faces.photo_id)
                    WHERE faces.class_id IS NULL
                `, (err) => {
                    if (err) {
                        console.error('迁移faces数据失败:', err.message);
                    } else {
                        console.log('✓ faces数据已迁移到class_id关联');
                    }

                    // 6. 验证迁移结果
                    db.all('SELECT COUNT(*) as count FROM names WHERE class_id IS NOT NULL', (err, row) => {
                        console.log(`✓ 已关联class_id的姓名数量: ${row.count}`);
                        
                        db.all('SELECT COUNT(*) as count FROM faces WHERE class_id IS NOT NULL', (err, row) => {
                            console.log(`✓ 已关联class_id的人脸数量: ${row.count}`);
                            console.log('\n✓ 数据库迁移完成！');
                            db.close();
                        });
                    });
                });
            });
        });
    });
});

