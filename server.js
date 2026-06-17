const express = require('express');
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const app = express();
const PORT = 3000;

// 微信配置
const WECHAT_CONFIG = {
    appId: 'wxae89082f55b840db',
    appSecret: '', // 需要补充您的 AppSecret
    token: 'graduation_photo_token_2024',
    encodingAESKey: ''
};

// 确保uploads目录存在
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session配置（放在静态文件之前）
app.use(session({
    secret: 'graduation-photo-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        httpOnly: true,
        secure: false
    }
}));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 添加请求日志
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// 页面路由
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'views', 'index.html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error loading file');
        } else {
            res.send(data);
        }
    });
});

app.get('/admin', (req, res) => {
    const filePath = path.join(__dirname, 'views', 'admin.html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error loading file');
        } else {
            res.send(data);
        }
    });
});

// 姓名列表页面
app.get('/name', (req, res) => {
    const filePath = path.join(__dirname, 'views', 'name.html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error loading file');
        } else {
            res.send(data);
        }
    });
});

// PDF合并页面
app.get('/merge-pdf', (req, res) => {
    const filePath = path.join(__dirname, 'views', 'merge-pdf.html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error loading file');
        } else {
            res.send(data);
        }
    });
});

// 打印页面
app.get('/print', (req, res) => {
    const filePath = path.join(__dirname, 'views', 'print.html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error loading file');
        } else {
            res.send(data);
        }
    });
});

// 学生姓名分析页面
app.get('/xmfx', (req, res) => {
    const filePath = path.join(__dirname, 'views', 'xmfx.html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error loading file');
        } else {
            res.send(data);
        }
    });
});

// API: 注册
app.post('/api/register', (req, res) => {
    const { username, password, managedClassId } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '请填写用户名和密码' });
    }
    if (!managedClassId) {
        return res.status(400).json({ error: '请选择要管理的班级' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: '密码长度至少6位' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, existingUser) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (existingUser) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        const hashedPassword = bcrypt.hashSync(password, 8);
        db.run('INSERT INTO users (username, password, role, managed_class_id) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, 'teacher', managedClassId],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                const userId = this.lastID;
                const user = { id: userId, username, role: 'teacher', managedClassId };
                req.session.user = user;
                res.json({ success: true, user });
            });
    });
});

// API: 登录
app.post('/api/login', (req, res) => {
    console.log('\n=== 收到 /api/login POST 请求 ===');
    console.log('req.body:', req.body);
    const { username, password } = req.body;
    console.log('username:', username, 'password:', password);
    
    if (!username || !password) {
        console.log('返回 400: 缺少用户名或密码');
        return res.status(400).json({ error: '请输入用户名和密码' });
    }
    
    console.log('查询数据库用户...');
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('DB error:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('查询结果 user:', user);
        
        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ error: '用户不存在' });
        }

        console.log('User found, checking password...');
        console.log('输入密码:', password);
        console.log('数据库存储的密码 hash:', user.password);
        
        const passwordMatch = bcrypt.compareSync(password, user.password);
        console.log('密码比对结果:', passwordMatch);
        
        if (passwordMatch) {
            console.log('Password correct, login successful');
            req.session.user = { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                managedClassId: user.managed_class_id
            };
            console.log('设置 session.user:', req.session.user);
            res.json({ 
                success: true, 
                user: { 
                    id: user.id, 
                    username: user.username, 
                    role: user.role,
                    managedClassId: user.managed_class_id
                } 
            });
        } else {
            console.log('Password incorrect');
            res.status(401).json({ error: '密码错误' });
        }
    });
});

// API: 获取用户列表（管理员专用）
app.get('/api/users', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    db.all('SELECT u.id, u.username, u.role, u.managed_class_id, c.name as managed_class_name FROM users u LEFT JOIN classes c ON u.managed_class_id = c.id ORDER BY u.id', (err, users) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(users.map(u => ({
            id: u.id,
            username: u.username,
            role: u.role,
            managedClassId: u.managed_class_id,
            managedClassName: u.managed_class_name
        })));
    });
});

