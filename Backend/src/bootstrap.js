'use strict';

require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const AppConfig = require('./core/config');
const Logger = require('./core/logger');
const DatabaseFactory = require('./database/DatabaseFactory');
const DatabaseInitializer = require('./database/DatabaseInitializer');
const buildModels = require('./database/models');
const SequelizeUserRepository = require('./repositories/SequelizeUserRepository');
const BcryptPasswordHasher = require('./services/BcryptPasswordHasher');
const JwtTokenService = require('./services/JwtTokenService');
const AuthService = require('./services/AuthService');
const AuthController = require('./http/controllers/AuthController');
const buildAuthRouter = require('./http/routes/authRoutes');
const AppFactory = require('./http/AppFactory');
const InMemoryRoomStore = require('./socketio/InMemoryRoomStore');
const RoomCodeGenerator = require('./socketio/RoomCodeGenerator');
const RoomManager = require('./socketio/RoomManager');
const SocketGateway = require('./socketio/SocketGateway');
const NetworkInfo = require('./utils/NetworkInfo');

async function bootstrap() {
  const config = new AppConfig();
  const logger = new Logger();

  const sequelize = new DatabaseFactory(config).build();

  let databaseAvailable = false;
  try {
    const databaseInitializer = new DatabaseInitializer({
      sequelize,
      logger,
      dbRequireSSL: config.dbRequireSSL,
    });
    await databaseInitializer.connect();
    await databaseInitializer.sync();
    logger.info('✓ Modelos sincronizados con la BD');
    databaseAvailable = true;
  } catch (error) {
    logger.error('No se pudo conectar a la BD:', error.message || error);
    databaseAvailable = false;
  }

  const authRouter = buildAuthRouterIfEnabled({ config, logger, sequelize, databaseAvailable });

  const app = new AppFactory({ config, logger }).build({ authRouter });

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: config.corsOrigin } });

  const roomStore = new InMemoryRoomStore();
  global.activeRooms = roomStore.all();

  const socketGateway = new SocketGateway({
    io,
    roomManager: new RoomManager({
      roomStore,
      codeGenerator: new RoomCodeGenerator(),
      logger,
    }),
    logger,
  });
  socketGateway.registerHandlers();

  server.listen(config.port, '0.0.0.0', () => {
    new NetworkInfo().display(config.port);
  });
}

function buildAuthRouterIfEnabled({ config, logger, sequelize, databaseAvailable }) {
  const authEnabled = config.dbEnabled && databaseAvailable;
  if (!authEnabled) {
    logger.info('Rutas de autenticación deshabilitadas (modo LAN)');
    return null;
  }

  try {
    const models = buildModels(sequelize);
    const userRepository = new SequelizeUserRepository(models.User);
    const authService = new AuthService({
      userRepository,
      passwordHasher: new BcryptPasswordHasher(10),
      tokenService: new JwtTokenService(config.jwtSecret, { expiresIn: config.jwtExpiresIn }),
      logger,
    });
    const authController = new AuthController(authService);
    const router = buildAuthRouter(authController);

    logger.info('Rutas de autenticación habilitadas');
    return router;
  } catch (error) {
    logger.warn('No se pudieron cargar las rutas de autenticación:', error.message);
    return null;
  }
}

bootstrap();