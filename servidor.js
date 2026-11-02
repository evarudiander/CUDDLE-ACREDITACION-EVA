const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cuddle-secret';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'cuddle_db'
});

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
    req.usuario = decoded;
    next();
  });
};

function crearUsuarioAdminSiNoExiste() {
  const crearTablaSql = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      rol VARCHAR(20) DEFAULT 'admin'
    )
  `;

  db.query(crearTablaSql, (err) => {
    if (err) {
      console.error('Error al crear la tabla usuarios:', err.message);
      return;
    }

    const usuario = 'admin';
    const passwordHash = bcrypt.hashSync('admin123', 10);
    const verificarSql = 'SELECT id FROM usuarios WHERE usuario = ?';

    db.query(verificarSql, [usuario], (verificarErr, results) => {
      if (verificarErr) {
        console.error('Error al verificar el usuario admin:', verificarErr.message);
        return;
      }

      if (results.length > 0) {
        return;
      }

      const insertarSql = 'INSERT INTO usuarios (usuario, password_hash, rol) VALUES (?, ?, ?)';
      db.query(insertarSql, [usuario, passwordHash, 'admin'], (insertErr) => {
        if (insertErr) {
          console.error('Error al crear el usuario admin:', insertErr.message);
        } else {
          console.log('Usuario administrador creado: admin / admin123');
        }
      });
    });
  });
}

db.connect((err) => {
  if (err) {
    console.error('Error al conectar con MySQL:', err.message);
  } else {
    console.log('Conexión exitosa a MySQL');
    crearUsuarioAdminSiNoExiste();
  }
});

app.get('/api/servicios', (req, res) => {
  const sql = 'SELECT * FROM servicios ORDER BY id ASC';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar servicios.' });
    }
    res.json(results);
  });
});

app.post('/api/consultas', (req, res) => {
  const { nombre, email, telefono, asunto, mensaje, servicio_id } = req.body;

  if (!nombre || !email || !asunto || !mensaje) {
    return res.status(400).json({ error: 'Completa los campos obligatorios.' });
  }

  const sql = `
    INSERT INTO consultas (nombre, email, telefono, asunto, mensaje, servicio_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [nombre, email, telefono || null, asunto, mensaje, servicio_id || null], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error al guardar la consulta.' });
    }
    res.status(201).json({
      mensaje: 'Consulta enviada correctamente.',
      id: result.insertId
    });
  });
});

app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });
  }

  const sql = 'SELECT * FROM usuarios WHERE usuario = ?';
  db.query(sql, [usuario], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar usuario.' });
    }
    if (results.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const usuarioBD = results[0];
    const passwordHash = usuarioBD.password_hash || usuarioBD.password;

    if (!passwordHash) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    bcrypt.compare(password, passwordHash, (compareErr, coincide) => {
      if (compareErr || !coincide) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
      }

      const token = jwt.sign(
        { id: usuarioBD.id, usuario: usuarioBD.usuario, rol: usuarioBD.rol },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        mensaje: 'Login correcto.',
        token,
        usuario: usuarioBD.usuario
      });
    });
  });
});

app.get('/api/consultas', verificarToken, (req, res) => {
  const sql = `
    SELECT c.id, c.nombre, c.email, c.telefono, c.asunto, c.mensaje, c.leida, c.fecha, s.titulo AS servicio
    FROM consultas c
    LEFT JOIN servicios s ON c.servicio_id = s.id
    ORDER BY c.fecha DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener consultas.' });
    }
    res.json(results);
  });
});

app.get('/api/consultas/:id', verificarToken, (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT c.*, s.titulo AS servicio
    FROM consultas c
    LEFT JOIN servicios s ON c.servicio_id = s.id
    WHERE c.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar la consulta.' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Consulta no encontrada.' });
    }
    res.json(results[0]);
  });
});

app.put('/api/consultas/:id/estado', verificarToken, (req, res) => {
  const { id } = req.params;
  const { leida } = req.body;

  const sql = 'UPDATE consultas SET leida = ? WHERE id = ?';

  db.query(sql, [leida, id], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al actualizar estado.' });
    }
    res.json({ mensaje: 'Estado actualizado correctamente.' });
  });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.use((req, res) => {
  if (req.path === '/admin') {
    return res.sendFile(path.join(__dirname, 'admin.html'));
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor de CUDDLE activo en http://localhost:3000`);
});