// API: 删除用户（管理员专用）
app.delete('/api/users/:id', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    const userId = req.params.id;
    if (userId == req.session.user.id) {
        return res.status(400).json({ error: '不能删除自己的账号' });
    }
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        res.json({ success: true });
    });
});

// API: 重置用户密码（管理员专用）
app.put('/api/users/:id/password', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: '新密码长度至少6位' });
    }
    const hashedPassword = bcrypt.hashSync(newPassword, 8);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        res.json({ success: true });
    });
});

// API: 获取当前会话
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: '未登录' });
    }
});

// API: 登出
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// API: 微信扫码登录（测试用）
// 微信服务器验证接口
app.get('/api/wechat/callback', (req, res) => {
    const { signature, timestamp, nonce, echostr } = req.query;
    
    console.log('收到微信验证请求:', { signature, timestamp, nonce });
    
    // 验证签名
    const token = WECHAT_CONFIG.token;
    const arr = [token, timestamp, nonce].sort();
    const str = arr.join('');
    const sha1 = crypto.createHash('sha1');
    sha1.update(str);
    const sign = sha1.digest('hex');
    
    if (sign === signature) {
        console.log('微信验证成功');
        res.send(echostr);
    } else {
        console.log('微信验证失败');
        res.status(403).send('验证失败');
    }
});

// 微信消息接收接口
app.post('/api/wechat/callback', express.text({ type: '*/xml' }), (req, res) => {
    console.log('收到微信消息:', req.body);
    
    // 这里可以处理微信扫码事件
    // 解析XML，获取用户OpenID
    // 根据场景值判断登录请求
    
    res.send('');
});

// 检查微信登录状态
app.get('/api/wechat/check-login', (req, res) => {
    // 这里可以实现轮询检查是否已扫码登录
    res.json({ success: true, loggedIn: false });
});

// 微信登录
app.post('/api/wechat-login', (req, res) => {
    console.log('WeChat login attempt');
    
    // 查找是否有微信用户（优先查找已有的教师账号）
    db.get('SELECT * FROM users WHERE username = ?', ['微信用户'], (err, wechatUser) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (wechatUser) {
            // 如果存在微信用户账号，使用该账号登录
            req.session.user = { 
                id: wechatUser.id, 
                username: wechatUser.username, 
                role: wechatUser.role,
                managedClassId: wechatUser.managed_class_id
            };
            console.log('WeChat login successful for:', wechatUser.username);
            res.json({ 
                success: true, 
                user: { 
                    id: wechatUser.id, 
                    username: wechatUser.username, 
                    role: wechatUser.role,
                    managedClassId: wechatUser.managed_class_id
                } 
            });
        } else {
            // 如果没有微信用户账号，创建一个
            const username = '微信用户';
            const password = bcrypt.hashSync('wechat123', 10);
            
            db.run('INSERT INTO users (username, password, role, nickname) VALUES (?, ?, ?, ?)', 
                [username, password, 'teacher', '十堰摄影网用户'], function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    const userId = this.lastID;
                    req.session.user = { id: userId, username: username, role: 'teacher', managedClassId: null };
                    console.log('WeChat login successful: 创建微信用户账号');
                    res.json({ 
                        success: true, 
                        user: { id: userId, username: username, role: 'teacher', managedClassId: null } 
                    });
                });
        }
    });
});

// API: 获取班级列表
app.get('/api/classes', (req, res) => {
    db.all('SELECT * FROM classes ORDER BY name', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const sortedRows = rows.sort((a, b) => {
            const numA = parseInt(a.name.match(/(\d+)/)?.[1]) || 999;
            const numB = parseInt(b.name.match(/(\d+)/)?.[1]) || 999;
            if (numA !== numB) return numA - numB;
            return a.name.localeCompare(b.name, 'zh-CN');
        });
        res.json(sortedRows);
    });
});

// API: 添加班级
app.post('/api/classes', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: '班级名称不能为空' });
    }
    db.run('INSERT INTO classes (name) VALUES (?)', [name], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
    });
});

