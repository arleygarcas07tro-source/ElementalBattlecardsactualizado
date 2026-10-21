# UML de Clases — Frontend (Elemental Battlecards)

> Diagrama generado únicamente a partir de las clases y relaciones que existen hoy en `Frontend/src`.
> No se modificó ningún archivo de código.
> Solo se representan **clases reales**: los módulos función/constante (como `assertContract`, `resolveCombat`, `card-definitions` o `constants`) no se dibujan como clases; se marcan y explican aparte.

## Leyenda de relaciones

| Símbolo | Significado |
|---|---|
| `--|>` | Herencia (`extends`) |
| `..|>` | Realización conceptual de un contrato (validada por duck-typing en `assertContract`) |
| `*--` | Composición (la clase posee y crea la instancia) |
| `o--` | Agregación / posesión débil |
| `..>` | Dependencia («usa») |

```mermaid
classDiagram
    direction TB

    %% ===================== 1. CORE / CONTRATOS =====================
    namespace CORE {
        class AssertContract["assertContract (función, NO es clase)"] {
            <<función>>
            +assertContract(implementation, methods, owner) : void
        }

        class IGameMatch {
            <<contrato>>
            +METHODS : string[]
            +assert(implementation) : void
        }

        class IBotAI {
            <<contrato>>
            +METHODS : string[]
            +assert(implementation) : void
        }

        class ISyncGateway {
            <<contrato>>
            +METHODS : string[]
            +assert(implementation) : void
        }

        IGameMatch ..> AssertContract : "usa"
        IBotAI ..> AssertContract : "usa"
        ISyncGateway ..> AssertContract : "usa"
    }

    %% ===================== 2. GAME DOMAIN =====================
    namespace GAMEDOMAIN {
        class EventBus {
            -_listeners : Map
            +on(event, handler) : Function
            +off(event, handler) : void
            +emit(event, ...args) : boolean
            +removeAllListeners() : void
        }

        class GameMatch {
            +config : object
            +events : EventBus
            +player : Player
            +opponent : Player
            +turn : TurnManager
            +playerOf(id) : Player
            +reset() : void
            +startPlayerTurn() : result
            +startOpponentTurn() : result
            +syncConvergence() : void
            +checkVictoryConditions() : string|null
            +useEssencePower(essenceType) : result
            +resolvePlayerAttack(params) : result|null
            +markPlayerAttackConsumed() : void
            -_emitConvergenceStatus() : void
        }

        class Player {
            +id : string
            +deck : Deck
            +essences : EssenceManager
            +hand : object[]
            +field : Battlefield
            +graveyard : object[]
            +turnsWithoutAttacking : number
            +drawInitialHand() : void
            +drawCard() : object|null
            +refillDeckFromGraveyard() : void
            +playCardFromHand(instanceId, fieldIndex) : object|null
            +fuseCards(draggedIndex, targetIndex) : result|null
            +fuseFromHand(instanceId, targetIndex) : object|null
            +fillEssence(essenceType) : boolean
            +addCardDataToGraveyard(cardData) : void
        }

        class Deck {
            +ownerId : string
            +cards : object[]
            +createInitialDeck() : object[]
            +shuffle(deck) : object[]
            +draw() : object|undefined
            +getCardsCount() : number
        }

        class EssenceManager {
            -_essences : object
            +activate(type) : void
            +has(type) : boolean
            +getAll() : object
            +size : number
        }

        class Battlefield {
            -_slots : array
            +size : number
            +get(index) : object|undefined
            +set(index, card) : void
            +clearAt(index) : void
            +isEmpty(index) : boolean
            +hasAny() : boolean
            +count() : number
            +cards() : object[]
            +types() : Set
            +emptyIndices() : number[]
            +findIndexByCard(instanceId) : number
            +snapshot() : array
        }

        class CardEntity {
            <<static>>
            +create(definition, opts) : object|null
            +ensureInstance(cardData) : object|null
            +fused(baseCard) : object|null
            +areFusionable(a, b) : boolean
        }

        class TurnManager {
            +state : string
            +playerHasActed : boolean
            +playerTurnNumber : number
            +blockingAnimations : number
            +pendingTurnChange : string|null
            +playerConvergenceArmed : boolean
            +opponentConvergenceArmed : boolean
            +opponentConvergenceBlocked : boolean
            +reset() : void
            +beginPlayerTurn() : result
            +beginOpponentTurn() : result
            +beginOpponentWait() : string
            +requestTurnEnd(nextTurn) : boolean
            +finishPlayerTurn() : result
            +finishOpponentTurn(opponentActed) : result
            +finishForcedAttackSkip() : result
            +onBlockingAnimationStarted() : number
            +onBlockingAnimationCompleted() : string|null
        }

        class BotAI {
            +difficulty : number
            -_delay : number
            -_scoreModifier : number
            +setDifficulty(difficulty) : void
            +shouldAttemptFusion() : boolean
            +getAttackThreshold() : number
            +computeActionDelay() : number
            +computeScoreModifier() : number
            +actionDelay : number
            +scoreModifier : number
            +refreshActionDelay() : void
            +refreshScoreModifier() : void
            +findBestAttack(opponentAttackers, revealedDefenders) : attack|null
            +findBestFusion(opponentField, opponentHand) : fusion|null
            +decideAction(opts) : plan
        }

        class VictoryEvaluator {
            <<static>>
            +evaluate(ctx) : {winner, reason, log}
        }

        class EssencePowerService {
            <<static>>
            +POWERS : object
            +getInfo(type) : info|null
            +plan(type, ctx) : result
            +rescueGraveyardCard(player) : object|null
            +stealHighestCard(opponent) : object|null
        }

        class Poder {
            <<base>>
            +type : string
            +canUse(ctx) : result
            +execute(_ctx) : string[]
        }

        class PoderesRegistry {
            <<static>>
            +all : Poder[]
            +get(essenceType) : Poder|null
        }

        class Rafaga {
            +execute(ctx) : string[]
        }

        class Rescate {
            +execute(ctx) : string[]
        }

        class Brotar {
            +execute(ctx) : string[]
        }

        class Clarividencia {
            +execute() : string[]
        }

        class Robar {
            +execute(ctx) : string[]
        }

        class Conducto {
            +execute(ctx) : string[]
        }

        class ConvergenceService {
            <<static>>
            +isConverged(fieldTypes, required) : boolean
            +missingCount(fieldTypes, required) : number
        }

        class CardDestructionService {
            <<static>>
            +graveyardEntries(cardData) : object[]
        }

        class LANClient {
            +socket : object
            +playerRole : string|null
            +onGameEvent(handler) : void
            +onTurnChanged(handler) : void
            +emitGameEvent(payload) : boolean
            +emitEndTurn() : boolean
        }

        class LANEventRouter {
            +match : GameMatch
            +playerRole : string|null
            +debug : boolean
            +route(payload) : object|null
            -_routeByType(payload, isRemotePlayer, isOpponentAction) : object|null
        }

        GameMatch *-- "2" Player : "posee player/opponent"
        GameMatch o-- TurnManager : "posee turn"
        GameMatch o-- EventBus : "events"
        GameMatch ..> VictoryEvaluator : "delega victoria"
        GameMatch ..> ConvergenceService : "consulta convergencia"
        GameMatch ..> PoderesRegistry : "obtiene poder (OCP)"
        GameMatch ..|> IGameMatch : "satisface (IGameMatch.assert)"

        Player *-- Deck
        Player *-- EssenceManager
        Player *-- Battlefield
        Player ..> CardEntity : "estático (robo/fusión)"
        Player ..> CardDestructionService : "estático (cementerio)"

        EssencePowerService ..> CardEntity : "estático (crear instancias)"

        Poder ..> EssencePowerService : "delega validación"
        Rafaga --|> Poder : "hereda"
        Rescate --|> Poder : "hereda"
        Brotar --|> Poder : "hereda"
        Clarividencia --|> Poder : "hereda"
        Robar --|> Poder : "hereda"
        Conducto --|> Poder : "hereda"
        Rescate ..> EssencePowerService : "ejecuta efecto"
        Robar ..> EssencePowerService : "ejecuta efecto"
        Brotar ..> Player : "ctx.player.drawCard()"
        PoderesRegistry *-- Poder : "registra 6 instancias"

        BotAI ..|> IBotAI : "satisface (IBotAI.assert)"
        LANClient ..|> ISyncGateway : "satisface (ISyncGateway.assert)"
        LANEventRouter ..> GameMatch : "muta modelo (DI)"     
    }

    %% ===================== 3. PRESENTATION / GAME =====================
    namespace PRESENTATION {
        class GameScene {
            +match : GameMatch
            +turn : TurnManager
            +bot : BotAI
            +ctx : object
            +isLAN : boolean
            +socket : object|null
            +playerRole : string|null
            +init(data) : void
            +preload() : void
            +create() : void
            +update() : void
        }

        class GameSceneLAN {
            +socket : object|null
            +roomCode : string|null
            +playerRole : string|null
            +init(data) : void
            +create() : void
        }

        class UIScene {
            +init(data) : void
            +create() : void
        }

        class BoardRenderer {
            +ctx : object
            +scene : Phaser.Scene
            +cardHandSize : {width,height}
            +cardFieldSize : {width,height}
            +fx : object
            +createFieldDecor() : void
            +createSlotsRow(y, name, numSlots) : void
            +createCardsRow(y, name, hand) : void
            +createPlayerCard(x, y, cardData) : Card
            +createOpponentCard(x, y, cardData) : Card
            +createFieldCard(slotObj, cardData, options) : Card
            +createFieldCardAt(x, y, cardData, options) : Card
            +createDecks(playerCount, opponentCount) : void
            +updateDeckCounts(pc, oc) : void
            +refreshPlayerHand(hand) : void
            +refreshOpponentHand(hand) : void
            +revealPlayerCard(cardObject) : void
            +revealOpponentCard(cardObject) : void
            +revealOpponentHandForTurn() : void
            +findCardObjectOnField(fieldIndex) : Card|null
            +playFusion(params, onComplete) : void
            +playFireworks(x, y, type) : void
            +playImpact(x, y, color) : void
            +playDeath(cardObject, cardData, onComplete) : void
            +typeColor(type) : number
        }

        class CardInteraction {
            +ctx : object
            +scene : Phaser.Scene
            +selectedCard : object|null
            +onCardClicked(clickedCard) : void
            +onSlotClicked(clickedSlot) : void
            +onOpponentSlotClicked(clickedSlot) : void
            +selectCard(cardObject) : void
            +deselectCard(animate) : void
            +handlePlayCard(cardObject, dropZone) : void
            +attemptToFuse(selected, target) : void
            +attemptToFuseFromHand(handCard, fieldCard) : void
            +refreshCardTurnMetadata(cardObject, ownerType) : void
            +preparePlayerFieldForTurn() : void
            +prepareOpponentFieldForTurn() : void
            +registerCardAttack(cardObject, ownerType) : void
        }

        class AttackController {
            +ctx : object
            +scene : Phaser.Scene
            +handleAttack(attackingCard, defendingCard) : void
            +handleDirectAttack(attackingCard) : void
            +animateAttack(attackingCard, target, result) : void
        }

        class BotTurnRunner {
            +ctx : object
            +scene : Phaser.Scene
            +run() : void
            +buildContext() : object
            +executePlan(plan) : boolean
            +findOpponentCardObject(fieldIndex) : object|null
            +findPlayerCardObject(fieldIndex) : object|null
            +executeFusion(plan) : boolean
            +executeAttack(plan) : boolean
            +executeDirectAttack(plan) : boolean
            +executePlayCard(plan) : boolean
        }

        class RemoteEffectApplier {
            +ctx : object
            +scene : Phaser.Scene
            +handle(payload) : void
            +applyEffect(effect) : void
        }

        class TurnController {
            +ctx : object
            +scene : Phaser.Scene
            +turnTimer : object|null
            -_pendingDestroys : Set
            +beginMatch() : void
            +startPlayerTurn() : void
            +startOpponentTurn() : void
            +handleTurnChanged(data) : void
            +endPlayerTurn(forcedAttackSkip) : void
            +endOpponentTurn(opponentActed) : void
            +update() : void
            +checkVictoryConditions() : string|null
            +useEssencePower(essenceType) : void
            +endGame(winner) : void
            +destroyCard(owner, fieldIndex, instanceId) : void
            +animationComplete() : void
            +destroyTimer() : void
        }

        GameScene --|> PhaserScene : "hereda"
        GameScene *-- BoardRenderer : "construye en create()"
        GameScene *-- CardInteraction
        GameScene *-- AttackController
        GameScene *-- BotTurnRunner
        GameScene *-- RemoteEffectApplier
        GameScene *-- TurnController
        GameScene ..> GameComposer : "composition root"
        GameScene ..> GameMatch : "referencia el motor"
        GameScene ..> BotAI : "bot (via GameComposer)"
        GameScene ..> LANClient : "lan (solo modo LAN)"
        GameScene ..> LANEventRouter : "lanRouter (solo modo LAN)"

        GameSceneLAN --|> PhaserScene : "hereda"
        GameSceneLAN ..> GameScene : "lanza con socket/roomCode"
        UIScene --|> PhaserScene : "hereda"

        BoardRenderer ..> Card : "crea sprites de carta"
        CardInteraction ..> BoardRenderer : "usa (via ctx)"
        CardInteraction ..> TurnController : "endPlayerTurn()/animationComplete()"
        CardInteraction ..> LevelAttackRule : "regla estática de restricción por nivel"
        AttackController ..> GameMatch : "resolvePlayerAttack/markPlayerAttackConsumed"
        BotTurnRunner ..> BotAI : "decideAction()/refresh*()"
        BotTurnRunner ..> BoardRenderer : "anima (via ctx)"
        RemoteEffectApplier ..> LANEventRouter : "ctx.lanRouter.route()"
        RemoteEffectApplier ..> BoardRenderer : "aplica efectos visuales"
        TurnController ..> GameMatch : "checkVictoryConditions()/useEssencePower()"
        TurnController ..> BoardRenderer : "destroyCard()/refreshUI"
    }

    %% ===================== 4. COMPOSITION =====================
    namespace COMPOSITION {
        class GameComposer {
            <<composition root>>
            +createMatch(config) : GameMatch
            +createBot(difficulty) : BotAI
            +createLanStack(socket, playerRole, match, debug) : {client, router}
        }

        GameComposer ..> GameMatch : "createMatch()"
        GameComposer ..> TurnManager : "crea e inyecta como turn"
        GameComposer ..> BotAI : "createBot()"
        GameComposer ..> LANClient : "createLanStack()"
        GameComposer ..> LANEventRouter : "createLanStack()"
        GameComposer ..> IGameMatch : "valida (fail-fast)"
        GameComposer ..> IBotAI : "valida (fail-fast)"
        GameComposer ..> ISyncGateway : "valida (fail-fast)"
    }

    %% ===================== 5. PHASER =====================
    namespace PHASER {
        class PhaserScene["Phaser.Scene"] {
            <<externo>>
        }

        class PhaserSprite["Phaser.GameObjects.Sprite"] {
            <<externo>>
        }

        class Card {
            +cardData : object
            +type : string
            +level : number
            +isFaceDown : boolean
            +reveal() : void
            +levelUp() : void
        }

        Card --|> PhaserSprite : "hereda (card.js)"
    }
```

