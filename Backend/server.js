require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');

// Importar módulos
const db = require('./controllers/config/db'); // ahora importamos el objeto
const models = require('./models'); // Importar modelos
const socketManager = require('./socketManager');
const { displayNetworkInfo } = require('./show-network-info');

const app = express();
const PORT = process.env.PORT || 3001;

const startServer = async () => {
    // Conectar a la base de datos
    let sequelize;
    try {
        if (typeof db.connectDB === 'function') {
            sequelize = await db.connectDB();
        } else if (db.sequelize) {
            sequelize = db.sequelize;
            await sequelize.authenticate();
            console.log('DB conectado y SSL:', !!process.env.DB_REQUIRE_SSL);
        } else {
            console.log('No hay configuración de base de datos disponible');
        }

        // Sincronizar modelos con la base de datos
        if (sequelize) {
            await sequelize.sync({ alter: true });
            console.log('✓ Modelos sincronizados con la BD');
        }
    } catch (err) {
        console.error('No se pudo conectar a la BD:', err.message || err);
        sequelize = null;
    }

    // Middleware
    app.use(cors());
    app.use(bodyParser.json());

    // Rutas de autenticación
    const dbEnabled = (process.env.DB_ENABLED || 'false').toLowerCase() === 'true';
    if (dbEnabled && sequelize) {
        try {
            const authRoutes = require('./routes/authRoutes');
            app.use('/api/auth', authRoutes);
            console.log('Rutas de autenticación habilitadas');
        } catch (err) {
            console.warn('No se pudieron cargar las rutas de autenticación:', err.message);
        }
    } else {
        console.log('Rutas de autenticación deshabilitadas (modo LAN)');
    }

    // Health check
    app.get('/ping', (req, res) => {
        res.json({ ok: true, time: Date.now(), host: req.hostname });
    });

    // Crear el servidor y inicializar socket.io
    const server = http.createServer(app);
    const { Server } = require('socket.io');
    const io = new Server(server, { cors: { origin: '*' } });

    socketManager(io);

    server.listen(PORT, '0.0.0.0', () => {
        displayNetworkInfo(PORT);
    });
};

// Iniciar servidor
startServer();