// API: 删除班级
app.delete('/api/classes/:id', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }

    db.all('SELECT * FROM photos WHERE class_id = ?', [req.params.id], (err, photos) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const deletePromises = photos.map(photo => {
            return new Promise((resolve, reject) => {
                const filePath = path.join(__dirname, 'public', photo.file_path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                db.run('DELETE FROM photos WHERE id = ?', [photo.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        Promise.all(deletePromises).then(() => {
            // 只有删除班级时才删除姓名和人脸数据
            db.run('DELETE FROM names WHERE class_id = ?', [req.params.id], (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                db.run('DELETE FROM faces WHERE class_id = ?', [req.params.id], (err) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    db.run('DELETE FROM classes WHERE id = ?', [req.params.id], (err) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ success: true });
                    });
                });
            });
        }).catch(err => {
            res.status(500).json({ error: err.message });
        });
    });
});

// API: 获取班级照片数据
app.get('/api/photos/:classId', (req, res) => {
    // 无论是否有照片，都需要获取姓名数据
    db.get('SELECT * FROM photos WHERE class_id = ?', [req.params.classId], (err, photo) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // 获取姓名数据
        db.all('SELECT * FROM names WHERE class_id = ? ORDER BY row_index, name_index', [req.params.classId], (err, names) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            // 获取人脸数据
            db.all('SELECT * FROM faces WHERE class_id = ? ORDER BY face_index', [req.params.classId], (err, faces) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                // 即使没有照片，也返回数据结构，只是photo为null
                res.json({ photo, names, faces });
            });
        });
    });
});

// API: 获取所有班级的姓名列表
app.get('/api/names/all', (req, res) => {
    db.all('SELECT * FROM classes ORDER BY id', (err, classes) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (classes.length === 0) {
            res.json([]);
            return;
        }
        
        // 使用Promise.all处理异步查询，避免变量闭包问题
        const promises = classes.map(cls => {
            return new Promise((resolve, reject) => {
                db.all('SELECT * FROM names WHERE class_id = ? ORDER BY row_index DESC, name_index', [cls.id], (err, names) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({
                        id: cls.id,
                        name: cls.name,
                        names: names
                    });
                });
            });
        });
        
        Promise.all(promises)
            .then(result => {
                result.sort((a, b) => {
                    const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                    const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                    return numA - numB;
                });
                res.json(result);
            })
            .catch(err => {
                res.status(500).json({ error: err.message });
            });
    });
});

// API: 获取所有班级的完整信息（用于打印）
app.get('/api/print/all', (req, res) => {
    db.all('SELECT * FROM classes ORDER BY id', (err, classes) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (classes.length === 0) {
            res.json([]);
            return;
        }
        
        // 使用Promise.all处理异步查询，避免变量闭包问题
        const promises = classes.map(cls => {
            return new Promise((resolve, reject) => {
                db.get('SELECT * FROM photos WHERE class_id = ?', [cls.id], (err, photo) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    db.all('SELECT * FROM names WHERE class_id = ? ORDER BY row_index DESC, name_index', [cls.id], (err, names) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({
                    id: cls.id,
                    name: cls.name,
                    title_font_size: cls.title_font_size,
                    title_letter_spacing: cls.title_letter_spacing,
                    photo_offset_y: cls.photo_offset_y,
                    photo: photo,
                    names: names
                });
            });
                });
            });
        });
        
        Promise.all(promises)
            .then(result => {
                result.sort((a, b) => {
                    const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
                    const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
                    return numA - numB;
                });
                res.json(result);
            })
            .catch(err => {
                res.status(500).json({ error: err.message });
            });
    });
});

// 临时调试API: 查看3班的张婷婷记录
app.get('/debug/class3', (req, res) => {
    db.all('SELECT * FROM classes WHERE name = ?', ['3班'], (err, classes) => {
        if (err || !classes.length) {
            return res.status(500).json({ error: err?.message || '班级不存在' });
        }
        
        const cls = classes[0];
        db.get('SELECT * FROM photos WHERE class_id = ?', [cls.id], (err, photo) => {
            if (err || !photo) {
                return res.status(500).json({ error: err?.message || '照片不存在' });
            }
            
            db.all('SELECT * FROM names WHERE photo_id = ? AND name LIKE ? ORDER BY id', [photo.id, '%张婷婷%'], (err, names) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                res.json({
                    classId: cls.id,
                    className: cls.name,
                    photoId: photo.id,
                    zhangTingtingRecords: names
                });
            });
        });
    });
});