---

## Mapa de áreas → archivos reales

| Área | Clases | Origen |
|---|---|---|
| CORE / CONTRATOS | `IGameMatch`, `IBotAI`, `ISyncGateway` | `src/game/contracts/*.js` |
| CORE / CONTRATOS | `assertContract` (función) | `src/core/assertContract.js` |
| GAME DOMAIN | `GameMatch`, `TurnManager`, `BotAI`, `VictoryEvaluator`, `EssencePowerService`, `ConvergenceService`, `CardDestructionService`, `LevelAttackRule`, `CardEntity` | `src/game/*.js` |
| GAME DOMAIN | `Poder`, `PoderesRegistry`, `Rafaga`, `Rescate`, `Brotar`, `Clarividencia`, `Robar`, `Conducto` | `src/game/powers/*.js` |
| GAME DOMAIN | `Player`, `Deck`, `EssenceManager`, `Battlefield` | `src/game_objects/*.js` |
| GAME DOMAIN (red) | `LANClient`, `LANEventRouter` | `src/game/*.js` |
| PRESENTATION / GAME | `GameScene`, `GameSceneLAN`, `UIScene` | `src/scenes/*.js` |
| PRESENTATION / GAME | `BoardRenderer`, `CardInteraction`, `AttackController`, `BotTurnRunner`, `RemoteEffectApplier`, `TurnController` | `src/presentation/*.js` |
| COMPOSITION | `GameComposer` | `src/app/GameComposer.js` |
| PHASER | `Card` | `src/game_objects/card.js` |

