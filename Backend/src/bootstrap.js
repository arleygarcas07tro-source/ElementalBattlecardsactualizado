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
const SequelizeProfileRepository = require('./repositories/SequelizeProfileRepository');
const BcryptPasswordHasher = require('./services/BcryptPasswordHasher');
const JwtTokenService = require('./services/JwtTokenService');
const AuthService = require('./services/AuthService');
const ProfileService = require('./services/ProfileService');
const AuthController = require('./http/controllers/AuthController');
const ProfileController = require('./http/controllers/ProfileController');
const buildAuthRouter = require('./http/routes/authRoutes');
const buildProfileRouter = require('./http/routes/profileRoutes');
const createAuthMiddleware = require('./http/middleware/authMiddleware');
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

  const { authRouter, profileRouter } = buildApiRouters({ config, logger, sequelize, databaseAvailable });

  const app = new AppFactory({ config, logger }).build({ authRouter, profileRouter });

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

function buildApiRouters({ config, logger, sequelize, databaseAvailable }) {
  const disabled = { authRouter: null, profileRouter: null };

  if (!(config.dbEnabled && databaseAvailable)) {
    logger.info('Rutas de autenticación y perfil deshabilitadas (modo LAN)');
    return disabled;
  }

  try {
    const models = buildModels(sequelize);
    const tokenService = new JwtTokenService(config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    const authService = new AuthService({
      userRepository: new SequelizeUserRepository(models.User),
      passwordHasher: new BcryptPasswordHasher(10),
      tokenService,
      logger,
    });
    const authRouter = buildAuthRouter(new AuthController(authService));

    const profileService = new ProfileService({
      profileRepository: new SequelizeProfileRepository(models),
      logger,
    });
    const profileRouter = buildProfileRouter(
      new ProfileController(profileService),
      createAuthMiddleware(tokenService)
    );

    logger.info('Rutas de autenticación y perfil habilitadas');
    return { authRouter, profileRouter };
  } catch (error) {
    logger.warn('No se pudieron cargar las rutas de API:', error.message);
    return disabled;
  }
}

bootstrap();