// API: 上传照片
app.post('/api/photos', upload.single('photo'), (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ error: '请先登录' });
    }

    if (!req.file) {
        return res.status(400).json({ error: '请选择照片文件' });
    }

    const classId = req.body.classId;
    const title = req.body.title || '';
    const date = req.body.date || '';

    if (!classId) {
        return res.status(400).json({ error: '缺少classId' });
    }

    db.get('SELECT * FROM classes WHERE id = ?', [classId], (err, cls) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!cls) {
            return res.status(404).json({ error: '班级不存在' });
        }

        db.get('SELECT * FROM photos WHERE class_id = ?', [classId], (err, existingPhoto) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const filePath = req.file.path.replace(__dirname + '\\public\\', '').replace(__dirname + '/public/', '');

            const insertPhoto = () => {
                db.run('INSERT INTO photos (class_id, file_path, filename, title, date, line_height, name_spacing, font_size, col_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [classId, filePath, req.file.originalname, title, date, 1.6, 10, 16, 15], function(err) {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ success: true, id: this.lastID });
                    });
            };

            if (existingPhoto) {
                const oldFilePath = path.join(__dirname, 'public', existingPhoto.file_path);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }

                // 保存现有的names和faces数据
                db.all('SELECT * FROM names WHERE photo_id = ?', [existingPhoto.id], (err, existingNames) => {
                    if (err) return res.status(500).json({ error: err.message });
                    db.all('SELECT * FROM faces WHERE photo_id = ?', [existingPhoto.id], (err, existingFaces) => {
                        if (err) return res.status(500).json({ error: err.message });
                        
                        // 只更新照片信息，保留照片ID，这样names和faces就不会丢失
                        db.run('UPDATE photos SET file_path = ?, filename = ?, title = ?, date = ? WHERE id = ?',
                            [filePath, req.file.originalname, title, date, existingPhoto.id], (err) => {
                                if (err) return res.status(500).json({ error: err.message });
                                res.json({ success: true, id: existingPhoto.id });
                            });
                    });
                });
            } else {
                insertPhoto();
            }
        });
    });
});

// API: 更新照片信息
app.put('/api/photos/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ error: '请先登录' });
    }
    const { title, date } = req.body;
    db.run('UPDATE photos SET title = ?, date = ? WHERE id = ?', [title, date, req.params.id], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// API: 删除照片（通过照片ID或班级ID）
app.delete('/api/photos/:id', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }

    // 先尝试通过照片ID查找
    db.get('SELECT * FROM photos WHERE id = ?', [req.params.id], (err, photo) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // 如果没找到，尝试通过班级ID查找
        if (!photo) {
            db.get('SELECT * FROM photos WHERE class_id = ?', [req.params.id], (err, photoByClass) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                if (!photoByClass) {
                    return res.status(404).json({ error: '照片不存在' });
                }
                deletePhotoById(photoByClass.id, res);
            });
        } else {
            deletePhotoById(photo.id, res);
        }
    });
});

function deletePhotoById(photoId, res) {
    db.get('SELECT * FROM photos WHERE id = ?', [photoId], (err, photo) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!photo) {
            return res.status(404).json({ error: '照片不存在' });
        }

        const filePath = path.join(__dirname, 'public', photo.file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // 删除照片，但不删除姓名数据（姓名数据只与班级关联）
        db.run('DELETE FROM faces WHERE photo_id = ?', [photoId], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            db.run('DELETE FROM photos WHERE id = ?', [photoId], (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ success: true });
            });
        });
    });
}

