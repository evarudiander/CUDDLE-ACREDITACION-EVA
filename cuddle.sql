CREATE DATABASE  cuddle_db;
USE cuddle_db;

CREATE TABLE IF NOT EXISTS servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS consultas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NULL,
    asunto VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) DEFAULT 'admin'
);

INSERT INTO usuarios (usuario, password_hash, rol)
VALUES (
  'admin',
  '$2b$10$8CsQnB1J9FfMEw3tpwjlvODxWGxlNjahHs6YfQfYTLuM20MDLAZV6',
  'admin'
)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  rol = VALUES(rol);

INSERT INTO usuarios (usuario, password_hash, rol)
SELECT 'admin', '$2b$10$L1KKVqvba36Ekmzibr.GuexaVaiJCCRvxm1Y/JkOfPRvHrWfH.Yu6', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'admin');

INSERT INTO servicios (titulo, descripcion)
SELECT 'Soporte Técnico & Redes', 'Mantenimiento preventivo, diagnóstico de hardware y configuración de conexiones Wi-Fi estables y seguras.'
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE titulo = 'Soporte Técnico & Redes');

INSERT INTO servicios (titulo, descripcion)
SELECT 'Accesibilidad Digital y Ergonomía', 'Configuración del sistema operativo con fuentes ampliadas, colores nítidos y adaptación ergonómica de puestos de trabajo.'
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE titulo = 'Accesibilidad Digital y Ergonomía');

INSERT INTO servicios (titulo, descripcion)
SELECT 'Capacitación en Interfaz y Periféricos', 'Enseñanza práctica sobre manejo del mouse, teclado, impresoras, ventanas y carpetas sin frustración.'
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE titulo = 'Capacitación en Interfaz y Periféricos');

INSERT INTO servicios (titulo, descripcion)
SELECT 'Trámites Digitales y Recreación', 'Asistencia para la obtención de turnos médicos, trámites bancarios, lectura de periódicos y conexión con familiares.'
WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE titulo = 'Trámites Digitales y Recreación');