## Notas de fidelidad (qué no se dibuja como clase y por qué)

- **`assertContract`** es `export function` (`core/assertContract.js:9`). Se muestra con estereotipo `«función»` para que se vea que los tres contratos dependen de ella, sin fingir que es una clase.
- **Contratos `IGameMatch` / `IBotAI` / `ISyncGateway`**: en JS son clases con `static METHODS` y `static assert()` que comprueban por duck-typing. No existen `interface` ES; la flecha `..|>` es **conceptual** (validada en `GameComposer` vía `IGameMatch.assert(match)`, `IBotAI.assert(bot)`, `ISyncGateway.assert(client)`).
- **`GameComposer`** es *composition root*: crea `GameMatch` (+ `TurnManager` inyectado), `BotAI` y la pila LAN (`LANClient` + `LANEventRouter`), y valida los contratos antes de devolverlos (`app/GameComposer.js:25-58`).
- **Objeto `ctx`**: no es una clase. Es un objeto compartido de 18 campos construido en `GameScene.create()` (`scenes/GameScene.js:149-169`). Todas las clases de presentación lo reciben por constructor (DI por objeto de contexto).
- **Helpers que son funciones/constantes** (no clases) y por eso no son cajas: `resolveCombat` (`helpers/combat.js`), `cardFx`/`zone`/`audioManager`/`playerProgress` (`helpers/`), `GAME_CONFIG`/`CARD_TYPES` (`helpers/constants.js`), `CardDefinitions` (`game_objects/card-definitions.js`) y `newId` (`utils/idGenerator.js`). Se referencian desde el código pero no se modelan.
- **`EventBus`** sí es clase (`utils/eventBus.js`), pero **no se convierte el objeto `ctx` en clase**: solo se muestra que `GameMatch` lo compone.
- **Scenes**: `main.js` registra 19 escenas, todas `extends Phaser.Scene`. Para no duplicar el diagrama se dibujan solo las principales (`GameScene`, `GameSceneLAN`, `UIScene`). El resto (`BootScene`, `PreloaderScene`, `LoginScene`, `RegisterSceneUpdated`, `HomeScenes`, `SettingsScene`, `StatsScene`, `DifficultySelectScene`, `CreateRoomScene`, `PauseScene`, `LoadingScene`, `CardsScene`, `MissionsScene`, `ProfileScene`, `AboutScene`, `MechanicsScene`) heredan igualmente de `Phaser.Scene`.
- **`Card` vs `CardEntity`**: `Card` es solo presentación (`extends Phaser.GameObjects.Sprite`); los datos de dominio viven en `cardData`, instancias creadas por la clase estática `CardEntity` (`game/CardEntity.js`). No hay relación de herencia entre ambas.

