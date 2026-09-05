require('dotenv').config(); // Cargar las variables de entorno desde el archivo .env

const fs = require('fs');
const path = require('path');

// Cargar el archivo de configuración JSON
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// Reemplazar las variables de entorno en la configuración
const dbConfig = {
    development: {
        ...config.development,
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
    },
    test: {
        ...config.test,
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
    },
    production: {
        ...config.production,
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
    }
};

module.exports = dbConfig;
