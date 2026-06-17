
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const currentDbPath = path.join(__dirname, 'graduation_photo.db');
const backupDbPath = path.join(__dirname, 'graduation_photo.db.bak');

console.log('检查当前数据库...');
const currentDb = new sqlite3.Database(currentDbPath, (err) => {
    if (err) {
        console.error('无法打开当前数据库:', err.message);
        return;
    }
    console.log('✓ 当前数据库已打开');
    
    console.log('\n检查备份数据库...');
    const backupDb = new sqlite3.Database(backupDbPath, (err) => {
        if (err) {
            console.error('无法打开备份数据库:', err.message);
            currentDb.close();
            return;
        }
        console.log('✓ 备份数据库已打开');
        
        // 获取两个数据库中的照片数据
        console.log('\n===== 当前数据库 =====');
        currentDb.all('SELECT * FROM photos', (err, currentPhotos) => {
            if (err) {
                console.error('查询当前照片失败:', err.message);
            } else {
                console.log(`当前照片数量: ${currentPhotos.length}`);
                currentPhotos.forEach(p => {
                    console.log(`  - ${p.class_id}: ${p.title} (${p.filename})`);
                });
            }
            
            currentDb.all('SELECT * FROM names', (err, currentNames) => {
                if (err) {
                    console.error('查询当前姓名失败:', err.message);
                } else {
                    console.log(`当前姓名数量: ${currentNames.length}`);
                }
                
                console.log('\n===== 备份数据库 =====');
                backupDb.all('SELECT * FROM photos', (err, backupPhotos) => {
                    if (err) {
                        console.error('查询备份照片失败:', err.message);
                    } else {
                        console.log(`备份照片数量: ${backupPhotos.length}`);
                        backupPhotos.forEach(p => {
                            console.log(`  - ${p.class_id}: ${p.title} (${p.filename})`);
                        });
                    }
                    
                    backupDb.all('SELECT * FROM names', (err, backupNames) => {
                        if (err) {
                            console.error('查询备份姓名失败:', err.message);
                        } else {
                            console.log(`备份姓名数量: ${backupNames.length}`);
                            if (backupNames.length > 0) {
                                console.log('\n备份的姓名数据预览:');
                                backupNames.slice(0, 10).forEach(n => {
                                    console.log(`  - 班级${n.photo_id}: 第${n.row_index}排 第${n.name_index}个 - ${n.name}`);
                                });
                                if (backupNames.length > 10) {
                                    console.log(`  ... 还有 ${backupNames.length - 10} 个`);
                                }
                            }
                        }
                        
                        console.log('\n数据库检查完成！');
                        console.log('\n是否要从备份恢复数据？(请在浏览器中确认)');
                        
                        backupDb.close();
                        currentDb.close();
                    });
                });
            });
        });
    });
});

