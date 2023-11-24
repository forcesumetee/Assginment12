const express = require('express');
const app = express();
const fs = require('fs');
const hostname = 'localhost';
const port = 3001;
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2'); // แก้ที่นี่

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'public/img/');
    },

    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const imageFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "root",
    multipleStatements: true, // เพิ่มบรรทัดนี้
});

con.connect(err => {
    if (err) throw (err);
    else {
        console.log("MySQL connected");
    }
});

const queryDB = (sql) => {
    return new Promise((resolve, reject) => {
      con.query(sql, (err, result, fields) => {
        if (err) reject(err);
        else
          resolve(result)
      })
    })
}

const createUserTable = `
    CREATE TABLE IF NOT EXISTS user (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        avatar VARCHAR(255),
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

const createPostTable = `
    CREATE TABLE IF NOT EXISTS post (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        message TEXT NOT NULL,
        post_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(id)
    );
`;

async function createTables() {
    await queryDB(createUserTable);
    await queryDB(createPostTable);
}

app.post('/regisDB', async (req, res) => {
    let now_date = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const { username, email, password } = req.body;

    const avatarFileName = avatar ? `img/${avatar}` : null;

    const insertUserQuery = `
    INSERT INTO user (username, password, email, avatar)
    VALUES ('${username}', '${password}', '${email}', '${avatarFileName}');
  `;

  try {
    await queryDB(insertUserQuery);
    res.status(200).send("ลงทะเบียนผู้ใช้เรียบร้อย");
  } catch (error) {
    res.status(500).send("เกิดข้อผิดพลาดในการลงทะเบียนผู้ใช้");
  }
});

const upload = multer({ storage: storage, fileFilter: imageFilter });

app.post('/profilepic', upload.single('avatar'), async (req, res) => {
    const { username } = req.body;
    const avatarFileName = req.file ? `img/${req.file.filename}` : null;
    const updateAvatarQuery = `
    UPDATE user
    SET avatar = '${avatarFileName}'
    WHERE username = '${username}';
  `;

  try {
    await queryDB(updateAvatarQuery);
    res.status(200).send("อัปเดตรูปภาพโปรไฟล์เรียบร้อย");
  } catch (error) {
    res.status(500).send("เกิดข้อผิดพลาดในการอัปเดตรูปภาพโปรไฟล์");
  }
});

const updateImg = async (username, filename) => {
    const updateImgQuery = `UPDATE users SET profile_picture = '${filename}' WHERE username = '${username}'`;

    await queryDB(updateImgQuery);
};

app.get('/logout', (req, res) => {
    return res.redirect('login.html');
});

app.get('/readPost', async (req, res) => {
    const readPostQuery = 'SELECT * FROM posts';

    try {
        const posts = await queryDB(readPostQuery);
        res.json(posts);
    } catch (error) {
        console.error('Error during reading posts:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/writePost', async (req, res) => {
    const username = req.cookies.username;
    const message = req.body.message;

    const writePostQuery = `INSERT INTO posts (user, message) VALUES ('${username}', '${message}')`;

    try {
        await queryDB(writePostQuery);
        res.json({ success: true });
    } catch (error) {
        console.error('Error during writing post:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/checkLogin', async (req, res) => {
    const { username, password } = req.body;
    const checkLoginQuery = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
    const avatarFileName = avatar ? `img/${avatar}` : null;
    const insertUserQuery = `
    INSERT INTO user (username, password, email, avatar)
    VALUES ('${username}', '${password}', '${email}', '${avatarFileName}');
  `;

    try {
        const result = await queryDB(checkLoginQuery);

        if (result.length > 0) {
            res.cookie('username', username);
            res.redirect('feed.html');
        } else {
            res.redirect('login.html?error=1');
        }
    } catch (error) {
        console.error('Error during login check:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/register.html`);
});
