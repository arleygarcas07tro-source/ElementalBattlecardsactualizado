'use strict';

require('dotenv').config();

const AppComposer = require('./app/AppComposer');
const NetworkInfo = require('./utils/NetworkInfo');

async function bootstrap() {
  const composer = new AppComposer();
  const { server, config, logger } = await composer.build();

  server.listen(config.port, '0.0.0.0', () => {
    new NetworkInfo({ logger }).display(config.port);
  });
}

bootstrap();