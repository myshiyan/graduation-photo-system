const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'graduation_photo.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 创建用户表
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        phone TEXT UNIQUE,
        wechat_openid TEXT UNIQUE,
        wechat_unionid TEXT UNIQUE,
        nickname TEXT,
        avatar TEXT,
        role TEXT NOT NULL CHECK(role IN ('admin', 'teacher')) DEFAULT 'teacher',
        managed_class_id INTEGER,
        FOREIGN KEY(managed_class_id) REFERENCES classes(id)
    )`);
    
    // 迁移：为已存在的users表添加managed_class_id列
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (!err && columns) {
            const hasManagedClassId = columns.some(col => col.name === 'managed_class_id');
            if (!hasManagedClassId) {
                db.run('ALTER TABLE users ADD COLUMN managed_class_id INTEGER', (err) => {
                    if (err) {
                        console.error('添加managed_class_id列失败:', err);
                    } else {
                        console.log('✓ 成功添加managed_class_id列到users表');
                    }
                });
            }
        }
    });

    // 创建班级表
    db.run(`CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 创建照片表
    db.run(`CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        filename TEXT,
        title TEXT DEFAULT '十堰市第一中学2026届高三(1)班师生毕业合影',
        date TEXT DEFAULT '2026.5.29',
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(class_id) REFERENCES classes(id)
    )`);

    // 迁移：为已存在的photos表添加filename列
    db.all("PRAGMA table_info(photos)", (err, columns) => {
        if (!err && columns) {
            const hasFilename = columns.some(col => col.name === 'filename');
            if (!hasFilename) {
                db.run('ALTER TABLE photos ADD COLUMN filename TEXT', (err) => {
                    if (err) {
                        console.error('添加filename列失败:', err);
                    } else {
                        console.log('✓ 成功添加filename列到photos表');
                    }
                });
            }
        }
    });

    // 创建姓名表
    db.run(`CREATE TABLE IF NOT EXISTS names (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_id INTEGER NOT NULL,
        row_index INTEGER NOT NULL,
        name_index INTEGER NOT NULL,
        name TEXT DEFAULT '',
        FOREIGN KEY(photo_id) REFERENCES photos(id)
    )`);

    // 创建人脸表
    db.run(`CREATE TABLE IF NOT EXISTS faces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photo_id INTEGER NOT NULL,
        face_index INTEGER NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        name_id INTEGER,
        FOREIGN KEY(photo_id) REFERENCES photos(id),
        FOREIGN KEY(name_id) REFERENCES names(id)
    )`);

    // 创建默认管理员账号
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
        if (!row) {
            db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['admin', adminPassword, 'admin'], (err) => {
                    if (err) {
                        console.error('创建默认管理员失败:', err);
                    } else {
                        console.log('✓ 默认管理员账号创建成功: admin / admin123');
                    }
                });
        }
    });

    // 创建指定的管理员账号 zgzhbt
    const zgzhbtPassword = bcrypt.hashSync('13872765710', 10);
    db.get('SELECT id FROM users WHERE username = ?', ['zgzhbt'], (err, row) => {
        if (!row) {
            db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['zgzhbt', zgzhbtPassword, 'admin'], (err) => {
                    if (err) {
                        console.error('创建zgzhbt账号失败:', err);
                    } else {
                        console.log('✓ 管理员账号创建成功: zgzhbt / 13872765710');
                    }
                });
        } else {
            console.log('✓ 管理员账号 zgzhbt 已存在');
        }
    });

    // 创建25个班级
    for (let i = 1; i <= 25; i++) {
        const className = `${i}班`;
        db.get('SELECT id FROM classes WHERE name = ?', [className], (err, row) => {
            if (!row) {
                db.run('INSERT INTO classes (name) VALUES (?)', [className], (err) => {
                    if (err) {
                        console.error(`创建班级失败: ${className}`, err);
                    } else {
                        console.log(`✓ 班级创建成功: ${className}`);
                    }
                });
            }
        });
    }
});

console.log('✓ 数据库初始化完成');

module.exports = db;
