
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'graduation_photo.db');
const db = new sqlite3.Database(dbPath);

console.log('开始恢复1班的姓名数据...\n');

// 1班的姓名数据（按照row_index倒序存储）
// 第3排（最上面）→ row_index = 2
// 第2排 → row_index = 1
// 第1排（最下面）→ row_index = 0
const class1Data = [
    // 第3排 (row_index = 2)
    { row_index: 2, name_index: 0, name: '袁金豪' },
    { row_index: 2, name_index: 1, name: '王志轩' },
    { row_index: 2, name_index: 2, name: '杨堰' },
    { row_index: 2, name_index: 3, name: '杨秉鑫' },
    { row_index: 2, name_index: 4, name: '杨振豪' },
    { row_index: 2, name_index: 5, name: '郑世博' },
    { row_index: 2, name_index: 6, name: '黄晶晶' },
    { row_index: 2, name_index: 7, name: '全宇航' },
    { row_index: 2, name_index: 8, name: '黄鑫垚' },
    { row_index: 2, name_index: 9, name: '卢宸阳' },
    { row_index: 2, name_index: 10, name: '黄彭朝阳' },
    { row_index: 2, name_index: 11, name: '张郝睿' },
    { row_index: 2, name_index: 12, name: '汪新平' },
    
    // 第2排 (row_index = 1)
    { row_index: 1, name_index: 0, name: '李俊毅' },
    { row_index: 1, name_index: 1, name: '朱大可' },
    { row_index: 1, name_index: 2, name: '柯伟' },
    { row_index: 1, name_index: 3, name: '李钰坤' },
    { row_index: 1, name_index: 4, name: '刘斯宇' },
    { row_index: 1, name_index: 5, name: '徐徐鹏' },
    { row_index: 1, name_index: 6, name: '冯钰杰' },
    { row_index: 1, name_index: 7, name: '郭静雯' },
    { row_index: 1, name_index: 8, name: '吴依燃' },
    { row_index: 1, name_index: 9, name: '刘伊美' },
    { row_index: 1, name_index: 10, name: '郭怡爽' },
    { row_index: 1, name_index: 11, name: '吴文俊' },
    { row_index: 1, name_index: 12, name: '王星宇' },
    { row_index: 1, name_index: 13, name: '李宇洋' },
    { row_index: 1, name_index: 14, name: '郑力烽' },
    
    // 第1排 (row_index = 0)
    { row_index: 0, name_index: 0, name: '蒋国峰' },
    { row_index: 0, name_index: 1, name: '吴中鹏' },
    { row_index: 0, name_index: 2, name: '李江' },
    { row_index: 0, name_index: 3, name: '田奇峰' },
    { row_index: 0, name_index: 4, name: '刘洪波' },
    { row_index: 0, name_index: 5, name: '石彬' },
    { row_index: 0, name_index: 6, name: '胡斌' },
    { row_index: 0, name_index: 7, name: '马向东' },
    { row_index: 0, name_index: 8, name: '方玉仁' },
    { row_index: 0, name_index: 9, name: '朱丹' },
    { row_index: 0, name_index: 10, name: '余娟' },
    { row_index: 0, name_index: 11, name: '卢杰' }
];

db.get('SELECT * FROM classes WHERE name = ?', ['1班'], (err, cls) => {
    if (err) {
        console.error('查询失败:', err.message);
        db.close();
        return;
    }
    
    if (!cls) {
        console.log('找不到1班！');
        db.close();
        return;
    }
    
    console.log(`✓ 找到1班，ID: ${cls.id}`);
    
    // 获取1班的照片ID
    db.get('SELECT * FROM photos WHERE class_id = ?', [cls.id], (err, photo) => {
        if (err) {
            console.error('查询照片失败:', err.message);
            db.close();
            return;
        }
        
        if (!photo) {
            console.log('找不到1班的照片！请先上传照片。');
            db.close();
            return;
        }
        
        console.log(`✓ 找到照片，ID: ${photo.id}`);
        
        // 删除当前1班的所有姓名数据
        db.run('DELETE FROM names WHERE class_id = ?', [cls.id], (err) => {
            if (err) {
                console.error('删除旧数据失败:', err.message);
                db.close();
                return;
            }
            
            console.log('\n✓ 已清空1班的旧数据');
            
            // 插入新的姓名数据
            const insertPromises = class1Data.map(item => {
                return new Promise((resolve, reject) => {
                    db.run(
                        'INSERT INTO names (photo_id, class_id, row_index, name_index, name) VALUES (?, ?, ?, ?, ?)',
                        [photo.id, cls.id, item.row_index, item.name_index, item.name],
                        (err) => {
                            if (err) {
                                console.error(`插入失败 [第${item.row_index + 1}排, 第${item.name_index + 1}个, ${item.name}]:`, err.message);
                                reject(err);
                            } else {
                                resolve();
                            }
                        }
                    );
                });
            });
            
            Promise.all(insertPromises).then(() => {
                console.log(`\n✓ 成功恢复 ${class1Data.length} 个姓名数据！`);
                
                // 验证恢复结果
                db.all('SELECT * FROM names WHERE class_id = ? ORDER BY row_index DESC, name_index', [cls.id], (err, names) => {
                    if (err) {
                        console.error('查询失败:', err.message);
                        db.close();
                        return;
                    }
                    
                    console.log('\n恢复后的姓名数据：');
                    const rows = {};
                    names.forEach(n => {
                        if (!rows[n.row_index]) {
                            rows[n.row_index] = [];
                        }
                        rows[n.row_index].push(n.name);
                    });
                    
                    Object.keys(rows).sort((a, b) => b - a).forEach(rowIndex => {
                        console.log(`  第${parseInt(rowIndex) + 1}排: ${rows[rowIndex].join('、')}`);
                    });
                    
                    console.log('\n✓ 1班姓名数据恢复完成！');
                    db.close();
                });
            }).catch(err => {
                console.error('\n恢复失败:', err.message);
                db.close();
            });
        });
    });
});
