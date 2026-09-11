import Phaser from 'phaser';
import { CARD_TYPES as CardTypes } from '../helpers/constants.js';

/**
 * La escena de la interfaz de usuario (UI) se ejecuta sobre la GameScene.
 * Se encarga de mostrar información como los datos del jugador, botones
 * y, en este caso, los orbes de esencia.
 */
export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
        this.playerOrbs = {};
        this.opponentOrbs = {};
    }

    preload() {
        // Cargamos aquí los assets de la UI para mantener el código organizado
        console.log('[UIScene] Cargando assets de UI...');
        this.load.image('orb-fuego', '/assets/images/iconos/fuego.jpeg');
        this.load.image('orb-agua', '/assets/images/iconos/agua.jpeg');
        this.load.image('orb-planta', '/assets/images/iconos/planta.jpeg');
        this.load.image('orb-luz', '/assets/images/iconos/luz.jpeg');
        this.load.image('orb-espiritu', '/assets/images/iconos/espiritu.jpeg');
        this.load.image('orb-sombra', '/assets/images/iconos/sombra.jpeg');
    }

    create(data) {
        console.log('[UIScene] Creada', { player: this.playerData?.username || 'Jugador' });
        this.playerData = data.playerData || { username: 'Jugador' }; // Fallback por si no hay datos
        const username = this.playerData.username;

        // Obtenemos una referencia a la GameScene para comunicarnos con ella
        this.gameScene = this.scene.get('GameScene');

        // Creamos los orbes para ambos jugadores
        this.createEssenceOrbs();

        const { width, height } = this.scale;

        // ---------- BARRA SUPERIOR ----------
        const topBarY = 50; // Eje vertical central para los elementos superiores

        // --- BOTÓN DE PAUSA (esquina superior izquierda) ---
        const pauseBtn = this.add.text(30, 30, '⏸', { 
            fontSize: '40px', 
            color: '#fff',
            fontStyle: 'bold'
        })
        .setInteractive({ useHandCursor: true })
        .setDepth(1000)
        .on('pointerdown', () => {
            this.scene.pause('GameScene');
            this.scene.pause('UIScene');
            this.scene.launch('PauseScene');
        })
        .on('pointerover', () => {
            pauseBtn.setScale(1.15);
            pauseBtn.setColor('#ffd700');
        })
        .on('pointerout', () => {
            pauseBtn.setScale(1);
            pauseBtn.setColor('#fff');
        });

        // --- Panel central (TU vs OPONENTE) ---
        const barWidth = 360;
        const barHeight = 48;
        const barX = Math.round((width - barWidth) / 2);
        const barY = topBarY - barHeight / 2;

        const cornerRadius = 12;

        const bar = this.add.graphics();
        bar.fillStyle(0x1a001a, 0.9); // Un morado oscuro más sutil
        bar.lineStyle(2, 0xc49bff, 1); // Un borde de neón más brillante
        bar.fillRoundedRect(0, 0, barWidth, barHeight, cornerRadius);
        bar.strokeRoundedRect(0, 0, barWidth, barHeight, cornerRadius);
        bar.setPosition(barX, barY);

        const textStyle = {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold',
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, fill: true }
        };
        this.add.text(barX + barWidth * 0.22, topBarY, 'Jugador', textStyle).setOrigin(0.5);
        this.add.text(barX + barWidth * 0.5, topBarY, "VS", { ...textStyle, fontSize: '18px', fontStyle: 'normal' }).setOrigin(0.5);
        this.add.text(barX + barWidth * 0.78, topBarY, "Oponente", textStyle).setOrigin(0.5);

        // --- Botón Iniciar Partida (ahora en la parte superior derecha) ---
        const btnStartWidth = 180;
        const btnStartHeight = 45;
        const btnStartX = width - (btnStartWidth / 2) - 20; // Posición en la esquina superior derecha
        const btnStartY = topBarY;

        const startContainer = this.add.container(btnStartX, btnStartY);
        const startBg = this.add.graphics();
        startBg.fillStyle(0x006400, 0.9); // Color verde para la acción de iniciar
        startBg.fillRoundedRect(-btnStartWidth / 2, -btnStartHeight / 2, btnStartWidth, btnStartHeight, 12);
        startBg.lineStyle(2, 0x00ff00, 1);
        startBg.strokeRoundedRect(-btnStartWidth / 2, -btnStartHeight / 2, btnStartWidth, btnStartHeight, 12);

        const startText = this.add.text(0, 0, "Iniciar Partida", { ...textStyle, fontSize: '18px' }).setOrigin(0.5);

        startContainer.add([startBg, startText]);
        startContainer.setSize(btnStartWidth, btnStartHeight).setInteractive({ cursor: 'pointer' });

        // Conectamos el evento para que avise a la GameScene que debe empezar
        startContainer.on('pointerdown', () => {
            this.gameScene.events.emit('start-game');
            startContainer.setVisible(false); // Ocultamos el botón después de usarlo
        });

        // ---------- BARRA INFERIOR ----------
        const bottomBarY = height - 50; // Eje vertical para alinear elementos inferiores
        const bottomTextStyle = {
            fontSize: '18px',
            color: '#fff',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true }
        };

        // --- CONTADOR DE ATAQUE DEL JUGADOR (Izquierda) ---
        const playerCounterX = 150;
        const counterWidth = 220;
        const counterHeight = 40;

        const playerCounterFrame = this.add.graphics({ x: playerCounterX, y: bottomBarY });
        playerCounterFrame.lineStyle(2, 0xc49bff, 1);
        playerCounterFrame.strokeRoundedRect(-counterWidth / 2, -counterHeight / 2, counterWidth, counterHeight, 10);

        this.attackCounterTexts = {};
        this.attackCounterTexts.player = this.add.text(playerCounterX, bottomBarY, `Jugador ataque: turno 1`, bottomTextStyle).setOrigin(0.5);

        // --- TEMPORIZADOR DE TURNO (Centro) ---
        const timerWidth = 200;
        const timerHeight = 50;
        const timerFrame = this.add.graphics({ x: width / 2, y: bottomBarY });
        timerFrame.lineStyle(2, 0xffff00, 1);
        timerFrame.strokeRoundedRect(-timerWidth / 2, -timerHeight / 2, timerWidth, timerHeight, 10);

        this.timerText = this.add.text(width / 2, bottomBarY, '', {
            ...bottomTextStyle,
            fontSize: '28px',
            color: '#ffff00'
        }).setOrigin(0.5);

        // --- CONTADOR DE ATAQUE DEL OPONENTE (Derecha) ---
        const opponentCounterX = width - 150;
        const opponentCounterFrame = this.add.graphics({ x: opponentCounterX, y: bottomBarY });
        opponentCounterFrame.lineStyle(2, 0xc49bff, 1);
        opponentCounterFrame.strokeRoundedRect(-counterWidth / 2, -counterHeight / 2, counterWidth, counterHeight, 10);

        this.attackCounterTexts.opponent = this.add.text(opponentCounterX, bottomBarY, 'Bot ataque: turno 1', bottomTextStyle).setOrigin(0.5);

        // Escuchar actualizaciones que envía GameScene para los contadores
        this.scene.get('GameScene').events.on('update-attack-counter', (owner, turnIndex, mustAttack) => {
            const textObj = this.attackCounterTexts[owner];
            if (!textObj) return;

            let label = '';
            if (owner === 'player') {
                label = `${username} ataque`;
            } else {
                label = 'Bot ataque';
            }

            const obliged = mustAttack ? ' - ¡OBLIGADO!' : '';
            textObj.setText(`${label}: turno ${turnIndex}${obliged}`);
            // opcional: cambiar color cuando está obligado
            textObj.setStyle({ fill: mustAttack ? '#ff4444' : '#ffffff' });
        });

        // --- LISTENER DE EVENTOS ---
        // Escuchamos eventos de la GameScene para actualizar la UI.
        this.gameScene.events.on('update-timer', this.updateTimer, this);
        this.gameScene.events.on('game-over', this.showGameOverModal, this);
        this.gameScene.events.on('essence-activated', this.handleEssenceActivation, this);

        // Nos aseguramos de limpiar el listener cuando la escena se destruya
        this.events.on('shutdown', () => {
            // Limpiamos todos los listeners para evitar fugas de memoria
            if (this.gameScene) {
                this.gameScene.events.off('update-timer', this.updateTimer, this);
                this.gameScene.events.off('game-over', this.showGameOverModal, this);
                this.gameScene.events.off('essence-activated', this.handleEssenceActivation, this);
                // Nos aseguramos de eliminar también el listener del contador de ataque
                // para evitar que la UI de una partida anterior reaccione a eventos de una nueva.
                this.gameScene.events.off('update-attack-counter');
            }
        });

        // --- CONTADOR VISIBLE DE ATAQUE OBLIGATORIO ---
        // Si UI emite 'end-player-turn' en botones antiguos, asegurarse de eliminar ese listener
        this.events.off('end-player-turn'); // seguro: elimina escuchas previas
    }

    /**
     * Crea los indicadores visuales (orbes) para las esencias de ambos jugadores.
     * Ahora organizados en triángulos (uno arriba del otro) y con flechas
     * dibujadas como línea + punta.
     */
    createEssenceOrbs() {
        const { width, height } = this.scale;
        const orbSize = 40; // tamaño base que usamos para el posicionamiento y offsets
        const radius = 52; // radio del triángulo
        const paddingY = 60;

        // Posiciones: Triángulos apilados
        const playerCenterX = 130;
        const playerTopY = height - 370;   // fuego-planta-agua (arriba, jugador)
        const playerBottomY = height - 170; // luz-sombra-espiritu (abajo, jugador)

        const opponentCenterX = width - 130;
        const opponentTopY = 390;   // fuego-planta-agua (arriba, oponente)
        const opponentBottomY = 190; // luz-sombra-espiritu (abajo, oponente)

        // Limpiamos cualquier grupo anterior (por si se vuelve a crear)
        if (this.essenceGraphics && this.essenceGraphics.length) {
            this.essenceGraphics.forEach(g => g.destroy?.());
        }
        this.essenceGraphics = [];

        // Crear triángulos: fuego>planta>agua y luz>sombra>espiritu
        // Energía azul para el jugador y naranja para el oponente.
        this.createEssenceTriangle(playerCenterX, playerTopY, radius, ['fuego', 'planta', 'agua'], 'player', 0x5bc0ff, orbSize);
        this.createEssenceTriangle(playerCenterX, playerBottomY, radius, ['luz', 'sombra', 'espiritu'], 'player', 0x5bc0ff, orbSize);

        this.createEssenceTriangle(opponentCenterX, opponentTopY, radius, ['fuego', 'planta', 'agua'], 'opponent', 0xff9a5c, orbSize);
        this.createEssenceTriangle(opponentCenterX, opponentBottomY, radius, ['luz', 'sombra', 'espiritu'], 'opponent', 0xff9a5c, orbSize);
    }

    /**
     * Crea un triángulo de 3 orbes con flechas (línea + punta).
     * @param {number} cx - centro X del triángulo
     * @param {number} cy - centro Y del triángulo
     * @param {number} r - radio de colocación de orbes
     * @param {Array<string>} typesArray - ['fuego','planta','agua']
     * @param {string} ownerId - 'player'|'opponent'
     * @param {number} arrowColor - color en hex (0xRRGGBB)
     * @param {number} orbSize - tamaño base para offsets
     */
    createEssenceTriangle(cx, cy, r, typesArray, ownerId, arrowColor = 0xff3333, orbSize = 40) {
        const anglesDeg = [-90, 30, 150]; // top, bottom-right, bottom-left (clockwise)
        const elements = [];

        // container para flechas (por debajo) y para orbes (encima)
        const arrowsGraphics = this.add.graphics({ x: 0, y: 0 }).setDepth(5);
        const orbsContainer = this.add.container(0, 0).setDepth(10);
        const scaleValue = 0.08; // escala que hemos usado por consistencia al render de UI

        for (let i = 0; i < 3; i++) {
            const angle = Phaser.Math.DegToRad(anglesDeg[i]);
            const x = Math.round(cx + r * Math.cos(angle));
            const y = Math.round(cy + r * Math.sin(angle));

            const assetKey = `orb-${typesArray[i]}`;
            const sprite = this.add.image(x, y, assetKey)
                .setInteractive()
                .setOrigin(0.5)
                .setScale(scaleValue)
                .setTint(0x666666); // apagado por defecto
            // Guardamos datos para referencia
            sprite.setData('type', typesArray[i]);
            sprite.setData('owner', ownerId);
            sprite.setData('active', false);

            elements.push(sprite);
            orbsContainer.add(sprite);

            // Guardar en map
            if (ownerId === 'player') this.playerOrbs[typesArray[i]] = sprite;
            else this.opponentOrbs[typesArray[i]] = sprite;
        }

        // Dibujar flechas: 0->1, 1->2, 2->0 (clockwise)
        for (let i = 0; i < 3; i++) {
            const a = elements[i];
            const b = elements[(i + 1) % 3];

            // Calculamos offsets en base al displayWidth/Height reales para que la flecha no cubra las esferas
            const startOffset = (a.displayWidth || orbSize) / 2 + 6;
            const endOffset = (b.displayWidth || orbSize) / 2 + 6;

            this.drawArrowLine(arrowsGraphics, a.x, a.y, b.x, b.y, arrowColor, 4, 12, startOffset, endOffset);
        }

        // Guardar para referencia si necesitamos manipular más adelante
        this.essenceGraphics.push(arrowsGraphics);
        this.essenceGraphics.push(orbsContainer);
    }

    /**
     * Dibuja una flecha (línea + punta) entre dos puntos en Graphics.
     * @param {Phaser.GameObjects.Graphics} g
     * @param {number} fromX
     * @param {number} fromY
     * @param {number} toX
     * @param {number} toY
     * @param {number} color - 0xRRGGBB
     * @param {number} thickness - grosor de la línea
     * @param {number} headLen - longitud de la punta de flecha
     * @param {number} startOffset - separación desde el origen (px)
     * @param {number} endOffset - separación hasta llegar al destino (px)
     */
    drawArrowLine(g, fromX, fromY, toX, toY, color = 0xff3333, thickness = 3, headLen = 12, startOffset = 0, endOffset = 0) {
        // Dirección y unit vector
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const dx = Math.cos(angle), dy = Math.sin(angle);

        const sx = fromX + dx * startOffset;
        const sy = fromY + dy * startOffset;
        const tx = toX - dx * endOffset;
        const ty = toY - dy * endOffset;

        // Línea principal (shaft) sin cubrir las orbes
        g.lineStyle(thickness, color, 1);
        g.beginPath();
        g.moveTo(sx, sy);
        // la línea termina en la base de la punta:
        const baseX = tx - dx * headLen;
        const baseY = ty - dy * headLen;
        g.lineTo(baseX, baseY);
        g.strokePath();

        // Triángulo para la punta de flecha
        const leftX = tx - headLen * Math.cos(angle - Math.PI / 6);
        const leftY = ty - headLen * Math.sin(angle - Math.PI / 6);
        const rightX = tx - headLen * Math.cos(angle + Math.PI / 6);
        const rightY = ty - headLen * Math.sin(angle + Math.PI / 6);

        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(leftX, leftY);
        g.lineTo(rightX, rightY);
        g.closePath();
        g.fillPath();
    }

    /**
     * Actualiza el texto del temporizador en la UI.
     * @param {number} time - El tiempo restante en segundos.
     */
    updateTimer(time) {
        if (time > 0) {
            this.timerText.setText(`Tiempo: ${time}`);
        } else {
            this.timerText.setText(''); // Limpiamos el texto si no hay tiempo
        }
    }

    /**
     * Muestra un modal de fin de partida.
     * @param {string} winner - Quién ganó la partida ('player' u 'opponent').
     */
    showGameOverModal(winner) {
        const { width, height } = this.scale;

        // 1. Creamos un fondo semitransparente que cubra toda la pantalla
        const overlay = this.add.graphics({ fillStyle: { color: 0x000000, alpha: 0.7 } });
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(100); // Nos aseguramos que esté por encima de todo

        // 2. Creamos el panel del modal
        const panelWidth = 500;
        const panelHeight = 250;
        const panel = this.add.graphics({ fillStyle: { color: 0x1a001a }, lineStyle: { width: 2, color: 0xc49bff } });
        panel.fillRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 15);
        panel.strokeRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 15);
        panel.setDepth(101);

        // 3. Añadimos el texto de victoria o derrota
        const titleText = this.add.text(width / 2, height / 2 - 50, 'Fin de la Partida', { fontSize: '48px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(101);
        
        const resultText = (winner === 'player') ? '¡Has Ganado!' : '¡Has Perdido!';
        const resultColor = (winner === 'player') ? '#28a745' : '#dc3545';
        const messageText = this.add.text(width / 2, height / 2 + 30, resultText, { fontSize: '40px', color: resultColor, fontStyle: 'bold' }).setOrigin(0.5).setDepth(101);

        // Podríamos añadir un botón para volver al menú principal en el futuro
        // Botón para volver al menú principal
        const btnWidth = 200;
        const btnHeight = 48;
        const btnX = width / 2;
        const btnY = height / 2 + 90;

        const backBtnBg = this.add.graphics();
        backBtnBg.fillStyle(0x303df1, 1);
        backBtnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 10);
        backBtnBg.lineStyle(2, 0xffffff, 0.15);
        backBtnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 10);
        backBtnBg.setDepth(102);

        const backBtnText = this.add.text(btnX, btnY, 'Ir al inicio', { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(103);

        // Hacer clickable el botón
        const backBtnZone = this.add.zone(btnX, btnY, btnWidth, btnHeight).setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(104);
        // quitar efecto hover/animación para que el botón no cambie de posición ni escala al pasar el ratón
        backBtnZone.on('pointerdown', () => {
            // Limpiar modal
            overlay.destroy();
            panel.destroy();
            titleText.destroy();
            messageText.destroy();
            backBtnBg.destroy();
            backBtnText.destroy();
            backBtnZone.destroy();

            // Detenemos las escenas de juego y UI. NO las eliminamos con .remove().
            // Esto permite que Phaser pueda volver a iniciarlas en una nueva partida.
            this.scene.stop('GameScene');
            this.scene.stop('UIScene');

            // Ir al menú principal (HomeScenes) PRIMERO
            this.scene.start('HomeScenes');
        });
    }


    /**
     * Manejador que se ejecuta cuando se recibe el evento 'essence-activated'.
     * @param {string} playerId 'player' u 'opponent'
     * @param {string} essenceType El tipo de esencia activada (ej. 'fuego')
     */
    handleEssenceActivation(playerId, essenceType) {
        console.log('[UIScene] Recibido evento: activar esencia', { essenceType, playerId });

        let targetOrb;
        if (playerId === 'player') {
            targetOrb = this.playerOrbs[essenceType];
        } else {
            targetOrb = this.opponentOrbs[essenceType];
        }

        if (targetOrb) {
            // Quitamos el tinte gris para indicar activación
            targetOrb.clearTint();

            // Pulsación visual: aumentamos ligeramente la escala y volvemos al valor original
            const baseScale = targetOrb.scaleX || 0.08;
            const pulseScale = baseScale * 1.25;
            this.tweens.add({
                targets: targetOrb,
                scaleX: pulseScale,
                scaleY: pulseScale,
                duration: 180,
                yoyo: true,
                ease: 'Power1'
            });
        }
    }
}