// API: 保存姓名和照片信息
app.post('/api/names', (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ error: '请先登录' });
    }
    const { photoId, classId, title, date, lineHeight, nameSpacing, fontSize, colCount, titleFontSize, titleLetterSpacing, photoOffsetY, names } = req.body;

    if (!classId) {
        return res.status(400).json({ error: '缺少classId' });
    }

    // 更新照片信息（只更新标题和日期）
    if (photoId) {
        db.run('UPDATE photos SET title = ?, date = ? WHERE id = ?', [title, date, photoId], (err) => {
            if (err) {
                console.error('更新照片信息失败:', err.message);
            }
        });
    }

    // 更新班级布局参数
    if (lineHeight !== undefined || nameSpacing !== undefined || fontSize !== undefined || colCount !== undefined || titleFontSize !== undefined || titleLetterSpacing !== undefined || photoOffsetY !== undefined) {
        db.run('UPDATE classes SET line_height = ?, name_spacing = ?, font_size = ?, col_count = ?, title_font_size = ?, title_letter_spacing = ?, photo_offset_y = ? WHERE id = ?', [
            lineHeight !== undefined ? lineHeight : 1.6,
            nameSpacing !== undefined ? nameSpacing : 10,
            fontSize !== undefined ? fontSize : 16,
            colCount !== undefined ? colCount : 15,
            titleFontSize !== undefined ? titleFontSize : 36,
            titleLetterSpacing !== undefined ? titleLetterSpacing : 11,
            photoOffsetY !== undefined ? photoOffsetY : 0,
            classId
        ], (err) => {
            if (err) {
                console.error('更新班级布局参数失败:', err.message);
            }
        });
    }

    // 保存姓名数据（与class_id关联）
    db.run('DELETE FROM names WHERE class_id = ?', [classId], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!names || names.length === 0) {
            return res.json({ success: true });
        }

        // 获取当前班级的photo_id
        db.get('SELECT id FROM photos WHERE class_id = ?', [classId], (err, photo) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const photoIdToUse = photo ? photo.id : null;

            const insertPromises = names.map(n => {
                return new Promise((resolve, reject) => {
                    db.run('INSERT INTO names (photo_id, class_id, row_index, name_index, name) VALUES (?, ?, ?, ?, ?)',
                        [photoIdToUse, classId, n.row_index, n.name_index, n.name], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                });
            });

            Promise.all(insertPromises).then(() => {
                res.json({ success: true });
            }).catch(err => {
                res.status(500).json({ error: err.message });
            });
        });
    });
});

// API: 保存班级布局参数（独立API，用于立即保存）
app.post('/api/classes/layout', (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ error: '请先登录' });
    }
    
    const { classId, lineHeight, nameSpacing, fontSize, colCount, titleFontSize, titleLetterSpacing, photoOffsetY } = req.body;

    if (!classId) {
        return res.status(400).json({ error: '缺少classId' });
    }

    db.run('UPDATE classes SET line_height = ?, name_spacing = ?, font_size = ?, col_count = ?, title_font_size = ?, title_letter_spacing = ?, photo_offset_y = ? WHERE id = ?', [
        lineHeight !== undefined ? lineHeight : 1.6,
        nameSpacing !== undefined ? nameSpacing : 10,
        fontSize !== undefined ? fontSize : 16,
        colCount !== undefined ? colCount : 15,
        titleFontSize !== undefined ? titleFontSize : 36,
        titleLetterSpacing !== undefined ? titleLetterSpacing : 11,
        photoOffsetY !== undefined ? photoOffsetY : 0,
        classId
    ], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// API: 更新姓名
app.put('/api/names', (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ error: '请先登录' });
    }
    const { names } = req.body;

    if (!names || names.length === 0) {
        return res.json({ success: true });
    }

    const classId = names[0].class_id;

    db.run('DELETE FROM names WHERE class_id = ?', [classId], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // 获取当前班级的photo_id
        db.get('SELECT id FROM photos WHERE class_id = ?', [classId], (err, photo) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const photoIdToUse = photo ? photo.id : null;

            const insertPromises = names.map(n => {
                return new Promise((resolve, reject) => {
                    db.run('INSERT INTO names (photo_id, class_id, row_index, name_index, name) VALUES (?, ?, ?, ?, ?)',
                        [photoIdToUse, classId, n.row_index, n.name_index, n.name], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                });
            });

            Promise.all(insertPromises).then(() => {
                res.json({ success: true });
            }).catch(err => {
                res.status(500).json({ error: err.message });
            });
        });
    });
});

