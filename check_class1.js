
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'graduation_photo.db');
const db = new sqlite3.Database(dbPath);

console.log('查看1班当前的数据...\n');

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
    
    console.log(`✓ 1班 ID: ${cls.id}`);
    
    db.all('SELECT * FROM names WHERE class_id = ? ORDER BY row_index DESC, name_index', [cls.id], (err, names) => {
        if (err) {
            console.error('查询失败:', err.message);
            db.close();
            return;
        }
        
        console.log(`\n当前1班有 ${names.length} 个姓名数据：`);
        if (names.length > 0) {
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
        }
        
        console.log('\n查看完毕！');
        db.close();
    });
});
