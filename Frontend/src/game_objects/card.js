import Phaser from 'phaser';

/**
 * Representación visual de una carta (sprite de Phaser). Extiende de
 * Phaser.GameObjects.Sprite y gestiona textura e interacción.
 *
 * Es solo presentación: los datos de dominio (instancia con `instanceId`,
 * `type`, `level`, `owner`) viven en `cardData` y se construyen con
 * `game/CardEntity.js`. No añadir aquí reglas de negocio.
 */
export default class Card extends Phaser.GameObjects.Sprite {

    /**
     * @param {Phaser.Scene} scene La escena a la que pertenece la carta.
     * @param {number} x La posición x inicial.
     * @param {number} y La posición y inicial.
     * @param {string} owner El jugador propietario de la carta ('player1' o 'player2').
     * @param {string} type El tipo de la carta (usando CardTypes).
     * @param {number} [level=1] El nivel de la carta.
     * @param {boolean} [isFaceDown=true] Si la carta está boca abajo.
     */
    constructor(scene, x, y, cardData, isFaceDown = true) {
        // La textura inicial será el reverso de la carta. Asumimos que se carga con la key 'card_back'.
        super(scene, x, y, isFaceDown ? 'card-back-player' : `card-${cardData.type}-${cardData.level}`);

        this.scene = scene;
        this.cardData = cardData; // Guardamos todos los datos
        this.type = cardData.type;
        this.level = cardData.level;
        this.isFaceDown = isFaceDown;

        // Asignamos un nombre al GameObject para facilitar la depuración
        // y añadimos el `instanceId` también como metadata para búsquedas.
        if (cardData && cardData.instanceId) {
            this.setName(cardData.instanceId);
            this.setData('instanceId', cardData.instanceId);
        }

        // Propiedades para las reglas de ataque.
        // NOTA: la restricción por nivel (L2=ataca 2 turnos y descansa 1, L3=ataca 1 y descansa 1)
        // se calcula en GameScene._registerCardAttack usando metadatos en el GameObject
        // (blockedTurn / consecutiveAttacks / lastAttackedTurn). No duplicar aquí.

        // 1. Añadimos la carta a la escena PRIMERO.
        scene.add.existing(this);
        // 2. Hacemos la carta interactiva DESPUÉS de que esté en la escena.
        this.setInteractive();

        // Guardar posición inicial y datos como metadatos para uso de la escena
        this.setData('startPosition', { x, y });
        this.setData('cardData', cardData);

        // Si la carta no está boca abajo desde el principio (ej. por fusión), la revelamos
        if (!this.isFaceDown) {
            this.reveal();
        }
    }

    /**
     * Revela la carta, cambiando su textura a la del tipo y nivel correspondiente.
     * Una vez revelada, no puede volver a ocultarse.
     */
    reveal() {
        if (this.isFaceDown) {
            this.isFaceDown = false;
            // La textura usa el formato 'card-tipo-nivel'
            const textureName = `card-${this.type}-${this.level}`;
            this.setTexture(textureName);
        }
    }

    /**
     * Sube el nivel de la carta. Se usa durante la fusión.
     */
    levelUp() {
        if (this.level < 3) {
            this.level++;
            // Actualiza la textura si la carta ya está revelada
            if (!this.isFaceDown) {
                const textureName = `card-${this.type}-${this.level}`;
                this.setTexture(textureName);
            }
        }
    }
}