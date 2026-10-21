import Phaser from 'phaser';
import { createGemVisual, ELEMENT_ORDER } from '../helpers/gemVisual.js';
import { drawOrnatePanel, ornateLabel } from '../helpers/battlefieldArt.js';

const ELEMENTS = ELEMENT_ORDER;

const COLORS = {
    gold: 0xcfaf6d,
    goldBright: 0xe8cf8f,
    blue: 0x4fb3ff,
    red: 0xff5a3c,
    panel: 0x0a0e1c,
    panelDeep: 0x060912
};

/**
 * La escena de la interfaz de usuario (UI) se ejecuta sobre la GameScene.
 * Presenta perfiles (datos reales de mazo/mano/campo), fase de turno, relojes,
 * botones y el panel de gemas elementales. Rediseñada con estética de fantasía
 * (marcos ornamentales, gemas cristalinas) sin alterar eventos ni lógica.
 */
export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
        this.playerOrbs = {};
        this.opponentOrbs = {};
        this.gemIcons = { player: {}, opponent: {} };
        this.gemShelves = {};
        this.gemTotals = {};
        this.profileTexts = { player: null, opponent: null };
    }

    preload() {
        // Assets de los orbes de esencia (se mantienen para las insignias elementales).
        this.load.image('orb-fuego', '/assets/images/iconos/fuego.jpeg');
        this.load.image('orb-agua', '/assets/images/iconos/agua.jpeg');
        this.load.image('orb-planta', '/assets/images/iconos/planta.jpeg');
        this.load.image('orb-luz', '/assets/images/iconos/luz.jpeg');
        this.load.image('orb-espiritu', '/assets/images/iconos/espiritu.jpeg');
        this.load.image('orb-sombra', '/assets/images/iconos/sombra.jpeg');
    }

    create(data) {
        this.playerData = data.playerData || { username: 'Jugador' };
        this.username = this.playerData.username || 'Jugador';
        this.gameScene = this.scene.get('GameScene');

        const { width, height } = this.scale;
        this.W = width;
        this.H = height;

        // Reloj de turno: sobre la bandeja de la mano, a la izquierda de las
        // cartas (que ahora llegan hasta x≈1110).
        this.turnTimerPos = { x: 300, y: this.H - 125 };

        // --- Construcción del HUD ---
        this.createProfiles();
        this.createPhaseBanner();
        this.createButtons();
        this.createTurnTimer();
        this.createMatchTimer();
        this.createEssenceOrbs();
        this.createGemPanels();

        // --- LISTENER DE EVENTOS ---
        this.gameScene.events.on('update-timer', this.updateTimer, this);
        this.gameScene.events.on('game-over', this.showGameOverModal, this);
        this.gameScene.events.on('essence-activated', this.handleEssenceActivation, this);
        this.gameScene.events.on('objectives-ready', this.handleObjectivesReady, this);
        this.gameScene.events.on('gem-collected', this.handleGemCollected, this);
        this.gameScene.events.on('update-match-timer', this.updateMatchTimer, this);
        this.gameScene.events.on('update-turn-indicator', this.handleTurnIndicator, this);

        this.scene.get('GameScene').events.on('update-attack-counter', (owner, turnIndex, mustAttack) => {
            const textObj = this.attackCounterTexts && this.attackCounterTexts[owner];
            if (!textObj) return;
            const label = owner === 'player' ? `${this.username}` : (this.gameScene && this.gameScene.vsBot ? 'Bot' : 'Rival');
            const obliged = mustAttack ? '  ·  ¡OBLIGADO!' : '';
            textObj.setText(`${label}: turno de ataque ${turnIndex}${obliged}`);
            textObj.setColor(mustAttack ? '#ff6b6b' : '#d7e6ff');
        });

        // Limpieza al apagar la escena.
        this.events.on('shutdown', () => {
            if (this.gameScene) {
                this.gameScene.events.off('update-timer', this.updateTimer, this);
                this.gameScene.events.off('game-over', this.showGameOverModal, this);
                this.gameScene.events.off('essence-activated', this.handleEssenceActivation, this);
                this.gameScene.events.off('objectives-ready', this.handleObjectivesReady, this);
                this.gameScene.events.off('gem-collected', this.handleGemCollected, this);
                this.gameScene.events.off('update-match-timer', this.updateMatchTimer, this);
                this.gameScene.events.off('update-turn-indicator', this.handleTurnIndicator, this);
                this.gameScene.events.off('update-attack-counter');
                this.gameScene.events.off('update-turn-counter');
            }
        });

        this.events.off('end-player-turn');
    }

    /**
     * Actualiza cada frame los datos reales de los perfiles (mazo, mano, campo,
     * gemas) leídos del modelo de la GameScene. No altera la lógica del juego.
     */
    update() {
        this.refreshProfiles();
    }

    /* ------------------------------------------------------------------ *
     * Construcción del HUD
     * ------------------------------------------------------------------ */

    createProfiles() {
        this.playerProfile = this.buildProfile('player');
        this.opponentProfile = this.buildProfile('opponent');
    }

    /**
     * Construye un panel de perfil con nombre y estadísticas reales.
     * @param {'player'|'opponent'} owner
     */
    buildProfile(owner) {
        const isPlayer = owner === 'player';
        const w = 330;
        const h = 124;
        // Rival arriba-izquierda (sobre su bandeja de mano, a la derecha del
        // botón de pausa), jugador abajo-derecha. El rival se baja a y=88 para
        // no asomar por encima de la bandeja (como sí hace el del jugador).
        const x = isPlayer ? this.W - w - 30 : 100;
        const y = isPlayer ? this.H - h - 24 : 88;
        const accent = isPlayer ? COLORS.blue : COLORS.red;

        const panel = drawOrnatePanel(this, { x, y, w, h, accent, fill: COLORS.panel });

        const name = isPlayer
            ? this.username
            : (this.gameScene && this.gameScene.vsBot
                ? 'BOT · NIVEL ' + ((this.gameScene.bot && this.gameScene.bot.difficulty) || 3)
                : (this.gameScene && this.gameScene.isLAN ? 'RIVAL · LAN' : 'RIVAL · EN LÍNEA'));

        const title = ornateLabel(this, x + 20, y + 22, name.toUpperCase(), {
            fontSize: '16px', color: isPlayer ? '#bfe1ff' : '#ffc2ad', originX: 0, originY: 0.5
        });
        title.setDepth(5);

        const role = this.add.text(x + w - 20, y + 22, isPlayer ? 'TÚ' : 'RIVAL', {
            fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold',
            color: isPlayer ? '#8fd4ff' : '#ffb08f', stroke: '#000', strokeThickness: 3
        }).setOrigin(1, 0.5).setDepth(5);

        const mkStat = (labelText, statsX) => {
            const label = this.add.text(statsX, y + 58, labelText, {
                fontFamily: 'Georgia, serif', fontSize: '12px', color: '#9fb0c8'
            }).setOrigin(0.5, 0.5).setDepth(5);
            const value = this.add.text(statsX, y + 82, '0', {
                fontFamily: 'Georgia, serif', fontSize: '22px', fontStyle: 'bold',
                color: '#ffffff', stroke: '#000', strokeThickness: 4
            }).setOrigin(0.5, 0.5).setDepth(5);
            return { label, value };
        };

        const colW = (w - 40) / 3;
        const baseX = x + 20;
        const deck = mkStat('MAZO', baseX + colW * 0.5);
        const hand = mkStat('MANO', baseX + colW * 1.5);
        const field = mkStat('CAMPO', baseX + colW * 2.5);

        const attackText = this.add.text(x + w / 2, y + h - 12, '', {
            fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold',
            color: '#d7e6ff', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5, 1).setDepth(5);

        if (!this.attackCounterTexts) this.attackCounterTexts = {};
        this.attackCounterTexts[owner] = attackText;

        return { panel, title, role, deck, hand, field, attackText };
    }

    /** Refresca los valores de los perfiles desde el modelo real de la partida. */
    refreshProfiles() {
        const gs = this.gameScene;
        if (!gs || !gs.player || !gs.opponent) return;

        const fill = (profile, player) => {
            if (!profile) return;
            try {
                profile.deck.value.setText(String(player.deck.getCardsCount()));
                profile.hand.value.setText(String((player.hand || []).length));
                profile.field.value.setText(String((player.field || []).filter(Boolean).length));
            } catch (e) { /* modelo aún no listo */ }
        };

        fill(this.playerProfile, gs.player);
        fill(this.opponentProfile, gs.opponent);
    }

    createPhaseBanner() {
        const w = 400;
        const h = 54;
        const x = this.W / 2 - w / 2;
        const y = 22;
        drawOrnatePanel(this, { x, y, w, h, accent: COLORS.gold, fill: COLORS.panelDeep });

        this.phaseText = this.add.text(this.W / 2, y + h / 2, 'PREPARADO', {
            fontFamily: 'Georgia, serif', fontSize: '22px', fontStyle: 'bold',
            color: '#e8cf8f', stroke: '#000', strokeThickness: 5, letterSpacing: 2
        }).setOrigin(0.5).setDepth(5);

        // Contador de turnos en la esquina del estandarte (se actualiza por evento).
        this.turnCounterText = this.add.text(x + w - 14, y + h / 2, '', {
            fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'bold',
            color: '#bfe1ff', stroke: '#000', strokeThickness: 3
        }).setOrigin(1, 0.5).setDepth(5);
        this.events.off('update-turn-counter');
        this.gameScene.events.off('update-turn-counter');
        this.gameScene.events.on('update-turn-counter', (current, max) => {
            if (!this.turnCounterText) return;
            this.turnCounterText.setText(max ? `T${current}/${max}` : `T${current}`);
        });

        this.phaseSub = this.add.text(this.W / 2, y + h + 16, '', {
            fontFamily: 'Arial', fontSize: '13px', color: '#9fb0c8', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(5);

        this.objectiveSub = this.add.text(this.W / 2, y + h + 38, '', {
            fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold',
            color: '#e8cf8f', stroke: '#000', strokeThickness: 3, letterSpacing: 1
        }).setOrigin(0.5).setDepth(5);
    }

    createButtons() {
        // --- BOTÓN DE PAUSA ---
        const px = 62;
        const py = 54;
        const ring = this.add.graphics().setDepth(1000);
        ring.fillStyle(0x0a0e1c, 0.92).fillCircle(px, py, 28);
        ring.lineStyle(3, COLORS.gold, 0.9).strokeCircle(px, py, 28);
        ring.lineStyle(1, COLORS.goldBright, 0.4).strokeCircle(px, py, 22);

        const pauseBtn = this.add.text(px, py, '⏸', {
            fontSize: '32px', color: '#e8cf8f', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(1001);

        const pauseZone = this.add.zone(px, py, 64, 64).setOrigin(0.5)
            .setInteractive({ useHandCursor: true }).setDepth(1002);
        pauseZone.on('pointerover', () => pauseBtn.setColor('#ffffff'));
        pauseZone.on('pointerout', () => pauseBtn.setColor('#e8cf8f'));
        pauseZone.on('pointerdown', () => {
            this.scene.pause('GameScene');
            this.scene.pause('UIScene');
            this.scene.launch('PauseScene');
        });

        // --- BOTÓN INICIAR PARTIDA ---
        const bw = 210;
        const bh = 48;
        const bx = this.W - bw / 2 - 24;
        const by = 48;

        const startContainer = this.add.container(bx, by).setDepth(5);
        const startBg = this.add.graphics();
        startBg.fillStyle(0x0c2a12, 0.92);
        startBg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
        startBg.lineStyle(2, 0x49d17a, 0.95);
        startBg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
        startBg.lineStyle(1, 0x9effc0, 0.35);
        startBg.strokeRoundedRect(-bw / 2 + 5, -bh / 2 + 5, bw - 10, bh - 10, 8);

        const startText = this.add.text(0, 0, 'INICIAR PARTIDA', {
            fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'bold',
            color: '#d8ffe6', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        startContainer.add([startBg, startText]);
        startContainer.setSize(bw, bh).setInteractive({ useHandCursor: true });
        startContainer.on('pointerover', () => startContainer.setScale(1.04));
        startContainer.on('pointerout', () => startContainer.setScale(1));
        startContainer.on('pointerdown', () => {
            this.gameScene.events.emit('start-game');
            startContainer.setVisible(false);
        });
    }

    createTurnTimer() {
        const cx = this.turnTimerPos.x;
        const cy = this.turnTimerPos.y;

        const base = this.add.graphics().setDepth(6);
        base.fillStyle(0x000000, 0.4).fillCircle(cx, cy + 3, 48);
        base.fillStyle(0x0a0e1c, 0.94).fillCircle(cx, cy, 48);
        base.lineStyle(3, COLORS.gold, 0.55).strokeCircle(cx, cy, 48);
        base.lineStyle(1, 0xffffff, 0.12).strokeCircle(cx, cy, 40);

        // Arco de progreso (se redibuja en cada tick).
        this.timerArc = this.add.graphics().setDepth(7);

        this.timerText = this.add.text(cx, cy, '', {
            fontFamily: 'Georgia, serif', fontSize: '34px', fontStyle: 'bold',
            color: '#ffffff', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(8);

        this.timerLabel = this.add.text(cx, cy - 70, 'TIEMPO DE TURNO', {
            fontFamily: 'Georgia, serif', fontSize: '12px', color: '#9fb0c8',
            stroke: '#000', strokeThickness: 3, letterSpacing: 1
        }).setOrigin(0.5).setDepth(8);

        this._timerColor = COLORS.blue;
        this._timerFrac = 1;
        this.drawTimerArc();
    }

    /** Redibuja el arco de progreso del temporizador. */
    drawTimerArc() {
        if (!this.timerArc) return;
        const cx = this.turnTimerPos.x;
        const cy = this.turnTimerPos.y;
        const frac = Phaser.Math.Clamp(this._timerFrac, 0, 1);
        this.timerArc.clear();
        this.timerArc.lineStyle(6, 0x12233d, 1).strokeCircle(cx, cy, 42);
        if (frac > 0) {
            const start = -Math.PI / 2;
            const end = start + frac * Math.PI * 2;
            this.timerArc.lineStyle(6, this._timerColor, 0.98);
            this.timerArc.beginPath();
            this.timerArc.arc(cx, cy, 42, start, end, false);
            this.timerArc.strokePath();
        }
        this.timerArc.lineStyle(1, 0xffffff, 0.15).strokeCircle(cx, cy, 34);
    }

    /** Redibuja el anillo del temporizador con el color de la fase activa. */
    drawTurnRing(color) {
        this._timerColor = color;
        this.drawTimerArc();
    }

    createMatchTimer() {
        const w = 210;
        const h = 56;
        // Entre el estandarte de fase y el botón de inicio, en la franja
        // superior. Arriba-derecha chocaba con el orbe superior del rival.
        const x = this.W - w - 340;
        const y = 24;
        this.matchPanel = drawOrnatePanel(this, { x, y, w, h, accent: COLORS.gold, fill: COLORS.panelDeep });
        this.matchPanel.setVisible(false);

        this.matchTimerText = this.add.text(x + w / 2, y + h / 2, '', {
            fontFamily: 'Georgia, serif', fontSize: '22px', fontStyle: 'bold',
            color: '#ffff88', stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(6).setVisible(false);
    }

    /* ------------------------------------------------------------------ *
     * Orbes de esencia
     * ------------------------------------------------------------------ */

    createEssenceOrbs() {
        const { width, height } = this.scale;
        const orbSize = 40;
        const radius = 54;

        const playerCenterX = 132;
        const playerTopY = height - 380;
        const playerBottomY = height - 180;

        const opponentCenterX = width - 132;
        const opponentTopY = 392;
        const opponentBottomY = 192;

        if (this.essenceGraphics && this.essenceGraphics.length) {
            this.essenceGraphics.forEach(g => g.destroy?.());
        }
        this.essenceGraphics = [];

        this.createEssenceTriangle(playerCenterX, playerTopY, radius, ['fuego', 'planta', 'agua'], 'player', COLORS.blue, orbSize);
        this.createEssenceTriangle(playerCenterX, playerBottomY, radius, ['luz', 'sombra', 'espiritu'], 'player', COLORS.blue, orbSize);
        this.createEssenceTriangle(opponentCenterX, opponentTopY, radius, ['fuego', 'planta', 'agua'], 'opponent', COLORS.red, orbSize);
        this.createEssenceTriangle(opponentCenterX, opponentBottomY, radius, ['luz', 'sombra', 'espiritu'], 'opponent', COLORS.red, orbSize);
    }

    /**
     * Crea un triángulo de 3 orbes con flechas (línea + punta).
     */
    createEssenceTriangle(cx, cy, r, typesArray, ownerId, arrowColor = 0xff3333, orbSize = 40) {
        const anglesDeg = [-90, 30, 150];
        const elements = [];

        const arrowsGraphics = this.add.graphics({ x: 0, y: 0 }).setDepth(5);
        const orbsContainer = this.add.container(0, 0).setDepth(10);
        const scaleValue = 0.085;

        for (let i = 0; i < 3; i++) {
            const angle = Phaser.Math.DegToRad(anglesDeg[i]);
            const x = Math.round(cx + r * Math.cos(angle));
            const y = Math.round(cy + r * Math.sin(angle));

            // Marco circular del orbe (integra las esencias con el HUD).
            const ring = this.add.graphics().setDepth(9);
            ring.fillStyle(0x05070e, 0.85).fillCircle(x, y, 31);
            ring.lineStyle(2, arrowColor, 0.7).strokeCircle(x, y, 31);
            ring.lineStyle(1, 0xcfaf6d, 0.5).strokeCircle(x, y, 27);

            const assetKey = `orb-${typesArray[i]}`;
            const sprite = this.add.image(x, y, assetKey)
                .setInteractive()
                .setOrigin(0.5)
                .setScale(scaleValue)
                .setTint(0x555555);
            sprite.setData('type', typesArray[i]);
            sprite.setData('owner', ownerId);
            sprite.setData('active', false);
            sprite.setData('ring', ring);

            elements.push(sprite);
            orbsContainer.add(sprite);

            if (ownerId === 'player') this.playerOrbs[typesArray[i]] = sprite;
            else this.opponentOrbs[typesArray[i]] = sprite;
        }

        for (let i = 0; i < 3; i++) {
            const a = elements[i];
            const b = elements[(i + 1) % 3];
            const startOffset = (a.displayWidth || orbSize) / 2 + 6;
            const endOffset = (b.displayWidth || orbSize) / 2 + 6;
            this.drawArrowLine(arrowsGraphics, a.x, a.y, b.x, b.y, arrowColor, 4, 12, startOffset, endOffset);
        }

        this.essenceGraphics.push(arrowsGraphics);
        this.essenceGraphics.push(orbsContainer);
    }

    drawArrowLine(g, fromX, fromY, toX, toY, color = 0xff3333, thickness = 3, headLen = 12, startOffset = 0, endOffset = 0) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const dx = Math.cos(angle), dy = Math.sin(angle);

        const sx = fromX + dx * startOffset;
        const sy = fromY + dy * startOffset;
        const tx = toX - dx * endOffset;
        const ty = toY - dy * endOffset;

        g.lineStyle(thickness, color, 1);
        g.beginPath();
        g.moveTo(sx, sy);
        const baseX = tx - dx * headLen;
        const baseY = ty - dy * headLen;
        g.lineTo(baseX, baseY);
        g.strokePath();

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

    /* ------------------------------------------------------------------ *
     * Temporizadores
     * ------------------------------------------------------------------ */

    updateTimer(time) {
        if (!this.timerText) return;
        const limit = (this.gameScene && this.gameScene.turn && this.gameScene.turn.config && this.gameScene.turn.config.TURN_TIME_LIMIT_MS) || 12000;
        this._timerFrac = time > 0 ? Phaser.Math.Clamp(time / (limit / 1000), 0, 1) : 0;
        this.drawTimerArc();
        if (time > 0) {
            this.timerText.setText(`${time}`);
            this.timerText.setColor(time <= 4 ? '#ff6b6b' : '#ffffff');
        } else {
            this.timerText.setText('');
        }
    }

    updateMatchTimer(seconds) {
        if (!this.matchTimerText) return;
        if (seconds <= 0) {
            this.matchTimerText.setVisible(false);
            if (this.matchPanel) this.matchPanel.setVisible(false);
            return;
        }
        this.matchTimerText.setVisible(true);
        if (this.matchPanel) this.matchPanel.setVisible(true);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        this.matchTimerText.setText(`PARTIDA  ${m}:${s.toString().padStart(2, '0')}`);
        this.matchTimerText.setColor(seconds <= 15 ? '#ff6b6b' : '#ffff88');
    }

    /**
     * Actualiza el indicador de fase (turno propio / del rival) y el color del
     * anillo del temporizador. Presentación basada en el evento real del juego.
     * @param {'player'|'opponent'} side
     */
    handleTurnIndicator(side) {
        const mine = side === 'player';
        if (this.phaseText) {
            this.phaseText.setText(mine ? 'TU TURNO' : (this.gameScene && this.gameScene.isLAN ? 'TURNO DEL RIVAL' : 'TURNO DEL OPONENTE'));
            this.phaseText.setColor(mine ? '#bfe1ff' : '#ffc2ad');
        }
        if (this.phaseSub) {
            this.phaseSub.setText(mine ? 'Coloca, fusiona o ataca' : 'El oponente está actuando...');
        }
        this.drawTurnRing(mine ? COLORS.blue : COLORS.red);
    }

    /* ------------------------------------------------------------------ *
     * Panel de gemas
     * ------------------------------------------------------------------ */

    createGemPanels() {
        const { width, height } = this.scale;

        const shelfW = 290;
        const shelfH = 130;
        const gap = 48;
        const gemSize = 24;
        const startXOffset = (gap * (ELEMENTS.length - 1)) / 2;

        const titleStyle = {
            fontFamily: 'Georgia, serif', fontSize: '13px', fontStyle: 'bold',
            color: '#e8cf8f', stroke: '#000000', strokeThickness: 3, letterSpacing: 1
        };
        const countStyle = {
            fontFamily: 'Arial', fontSize: '15px', fontStyle: 'bold',
            color: '#ffffff', stroke: '#000000', strokeThickness: 3
        };

        const paintShelf = (g, cx, cy, highlight) => {
            const x = cx - shelfW / 2;
            const y = cy - shelfH / 2;
            g.clear();
            g.fillStyle(0x000000, 0.35).fillRoundedRect(x, y + 4, shelfW, shelfH, 16);
            g.fillStyle(highlight ? 0x2a1f04 : COLORS.panel, highlight ? 0.86 : 0.82)
                .fillRoundedRect(x, y, shelfW, shelfH, 16);
            const stroke = highlight ? 0xffd75a : COLORS.gold;
            g.lineStyle(2, stroke, highlight ? 0.95 : 0.7).strokeRoundedRect(x, y, shelfW, shelfH, 16);
            g.lineStyle(1, stroke, 0.3).strokeRoundedRect(x + 6, y + 6, shelfW - 12, shelfH - 12, 12);
            g.fillStyle(highlight ? 0xffd75a : COLORS.goldBright, 0.9);
            [[x, y], [x + shelfW, y], [x, y + shelfH], [x + shelfW, y + shelfH]]
                .forEach(([px, py]) => g.fillPoints([
                    new Phaser.Geom.Point(px, py - 6), new Phaser.Geom.Point(px + 6, py),
                    new Phaser.Geom.Point(px, py + 6), new Phaser.Geom.Point(px - 6, py)
                ], true));
        };

        const buildShelf = (ownerId, cx, cy) => {
            const bg = this.add.graphics().setDepth(8);
            paintShelf(bg, cx, cy, false);

            const title = this.add.text(cx - shelfW / 2 + 16, cy - 44, ownerId === 'player' ? 'TUS GEMAS' : 'GEMAS RIVAL', titleStyle)
                .setOrigin(0, 0.5).setDepth(9);
            const total = this.add.text(cx + shelfW / 2 - 16, cy - 44, '0 / 0', {
                ...titleStyle, fontSize: '14px', color: '#f1c86a'
            }).setOrigin(1, 0.5).setDepth(9);

            // Barra de progreso bajo el panel: transparente hasta que hay requisitos.
            const bar = this.add.graphics().setDepth(8).setAlpha(0);
            const drawBar = (frac, complete) => {
                const bw = shelfW - 40;
                const bx = cx - bw / 2;
                const by = cy + shelfH / 2 + 8;
                bar.clear();
                bar.fillStyle(0x05070e, 0.9).fillRoundedRect(bx, by, bw, 8, 4);
                bar.lineStyle(1, COLORS.gold, 0.5).strokeRoundedRect(bx, by, bw, 8, 4);
                const fillW = Math.max(0, Math.min(1, frac)) * (bw - 4);
                if (fillW > 0) {
                    bar.fillStyle(complete ? 0x49d17a : COLORS.goldBright, 0.95)
                        .fillRoundedRect(bx + 2, by + 2, fillW, 4, 2);
                }
            };
            drawBar(0, false);

            this.gemShelves[ownerId] = { bg, title, bar, cx, cy, w: shelfW, h: shelfH, drawShelf: (h) => paintShelf(bg, cx, cy, h), drawBar };
            this.gemTotals[ownerId] = total;

            ELEMENTS.forEach((type, i) => {
                const x = cx - startXOffset + i * gap;
                const gem = createGemVisual(this, x, cy - 2, type, gemSize, { depth: 9, filled: false });
                const count = this.add.text(x, cy + 38, '0/0', countStyle).setOrigin(0.5).setDepth(9);
                this.gemIcons[ownerId][type] = { gem, count, type };
            });
        };

        buildShelf('player', 165, height / 2);
        buildShelf('opponent', width - 165, height / 2);

        this.setGemPanelsVisible(false);
    }

    renderGems(ownerId, progress) {
        const row = this.gemIcons[ownerId];
        if (!row || !progress) return;

        let totalHave = 0;
        let totalNeed = 0;
        let allMet = true;
        let anyRequirement = false;

        ELEMENTS.forEach((type) => {
            const slot = row[type];
            if (!slot) return;
            const p = progress[type] || { have: 0, need: 0, met: false };
            const filled = p.need > 0 && p.have >= p.need;

            slot.gem.setFilled(filled);
            slot.count.setText(`${p.have}/${p.need}`);
            slot.count.setColor(filled ? '#7CFC00' : '#ffffff');

            totalHave += p.have;
            totalNeed += p.need;
            if (p.need > 0) anyRequirement = true;
            if (!filled) allMet = false;
        });

        if (this.gemTotals[ownerId]) {
            this.gemTotals[ownerId].setText(`${totalHave} / ${totalNeed}`);
        }

        const shelf = this.gemShelves[ownerId];
            if (shelf && shelf.drawShelf && anyRequirement) {
            shelf.drawShelf(allMet);
            if (shelf.title) shelf.title.setColor(allMet ? '#ffd75a' : '#e8cf8f');
            if (shelf.bar) shelf.bar.setAlpha(1);
            if (shelf.drawBar) {
                const frac = totalNeed > 0 ? totalHave / totalNeed : 0;
                shelf.drawBar(frac, allMet);
            }
        }
    }

    handleObjectivesReady(payload) {
        if (!payload) return;
        const usesGems = !!(payload.mode && payload.mode.usesGems);
        this.setGemPanelsVisible(usesGems);
        this.renderGems('player', payload.player);
        this.renderGems('opponent', payload.opponent);
        this.updateObjectiveText(payload);
    }

    /**
     * Resume en una sola línea el objetivo de victoria del modo activo:
     * gemas requeridas, límite de turnos o reloj global. Solo presentación.
     * @param {object} payload Estado de objetivos emitido por GameScene.
     */
    updateObjectiveText(payload) {
        if (!this.objectiveSub) return;
        const mode = payload.mode || {};
        const parts = [];
        if (mode.usesGems && payload.requirements) {
            const reqs = Object.values(payload.requirements).filter((v) => v > 0);
            const total = reqs.reduce((a, b) => a + b, 0);
            const distinct = reqs.length;
            parts.push(`OBJETIVO · 6 elementos en campo · ${total} GEMAS (${distinct} TIPOS)`);
        } else {
            parts.push('OBJETIVO · 6 elementos en campo');
        }
        if (mode.maxTurns) parts.push(`${mode.maxTurns} TURNOS`);
        if (mode.matchTimeMs) parts.push(`${Math.round(mode.matchTimeMs / 60000)} MIN`);
        this.objectiveSub.setText(parts.join('   ·   '));
    }

    setGemPanelsVisible(visible) {
        ['player', 'opponent'].forEach((ownerId) => {
            const shelf = this.gemShelves[ownerId];
            if (shelf) {
                if (shelf.bg) shelf.bg.setVisible(visible);
                if (shelf.title) shelf.title.setVisible(visible);
                if (shelf.bar) shelf.bar.setAlpha(visible ? 1 : 0);
            }
            if (this.gemTotals[ownerId]) this.gemTotals[ownerId].setVisible(visible);            const row = this.gemIcons[ownerId] || {};
            ELEMENTS.forEach((type) => {
                const slot = row[type];
                if (!slot) return;
                if (slot.gem) slot.gem.setVisible(visible);
                if (slot.count) slot.count.setVisible(visible);
            });
        });
    }

    handleGemCollected(ownerId, type, progress) {
        this.renderGems(ownerId, progress);
        const slot = this.gemIcons[ownerId] && this.gemIcons[ownerId][type];
        if (!slot) return;

        if (slot.gem) {
            slot.gem.setScale(1);
            this.tweens.add({
                targets: slot.gem,
                scale: { from: 1, to: 1.5 },
                duration: 150,
                yoyo: true,
                ease: 'Back.easeOut'
            });
        }

        if (slot.count) {
            this.tweens.add({
                targets: slot.count,
                yoyo: true,
                duration: 160,
                scaleX: { from: 1, to: 1.6 },
                scaleY: { from: 1, to: 1.6 },
                ease: 'Back.easeOut',
                onComplete: () => slot.count.setScale(1)
            });
        }
    }

    /* ------------------------------------------------------------------ *
     * Fin de partida y esencias
     * ------------------------------------------------------------------ */

    showGameOverModal(winner, reason = null) {
        const { width, height } = this.scale;

        const modalObjects = [];
        const track = (obj) => { modalObjects.push(obj); return obj; };

        const REASON_LABELS = {
            timeExpired: 'Se agotó el tiempo: ambos pierden',
            playerInactive: 'Victoria por inactividad del rival',
            opponentInactive: 'El rival estuvo inactivo',
            playerObjectives: 'Gemas + control de campo cumplidos',
            opponentObjectives: 'El rival cumplió gemas y control de campo',
            playerFieldControl: 'Control de campo: 6 elementos',
            opponentFieldControl: 'El rival logró 6 elementos en campo',
            playerEssences: 'Las 6 esencias han sido activadas',
            opponentEssences: 'El rival activó las 6 esencias',
            playerTurnLimit: 'Se agotaron tus turnos sin cumplir el objetivo',
            opponentTurnLimit: 'El rival agotó sus turnos'
        };

        const overlay = track(this.add.rectangle(0, 0, width, height, 0x000000, 0.75).setOrigin(0).setDepth(100));

        const panelWidth = 560;
        const panelHeight = 330;
        track(drawOrnatePanel(this, {
            x: width / 2 - panelWidth / 2,
            y: height / 2 - panelHeight / 2,
            w: panelWidth,
            h: panelHeight,
            accent: COLORS.gold
        })).setDepth(101);

        track(ornateLabel(this, width / 2, height / 2 - 96, 'FIN DE LA PARTIDA', {
            fontSize: '26px', color: '#e8cf8f'
        })).setDepth(102);

        let resultText;
        let resultColor;
        if (winner === 'player') {
            resultText = '¡Has Ganado!';
            resultColor = '#49d17a';
        } else if (winner === 'opponent') {
            resultText = '¡Has Perdido!';
            resultColor = '#ff5a3c';
        } else if (reason === 'timeExpired') {
            resultText = '¡Tiempo Agotado!';
            resultColor = '#ffb300';
        } else {
            resultText = 'Empate';
            resultColor = '#cccccc';
        }
        track(this.add.text(width / 2, height / 2 - 30, resultText, {
            fontFamily: 'Georgia, serif', fontSize: '44px', fontStyle: 'bold',
            color: resultColor, stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(102));

        const reasonLabel = (reason && REASON_LABELS[reason]) || '';
        if (reasonLabel) {
            track(this.add.text(width / 2, height / 2 + 22, reasonLabel, {
                fontSize: '17px', color: '#ffd75a', fontStyle: 'italic',
                fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(102));
        }

        const detailText = this.buildGameOverDetail();
        if (detailText) {
            track(this.add.text(width / 2, height / 2 + 54, detailText, {
                fontSize: '17px', color: '#bfe1ff', fontStyle: 'bold',
                fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(102));
        }

        const btnWidth = 220;
        const btnHeight = 50;
        const btnX = width / 2;
        const btnY = height / 2 + 116;

        const backBtnBg = track(this.add.graphics());
        backBtnBg.fillStyle(0x3348d8, 1);
        backBtnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 12);
        backBtnBg.lineStyle(2, COLORS.gold, 0.9);
        backBtnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 12);
        backBtnBg.setDepth(102);

        track(this.add.text(btnX, btnY, 'Ir al inicio', {
            fontFamily: 'Georgia, serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(103));

        const backBtnZone = track(this.add.zone(btnX, btnY, btnWidth, btnHeight).setOrigin(0.5)
            .setInteractive({ cursor: 'pointer' }).setDepth(104));
        backBtnZone.on('pointerdown', () => {
            modalObjects.forEach((obj) => { if (obj) obj.destroy(); });
            this.scene.stop('GameScene');
            this.scene.stop('UIScene');
            this.scene.start('HomeScenes');
        });
    }

    buildGameOverDetail() {
        try {
            const gs = this.gameScene;
            if (!gs || typeof gs.getObjectivesPayload !== 'function') return '';
            const payload = gs.getObjectivesPayload();
            if (!payload || !payload.mode) return '';
            let text = `Modo: ${payload.mode.name}`;
            if (payload.mode.usesGems && payload.player) {
                let have = 0;
                let need = 0;
                Object.keys(payload.player).forEach((type) => {
                    have += payload.player[type].have;
                    need += payload.player[type].need;
                });
                text += ` · Gemas ${have}/${need}`;
            }
            return text;
        } catch (e) {
            return '';
        }
    }

    handleEssenceActivation(playerId, essenceType) {
        let targetOrb;
        if (playerId === 'player') {
            targetOrb = this.playerOrbs[essenceType];
        } else {
            targetOrb = this.opponentOrbs[essenceType];
        }

        if (targetOrb) {
            targetOrb.clearTint();
            const baseScale = targetOrb.scaleX || 0.085;
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