// API: 查看人脸数据（临时调试用）
app.get('/api/faces/debug/:photoId', (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ error: '请先登录' });
    }
    const photoId = req.params.photoId;
    db.all('SELECT * FROM faces WHERE photo_id = ?', [photoId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ count: rows.length, faces: rows });
    });
});

// API: 保存人脸数据
app.post('/api/faces', (req, res) => {
    console.log('\n=== 收到 /api/faces POST 请求 ===');
    console.log('req.session.user:', req.session.user);
    console.log('req.body:', req.body);
    
    if (!req.session.user) {
        console.log('返回 403: 未登录');
        return res.status(403).json({ error: '请先登录' });
    }
    const { photoId, faces } = req.body;
    console.log('photoId:', photoId);
    console.log('faces:', faces);

    console.log('开始执行 DELETE FROM faces WHERE photo_id =', photoId);
    
    db.run('DELETE FROM faces WHERE photo_id = ?', [photoId], function(err) {
        if (err) {
            console.error('删除失败:', err);
            return res.status(500).json({ error: err.message });
        }
        
        console.log('删除成功！this.changes:', this.changes);

        if (!faces || faces.length === 0) {
            console.log('faces 为空，直接返回成功');
            return res.json({ success: true, deletedCount: this.changes });
        }

        console.log('开始插入新的 faces 数据...');
        const insertPromises = faces.map((face, idx) => {
            return new Promise((resolve, reject) => {
                db.run('INSERT INTO faces (photo_id, face_index, x, y, width, height) VALUES (?, ?, ?, ?, ?, ?)',
                    [photoId, idx, face.x, face.y, face.width, face.height], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        });

        Promise.all(insertPromises).then(() => {
            console.log('插入成功，返回成功');
            res.json({ success: true });
        }).catch(err => {
            console.error('插入失败:', err);
            res.status(500).json({ error: err.message });
        });
    });
});

// API: 系统设置 - 获取设置
app.get('/api/settings', (req, res) => {
    if (!req.session.user) {
        return res.status(403).json({ error: '请先登录' });
    }
    db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.json({
                titleTemplate: '十堰市第一中学2026届高三({classNum})班师生毕业合影',
                defaultDate: ''
            });
        }
        res.json({
            titleTemplate: row.title_template || '十堰市第一中学2026届高三({classNum})班师生毕业合影',
            defaultDate: row.default_date || ''
        });
    });
});

// API: 系统设置 - 保存设置
app.post('/api/settings', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    const { titleTemplate, defaultDate } = req.body;

    db.run('INSERT OR REPLACE INTO settings (id, title_template, default_date) VALUES (1, ?, ?)',
        [titleTemplate, defaultDate], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
});

// API: 二维码 - 上传
app.post('/api/qrcode', upload.single('qrfile'), (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    if (!req.file) {
        return res.status(400).json({ error: '请选择文件' });
    }

    const qrDir = path.join(__dirname, 'public');
    const oldQrPath = path.join(qrDir, 'qrcode.png');
    if (fs.existsSync(oldQrPath)) {
        fs.unlinkSync(oldQrPath);
    }

    const newPath = path.join(qrDir, 'qrcode.png');
    fs.renameSync(req.file.path, newPath);

    res.json({ success: true });
});

// API: 二维码 - 检查是否存在
app.get('/api/qrcode/check', (req, res) => {
    const qrPath = path.join(__dirname, 'public', 'qrcode.png');
    res.json({ exists: fs.existsSync(qrPath) });
});

// API: 二维码 - 获取
app.get('/api/qrcode', (req, res) => {
    const qrPath = path.join(__dirname, 'public', 'qrcode.png');
    if (fs.existsSync(qrPath)) {
        res.sendFile(qrPath);
    } else {
        res.status(404).json({ error: '二维码不存在' });
    }
});

