
const db = require('./database');
const photoId = 13;

console.log('=== 测试删除人脸数据 ===');
console.log('photoId:', photoId);

// 先查询删除前的数据
db.all('SELECT * FROM faces WHERE photo_id = ?', [photoId], (err, rowsBefore) => {
    if (err) {
        console.error('查询失败:', err);
        return;
    }
    console.log('删除前 faces 数量:', rowsBefore.length);
    console.log('删除前 faces:', rowsBefore);
    
    // 执行删除
    console.log('\n--- 执行删除 ---');
    db.run('DELETE FROM faces WHERE photo_id = ?', [photoId], function(err) {
        if (err) {
            console.error('删除失败:', err);
            return;
        }
        console.log('删除成功，影响行数:', this.changes);
        
        // 查询删除后的数据
        db.all('SELECT * FROM faces WHERE photo_id = ?', [photoId], (err, rowsAfter) => {
            if (err) {
                console.error('查询失败:', err);
                return;
            }
            console.log('\n删除后 faces 数量:', rowsAfter.length);
            console.log('删除后 faces:', rowsAfter);
            console.log('\n=== 测试完成 ===');
        });
    });
});
