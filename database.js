const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// 支持通过环境变量 DB_PATH 指定数据库路径，用于 Docker 持久化
// 默认为当前目录下的 graduation_photo.db
const defaultDbPath = path.join(__dirname, 'graduation_photo.db');
let dbPath = process.env.DB_PATH || defaultDbPath;

// 如果 DB_PATH 是相对路径，解析为绝对路径
if (!path.isAbsolute(dbPath)) {
    dbPath = path.join(__dirname, dbPath);
}

// 确保数据库目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    try {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`✓ 数据库目录已创建: ${dbDir}`);
    } catch (err) {
        console.error(`创建数据库目录失败: ${dbDir}`, err.message);
        // 目录创建失败时回退到默认路径
        dbPath = defaultDbPath;
    }
}

console.log(`📂 数据库路径: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ 数据库连接失败:', err.message);
        process.exit(1);
    } else {
        console.log('✓ 数据库连接成功');
    }
});

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        line_height REAL DEFAULT 1.6,
        name_spacing REAL DEFAULT 10,
        font_size REAL DEFAULT 16,
        col_count INTEGER DEFAULT 15,
        title_font_size REAL DEFAULT 36,
        title_letter_spacing REAL DEFAULT 11,
        photo_offset_y REAL DEFAULT 0
    )`);

    // 迁移：为已存在的classes表添加布局参数列
    db.all("PRAGMA table_info(classes)", (err, columns) => {
        if (!err && columns) {
            const hasLineHeight = columns.some(col => col.name === 'line_height');
            if (!hasLineHeight) {
                db.run('ALTER TABLE classes ADD COLUMN line_height REAL DEFAULT 1.6', (err) => {
                    if (err) {
                        console.error('添加line_height列到classes表失败:', err);
                    } else {
                        console.log('✓ 成功添加line_height列到classes表');
                    }
                });
            }
            
            const hasNameSpacing = columns.some(col => col.name === 'name_spacing');
            if (!hasNameSpacing) {
                db.run('ALTER TABLE classes ADD COLUMN name_spacing REAL DEFAULT 10', (err) => {
                    if (err) {
                        console.error('添加name_spacing列到classes表失败:', err);
                    } else {
                        console.log('✓ 成功添加name_spacing列到classes表');
                    }
                });
            }
            
            const hasFontSize = columns.some(col => col.name === 'font_size');
            if (!hasFontSize) {
                db.run('ALTER TABLE classes ADD COLUMN font_size REAL DEFAULT 16', (err) => {
                    if (err) {
                        console.error('添加font_size列到classes表失败:', err);
                    } else {
                        console.log('✓ 成功添加font_size列到classes表');
                    }
                });
            }
            
            const hasColCount = columns.some(col => col.name === 'col_count');
            if (!hasColCount) {
                db.run('ALTER TABLE classes ADD COLUMN col_count INTEGER DEFAULT 15', (err) => {
                    if (err) {
                        console.error('添加col_count列到classes表失败:', err);
                    } else {
                        console.log('✓ 成功添加col_count列到classes表');
                    }
                });
            }
            
            const hasTitleFontSize = columns.some(col => col.name === 'title_font_size');
            if (!hasTitleFontSize) {
                db.run('ALTER TABLE classes ADD COLUMN title_font_size REAL DEFAULT 24', (err) => {
                    if (err) {
                        console.error('添加title_font_size列到classes表失败:', err);
                    } else {
                        console.log('✓ 成功添加title_font_size列到classes表');
                    }
                });
            }

            const hasTitleLetterSpacing = columns.some(col => col.name === 'title_letter_spacing');
            if (!hasTitleLetterSpacing) {
                db.run('ALTER TABLE classes ADD COLUMN title_letter_spacing REAL DEFAULT 11', (err) => {
                    if (err) {
                        console.error('添加title_letter_spacing列到classes表失败:', err);
                    } else {
                        console.log('✓ 成功添加title_letter_spacing列到classes表');
                    }
                });
            }

            const hasPhotoOffsetY = columns.some(col => col.name === 'photo_offset_y');
            if (!hasPhotoOffsetY) {
                db.run('ALTER TABLE classes ADD COLUMN photo_offset_y REAL DEFAULT 0', (err) => {
                    if (err) {
                        console.error('添加photo_offset_y列到classes表失败:', err);
                    } else {
                        console.log('✓ 成功添加photo_offset_y列到classes表');
                    }
                });
            }

            // 更新已有的班级设置新默认值
            db.run('UPDATE classes SET title_font_size = 36 WHERE title_font_size = 24 OR title_font_size IS NULL', (err) => {
                if (err) {
                    console.error('更新title_font_size默认值失败:', err);
                } else {
                    console.log('✓ 成功更新title_font_size默认值为36');
                }
            });

            db.run('UPDATE classes SET title_letter_spacing = 11 WHERE title_letter_spacing = 0 OR title_letter_spacing IS NULL', (err) => {
                if (err) {
                    console.error('更新title_letter_spacing默认值失败:', err);
                } else {
                    console.log('✓ 成功更新title_letter_spacing默认值为11');
                }
            });
        }
    });

    // 创建照片表
    db.run(`CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        filename TEXT,
        title TEXT DEFAULT '十堰市第一中学2026届高三(1)班师生毕业合影',
        date TEXT DEFAULT '2026.5.29',
        line_height REAL DEFAULT 1.6,
        name_spacing REAL DEFAULT 10,
        font_size REAL DEFAULT 16,
        col_count INTEGER DEFAULT 15,
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
            
            const hasLineHeight = columns.some(col => col.name === 'line_height');
            if (!hasLineHeight) {
                db.run('ALTER TABLE photos ADD COLUMN line_height REAL DEFAULT 1.6', (err) => {
                    if (err) {
                        console.error('添加line_height列失败:', err);
                    } else {
                        console.log('✓ 成功添加line_height列到photos表');
                    }
                });
            }
            
            const hasNameSpacing = columns.some(col => col.name === 'name_spacing');
            if (!hasNameSpacing) {
                db.run('ALTER TABLE photos ADD COLUMN name_spacing REAL DEFAULT 10', (err) => {
                    if (err) {
                        console.error('添加name_spacing列失败:', err);
                    } else {
                        console.log('✓ 成功添加name_spacing列到photos表');
                    }
                });
            }
            
            const hasFontSize = columns.some(col => col.name === 'font_size');
            if (!hasFontSize) {
                db.run('ALTER TABLE photos ADD COLUMN font_size REAL DEFAULT 16', (err) => {
                    if (err) {
                        console.error('添加font_size列失败:', err);
                    } else {
                        console.log('✓ 成功添加font_size列到photos表');
                    }
                });
            }
            
            const hasColCount = columns.some(col => col.name === 'col_count');
            if (!hasColCount) {
                db.run('ALTER TABLE photos ADD COLUMN col_count INTEGER DEFAULT 15', (err) => {
                    if (err) {
                        console.error('添加col_count列失败:', err);
                    } else {
                        console.log('✓ 成功添加col_count列到photos表');
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