// API: 照片 - 通过班级ID上传
app.post('/api/photos/:classId', upload.single('photo'), (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    if (!req.file) {
        return res.status(400).json({ error: '请选择照片文件' });
    }

    const classId = req.params.classId;
    const originalFilename = req.file.originalname;

    db.get('SELECT * FROM classes WHERE id = ?', [classId], (err, cls) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!cls) {
            return res.status(404).json({ error: '班级不存在' });
        }

        db.get('SELECT * FROM photos WHERE class_id = ?', [classId], (err, existingPhoto) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const insertPhoto = () => {
                const filePath = req.file.path.replace(__dirname + '\\public\\', '').replace(__dirname + '/public/', '');
                db.run('INSERT INTO photos (class_id, file_path, filename, line_height, name_spacing, font_size, col_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [classId, filePath, originalFilename, 1.6, 10, 16, 15], (err) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({ success: true });
                    });
            };

            if (existingPhoto) {
                const oldFilePath = path.join(__dirname, 'public', existingPhoto.file_path);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
                db.run('DELETE FROM photos WHERE id = ?', [existingPhoto.id], (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    insertPhoto();
                });
            } else {
                insertPhoto();
            }
        });
    });
});

// API: 照片 - 批量上传
app.post('/api/photos/batch', upload.array('photos'), (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: '无权限' });
    }
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: '请选择照片文件' });
    }

    let successCount = 0;
    let failedCount = 0;
    const promises = [];

    req.files.forEach(file => {
        const promise = new Promise((resolve) => {
            const className = file.originalname.replace(/\.[^/.]+$/, '');

            db.get('SELECT * FROM classes WHERE name LIKE ?', [`%${className}%`], (err, cls) => {
                if (err || !cls) {
                    failedCount++;
                    resolve();
                    return;
                }

                db.get('SELECT * FROM photos WHERE class_id = ?', [cls.id], (err, existingPhoto) => {
                    if (err) {
                        failedCount++;
                        resolve();
                        return;
                    }

                    const insertPhoto = () => {
                        const filePath = file.path.replace(__dirname + '\\public\\', '').replace(__dirname + '/public/', '');
                        db.run('INSERT INTO photos (class_id, file_path, filename, line_height, name_spacing, font_size, col_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [cls.id, filePath, file.originalname, 1.6, 10, 16, 15], (err) => {
                                if (err) {
                                    failedCount++;
                                } else {
                                    successCount++;
                                }
                                resolve();
                            });
                    };

                    if (existingPhoto) {
                        const oldFilePath = path.join(__dirname, 'public', existingPhoto.file_path);
                        if (fs.existsSync(oldFilePath)) {
                            fs.unlinkSync(oldFilePath);
                        }
                        db.run('DELETE FROM photos WHERE id = ?', [existingPhoto.id], (err) => {
                            if (err) {
                                failedCount++;
                                resolve();
                            } else {
                                insertPhoto();
                            }
                        });
                    } else {
                        insertPhoto();
                    }
                });
            });
        });
        promises.push(promise);
    });

    Promise.all(promises).then(() => {
        res.json({ success: successCount, failed: failedCount });
    });
});

// API: 获取照片文件名
app.get('/api/photos/filename/:classId', (req, res) => {
    db.get('SELECT filename FROM photos WHERE class_id = ?', [req.params.classId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ filename: row?.filename || null });
    });
});

// 静态文件服务（放在所有API路由之后）
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/models', express.static(path.join(__dirname, 'public', 'models')));
app.use('/mediapipe', express.static(path.join(__dirname, 'public', 'mediapipe')));
app.use('/scrfd', express.static(path.join(__dirname, 'public', 'scrfd')));

// 启动服务器 - Docker需要监听0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(`毕业合影照片名单校对管理系统`);
    console.log(`服务器运行在: http://0.0.0.0:${PORT}`);
    console.log(`========================================\n`);
    console.log(`默认管理员账号: zgzhbt / 13872765710\n`);
});
