const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-key-in-production';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Ensure directories exist
const dirs = ['./public/media', './data'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Database setup
const db = new sqlite3.Database('./data/site.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

function initDatabase() {
    // Create tables with callbacks to ensure they're created in order
    db.serialize(() => {
        // Create tables
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS about (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            filename TEXT NOT NULL,
            date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            url TEXT NOT NULL,
            icon TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            // After all tables are created, insert default data
            insertDefaultData();
        });
    });
}

function insertDefaultData() {
    // Create default admin user (username: admin, password: changeme)
    const defaultPassword = bcrypt.hashSync('changeme', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, 
        ['admin', defaultPassword],
        (err) => {
            if (!err) {
                console.log('Default admin user created (username: admin, password: changeme)');
                console.log('IMPORTANT: Change the default password immediately!');
            }
        }
    );

    // Insert default about text if none exists
    db.run(`INSERT INTO about (text) 
            SELECT ? WHERE NOT EXISTS (SELECT 1 FROM about)`,
        ['Welcome to my personal website. This space serves as a collection of my thoughts, conversations, and connections.']
    );

    // Insert default links if none exist
    const defaultLinks = [
        { title: 'Podcast', description: 'Gamecraft - Gaming, Esports & VC', url: 'https://www.gamnecraftpod.com', icon: '🎙️', order: 1 },
        { title: 'LinkedIn', description: 'Professional profile and network', url: 'https://www.linkedin.com/in/mitchlasky/', icon: '💼', order: 2 },
        { title: 'Twitter', description: 'Thoughts and commentary', url: 'https://www.x.com/mitchlasky', icon: '𝕏', order: 3 },
        { title: 'Instagram', description: 'Visual stories and moments', url: 'https://www.instagram.com/mitchlasky/', icon: '📷', order: 4 },
        { title: 'Medium', description: 'Long-form writing and essays', url: 'https://medium.com/@mitchlasky', icon: '✍️', order: 5 }
    ];

    db.get('SELECT COUNT(*) as count FROM links', (err, row) => {
        if (!err && row.count === 0) {
            defaultLinks.forEach(link => {
                db.run(`INSERT INTO links (title, description, url, icon, sort_order) VALUES (?, ?, ?, ?, ?)`,
                    [link.title, link.description, link.url, link.icon, link.order]
                );
            });
        }
    });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/media');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB limit
    fileFilter: (req, file, cb) => {
        const allowedExtensions = /\.(mp3|mp4|mov)$/i;
        const allowedMimeTypes = /^(audio\/mpeg|audio\/mp3|video\/mp4|video\/quicktime)$/;
        
        const extname = allowedExtensions.test(file.originalname);
        const mimetype = allowedMimeTypes.test(file.mimetype);
        
        if (extname || mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only MP3, MP4, and MOV files are allowed'));
        }
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// API Routes

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (bcrypt.compareSync(password, user.password)) {
            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// About text
app.get('/api/about', (req, res) => {
    db.get('SELECT text FROM about ORDER BY id DESC LIMIT 1', (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ text: row ? row.text : '' });
    });
});

app.put('/api/about', authenticateToken, (req, res) => {
    const { text } = req.body;
    
    db.run('UPDATE about SET text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM about ORDER BY id DESC LIMIT 1)',
        [text],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update' });
            }
            res.json({ success: true });
        }
    );
});

// Media
app.get('/api/media', (req, res) => {
    db.all('SELECT * FROM media ORDER BY date DESC, created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows || []);
    });
});

app.post('/api/media', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or invalid file type' });
    }
    
    const { title, description, date } = req.body;
    const filename = req.file.filename;

    db.run('INSERT INTO media (title, description, filename, date) VALUES (?, ?, ?, ?)',
        [title, description, filename, date],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to save media' });
            }
            res.json({ id: this.lastID, success: true });
        }
    );
});

app.delete('/api/media/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    // Get filename before deleting
    db.get('SELECT filename FROM media WHERE id = ?', [id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Media not found' });
        }

        // Delete file
        const filePath = path.join('./public/media', row.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete database record
        db.run('DELETE FROM media WHERE id = ?', [id], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete' });
            }
            res.json({ success: true });
        });
    });
});

// Links
app.get('/api/links', (req, res) => {
    db.all('SELECT * FROM links ORDER BY sort_order ASC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows || []);
    });
});

app.post('/api/links', authenticateToken, (req, res) => {
    const { title, description, url, icon } = req.body;

    db.run('INSERT INTO links (title, description, url, icon) VALUES (?, ?, ?, ?)',
        [title, description, url, icon || '🔗'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to add link' });
            }
            res.json({ id: this.lastID, success: true });
        }
    );
});

app.delete('/api/links/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM links WHERE id = ?', [id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete' });
        }
        res.json({ success: true });
    });
});

// Serve admin pages
app.use('/admin', express.static('admin'));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Website: http://localhost:${PORT}`);
    console.log(`Admin: http://localhost:${PORT}/admin/login.html`);
});

module.exports = app;