## POO demostrable

- **Abstracción**
  - `Poder` define el contrato `canUse(ctx)`/`execute(ctx)` (`game/powers/Poder.js:28-54`); las derivadas lo implementan y el consumidor (`GameMatch.useEssencePower`) solo conoce esa abstracción.
  - `IGameMatch`, `IBotAI`, `ISyncGateway` abstraen la escena de las implementaciones concretas (`GameMatch`, `BotAI`, `LANClient`).

- **Encapsulamiento**
  - `Battlefield._slots` es privado: solo se accede por `get()/set()/clearAt()` y consultas (`types()`, `emptyIndices()`, `snapshot()` devuelve copia) — `game/Battlefield.js:8-115`.
  - `EssenceManager._essences` privado, expuesto solo por `activate()/has()/getAll()/size` — `game_objects/essences.js:16-63`.
  - `BotAI._delay`/`_scoreModifier` privados con getters `actionDelay`/`scoreModifier`.

- **Herencia**
  - `Rafaga`, `Rescate`, `Brotar`, `Clarividencia`, `Robar`, `Conducto --|> Poder` (`powers/PoderesRegistry.js:11-52`).
  - `Card --|> Phaser.GameObjects.Sprite` (`game_objects/card.js:11`).
  - Las 19 escenas `--|> Phaser.Scene` (representadas: `GameScene`, `GameSceneLAN`, `UIScene`).

