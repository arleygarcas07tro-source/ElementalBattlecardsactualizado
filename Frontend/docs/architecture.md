# Arquitectura del Frontend

El frontend es una app Phaser 3 (Vite, ESM). Sigue una separación por capas que
aísla la lógica de negocio de la presentación y de la red.

## Capas

```
src/
  main.js                 Punto de entrada: crea el Phaser.Game y registra escenas.
  app/GameComposer.js     Composition root: crea y valida los colaboradores.
  core/assertContract.js  Fail-fast de contratos (duck typing documentado).
  game/                   Dominio puro (sin Phaser, sin red).
  game/contracts/         Interfaces JSDoc (IGameMatch, IBotAI, ISyncGateway).
  game_objects/           Objetos del juego que sí tocan Phaser (Card) o estado simple (Deck).
  helpers/                Utilidades transversales (constants, combat, cardFx, audioManager).
  scenes/                 Presentación/coordinación (Phaser.Scene).
  utils/                  Infraestructura sin dominio (eventBus, idGenerator).
test/                     Pruebas de dominio con node:test.
```

## Regla de dependencias

- `game/` no importa Phaser ni `socket.io-client` ni escenas.
- `scenes/` coordina presentación y delega reglas en `game/`.
- La red se encapsula en `game/LANClient.js` (protocolo) y
  `game/LANEventRouter.js` (traducción evento remoto → comando de dominio + efectos).
- Todo colaborador se construye en `app/GameComposer.js` y se valida con
  `assertContract`.

## Módulos de dominio

| Módulo | Responsabilidad |
| --- | --- |
| `GameMatch` | Motor de partida: orquesta turnos, ataques, esencias y victoria. |
| `TurnManager` | Estado del flujo de turnos, inactividad y ataques obligatorios. |
| `VictoryEvaluator` | Reglas puras de victoria (inactividad y 6 esencias). |
| `ConvergenceService` | Consulta pura de convergencia por 6 tipos. |
| `Battlefield` | Slots del campo como estado encapsulado. |
| `CardEntity` | Construcción/validación de datos de carta (instanceId, fusión). |
| `CardDestructionService` | Descomposición de cartas al cementerio por nivel. |
| `EssencePowerService` | Catálogo y validación de poderes de esencia. |
| `LevelAttackRule` | Restricciones de ataque por nivel (descanso/bloqueo). |
| `BotAI` | Plan de acción del oponente según dificultad. |
| `LANClient` | Protocolo socket.io (serialización, ecos, turnos). |
| `LANEventRouter` | Traducción de eventos remotos a mutaciones de modelo y efectos. |

## Pruebas

`npm test` ejecuta `node --test` sobre `test/`. La cobertura se centra en el
dominio puro (no requiere navegador). `npm run lint` aplica ESLint.

## Deuda técnica conocida

- `GameScene.js` es un objeto extenso (presentación + coordinación); el objetivo
  es extraer `GameController` y `BoardRenderer`.
- El motor `Phaser` se usa como global; los imports explícitos están pendientes.
- Algunas escenas de presentación usan alias de tipo (`aire/tierra/oscuridad`)
  distintos a los del dominio (`planta/sombra/espiritu`); son solo etiquetas de UI.
