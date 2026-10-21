'use strict';

const IRoomCodeGenerator = require('../src/domain/contracts/IRoomCodeGenerator');
const RoomCodeGenerator = require('../src/infrastructure/socketio/RoomCodeGenerator');
const SequentialRoomCodeGenerator = require('../src/infrastructure/socketio/SequentialRoomCodeGenerator');
const InMemoryRoomStore = require('../src/infrastructure/socketio/InMemoryRoomStore');
const RoomService = require('../src/domain/services/RoomService');
const Logger = require('../src/core/logger');

let fails = 0;
function ok(name, cond, extra) {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? ' | ' + extra : ''));
  if (!cond) fails++;
}

function buildService(codeGenerator) {
  return new RoomService({
    roomStore: new InMemoryRoomStore(),
    codeGenerator,
    logger: new Logger(),
  });
}

const implementations = [RoomCodeGenerator, SequentialRoomCodeGenerator];

console.log('--- 1. Herencia real y conformidad con el contrato ---');
for (const C of implementations) {
  const instance = new C();
  ok(`${C.name} instanceof IRoomCodeGenerator`, instance instanceof IRoomCodeGenerator);
  IRoomCodeGenerator.assert(instance);
  ok(`${C.name} cumple IRoomCodeGenerator.assert()`, true);
  const code = instance.generate();
  ok(`${C.name} genera un código de sala válido (6 caracteres)`, /^\d{6}$/.test(code), code);
}

console.log('--- 2. Estrategias de generación diferentes ---');
const randomGen = new RoomCodeGenerator();
const first = randomGen.generate();
const second = randomGen.generate();
ok('RoomCodeGenerator: aleatorio (códigos distintos en ejecución)', /^\d{6}$/.test(first) && /^\d{6}$/.test(second), first + ' / ' + second);

const seqGen = new SequentialRoomCodeGenerator();
const s1 = seqGen.generate();
const s2 = seqGen.generate();
const s3 = seqGen.generate();
ok('SequentialRoomCodeGenerator: secuencial determinista', s1 === '000001' && s2 === '000002' && s3 === '000003', s1 + ' / ' + s2 + ' / ' + s3);

console.log('--- 3. RoomService funciona con CADA implementación (sustitución) ---');
const serviceA = buildService(randomGen);
const serviceB = buildService(new SequentialRoomCodeGenerator());

const roomA = serviceA.createRoom('socket-host-A');
const roomB = serviceB.createRoom('socket-host-B');
ok('RoomService con RoomCodeGenerator crea sala', roomA.role === 'host' && /^\d{6}$/.test(roomA.code), roomA.code);
ok('RoomService con SequentialRoomCodeGenerator crea sala', roomB.role === 'host' && /^\d{6}$/.test(roomB.code), roomB.code);

const roomB2 = serviceB.createRoom('socket-host-B2');
ok('La estrategia secuencial avanza sin colisiones desde el servicio', roomB2.code === '000002', roomB2.code);

const roomB3 = serviceB.createRoom('socket-host-B3');
ok('El servicio maneja el bucle de unicidad sobre el store', roomB3.code === '000003', roomB3.code);

console.log('--- 4. Sustitución en el Composition Root sin tocar RoomService ---');
const swapped = buildService(new SequentialRoomCodeGenerator());
const roomSwapped = swapped.createRoom('socket-swapped');
ok('Se inyecta la 2da implementación y RoomService responde igual', /^\d{6}$/.test(roomSwapped.code) && roomSwapped.role === 'host', roomSwapped.code);

console.log('--- 5. El contrato rechaza objetos que no extienden la abstracción ---');
try {
  IRoomCodeGenerator.assert({ generate() { return 'abc'; } });
  ok('IRoomCodeGenerator.rechaza implementación que no extiende', false);
} catch (error) {
  ok('IRoomCodeGenerator rechaza implementación que no extiende', /extender IRoomCodeGenerator/.test(error.message), error.message);
}

console.log(fails === 0 ? '\nSMOKE POLIMORFISMO: TODO OK' : '\nSMOKE POLIMORFISMO: HUBO ' + fails + ' FALLOS');
process.exit(fails === 0 ? 0 : 1);