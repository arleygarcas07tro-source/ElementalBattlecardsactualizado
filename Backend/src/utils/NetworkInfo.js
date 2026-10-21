'use strict';

const os = require('os');
const ILogger = require('../core/ILogger');

class NetworkInfo {
  constructor({ logger }) {
    ILogger.assert(logger);
    this.logger = logger;
  }

  getAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push({ name, address: iface.address });
        }
      }
    }

    return addresses;
  }

  display(port) {
    const addresses = this.getAddresses();
    const log = (line = '') => this.logger.info(line);

    log();
    log('='.repeat(60));
    log('🌐 SERVIDOR BACKEND INICIADO');
    log('='.repeat(60));
    log();
    log('📍 Direcciones disponibles:');
    log();
    log(`   Local:     http://localhost:${port}`);
    log(`   Local:     http://127.0.0.1:${port}`);

    if (addresses.length > 0) {
      log();
      log('🌍 Red LAN (usa esta IP en otros dispositivos):');
      addresses.forEach((addr) => {
        log(`   ${addr.name.padEnd(20)} http://${addr.address}:${port}`);
      });
    } else {
      log();
      log('⚠️  No se encontraron interfaces de red activas');
    }

    log();
    log('📊 Endpoints disponibles:');
    log(`   Health Check:  http://localhost:${port}/ping`);

    log();
    log('='.repeat(60));
    log('💡 Comparte la dirección de Red LAN con otros jugadores');
    log('='.repeat(60));
    log();
  }
}

module.exports = NetworkInfo;