- **Polimorfismo**
  - `Poder.execute(ctx)` sobrescrito por las 6 derivadas. `GameMatch.useEssencePower` obtiene la instancia con `PoderesRegistry.get(essenceType)` y llama `canUse()/execute()` sin conocer la clase concreta — `game/GameMatch.js:138-171`.

## SOLID aplicado

- **SRP**
  - `AttackController` se extrajo de `CardInteraction` con una sola responsabilidad: orquestar y animar los ataques del jugador (`presentation/AttackController.js:1-9`).
  - `BoardRenderer` solo pinta; `TurnController` solo gobierna el ciclo de turnos/victoria; `BotTurnRunner` solo ejecuta el turno del bot; `RemoteEffectApplier` solo traduce eventos remotos a efectos visuales.
  - `GameScene` quedó como coordinador delgado (construye `ctx`, delega, no decide reglas).

- **OCP**
  - `PoderesRegistry` + extensión de `Poder`: para añadir un poder nuevo se crea la clase derivada y se agrega una entrada en `PODERES` (`powers/PoderesRegistry.js:54-68`); `GameMatch.useEssencePower` no se modifica (comentario OCP en `game/GameMatch.js:144-147`).

- **LSP**
  - Cualquier derivada de `Poder` puede sustituir a la base en `useEssencePower` manteniendo el protocolo: `canUse` devuelve `{ok,...}` y `execute` devuelve `string[]`. Ej.: `Rafaga.execute` con Ráfaga y `Conducto.execute` con Conducto coexisten en el mismo registro (`powers/PoderesRegistry.js:11-52`).

- **ISP**
  - Contratos mínimos y segregados por consumidor: `IGameMatch` (6 métodos), `IBotAI` (3 métodos), `ISyncGateway` (4 métodos). La escena y `LANEventRouter` dependen solo de los métodos que usan (`game/contracts/*.js`).
  - `GameComposer` los valida por duck-typing (`app/GameComposer.js:27,39,55`).

- **DIP**
  - `GameScene`/`GameComposer` dependen de las abstracciones `IGameMatch`/`IBotAI`/`ISyncGateway`, no de las clases concretas.
  - El dominio no depende de Phaser ni de las Scenes: `GameMatch` notifica cambios por su propio `EventBus` (`game/GameMatch.js:38,186-188`) y `GameScene` solo puentea esos eventos a la UI.
  - Dependencias inyectadas por constructor: `TurnManager` inyectado en `GameMatch` (`game/GameMatch.js:44`), `LANEventRouter` recibe `match` inyectado (`game/LANEventRouter.js:16`), y las clases de presentación reciben el `ctx` completo (DI).