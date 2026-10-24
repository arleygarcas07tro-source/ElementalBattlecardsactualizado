import Phaser from 'phaser';
import { createGemVisual, ELEMENT_ORDER } from '../helpers/gemVisual.js';
import { drawOrnatePanel, ornateLabel } from '../helpers/battlefieldArt.js';
import { GAME_CONFIG } from '../helpers/constants.js';
import { createBattleLayout } from '../helpers/battleLayout.js';
import { getGameMode } from '../game/gameModes.js';

const ELEMENTS = ELEMENT_ORDER;

// Nombre legible de cada elemento para los avisos de la interfaz.
const ELEMENT_LABELS = {
    fuego: 'Fuego',
    agua: 'Agua',
    planta: 'Planta',
    luz: 'Luz',
    sombra: 'Sombra',
    espiritu: 'Espíritu'
};

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
 * botones y el panel de gemas elementales. RediseÃ±ada con estÃ©tica de fantasÃ­a
 * (marcos ornamentales, gemas cristalinas) sin alterar eventos ni lÃ³gica.
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
        // Contador de acciones disponibles por turno (HUD).
        this.actionsTexts = {};
        // Estado previo de convergencia para emitir avisos solo cuando cambia.
        this.lastPlayerConvergence = false;
        this.lastOpponentConvergence = false;
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
        this.gameMode = getGameMode(this.gameScene?.gameMode?.id || data.gameMode?.id);

        const { width, height } = this.scale;
        this.W = width;
        this.H = height;
        this.layout = this.gameScene?.layout || createBattleLayout(width, height, { usesGems: this.gameMode.usesGems });

        // Reloj de turno: centrado sobre el área de juego.
        this.turnTimerPos = this.layout.turnTimer;

        // --- Construccion del HUD ---
        this.createProfiles();
        this.createPhaseBanner();
        this.createButtons();
        this.createTurnTimer();
        this.createMatchTimer();
        this.createEssenceOrbs();
        this.createGemPanels();

        // --- TOAST CENTRAL (feedback de poderes de esencia y convergencia) ---
        this.powerToastText = this.add.text(width / 2, this.H * 0.50, '', {
            fontSize: '20px',
            fontFamily: 'Georgia, serif',
            color: '#ffd700',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: 900 },
            backgroundColor: 'rgba(20,0,40,0.78)',
            padding: { x: 16, y: 9 },
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, fill: true }
        }).setOrigin(0.5).setDepth(1001).setVisible(false);

        // --- LISTENER DE EVENTOS ---
        this.gameScene.events.on('update-timer', this.updateTimer, this);
        this.gameScene.events.on('game-over', this.showGameOverModal, this);
        this.gameScene.events.on('essence-activated', this.handleEssenceActivation, this);
        this.gameScene.events.on('objectives-ready', this.handleObjectivesReady, this);
        this.gameScene.events.on('gem-collected', this.handleGemCollected, this);
        this.gameScene.events.on('update-match-timer', this.updateMatchTimer, this);
        this.gameScene.events.on('update-turn-indicator', this.handleTurnIndicator, this);
        this.gameScene.events.on('essence-power-used', this.handleEssencePowerUsed, this);
        this.gameScene.events.on('essence-power-failed', this.handleEssencePowerFailed, this);
        this.gameScene.events.on('gems-spent', this.handleGemsSpent, this);
        this.gameScene.events.on('update-actions-left', this.handleActionsLeft, this);
        this.gameScene.events.on('convergence-status', this.handleConvergenceStatus, this);

        const objectives = this.gameScene.getObjectivesPayload?.();
        if (objectives) this.handleObjectivesReady(objectives);

        this.scene.get('GameScene').events.on('update-attack-counter', (owner, turnIndex, mustAttack) => {
            const textObj = this.attackCounterTexts && this.attackCounterTexts[owner];
            if (!textObj) return;
            const obliged = mustAttack ? '  \u00b7  \u00a1OBLIGADO!' : '';
            textObj.setText(`ATAQUE ${turnIndex}${obliged}`);
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
                this.gameScene.events.off('essence-power-used', this.handleEssencePowerUsed, this);
                this.gameScene.events.off('essence-power-failed', this.handleEssencePowerFailed, this);
                this.gameScene.events.off('gems-spent', this.handleGemsSpent, this);
                this.gameScene.events.off('update-actions-left', this.handleActionsLeft, this);
                this.gameScene.events.off('convergence-status', this.handleConvergenceStatus, this);
                // Nos aseguramos de eliminar también el listener del contador de ataque
                // para evitar que la UI de una partida anterior reaccione a eventos de una nueva.
                this.gameScene.events.off('update-attack-counter');
                this.gameScene.events.off('update-turn-counter');
            }
        });

        this.events.off('end-player-turn');
    }

    /**
     * Actualiza cada frame los datos reales de los perfiles (mazo, mano, campo,
     * gemas) leÃ­dos del modelo de la GameScene. No altera la lÃ³gica del juego.
     */
    update() {
        this.refreshProfiles();
    }

    /* ------------------------------------------------------------------ *
     * ConstrucciÃ³n del HUD
     * ------------------------------------------------------------------ */

    createProfiles() {
        this.playerProfile = this.buildProfile('player');
        this.opponentProfile = this.buildProfile('opponent');
    }

    /**
     * Construye un panel de perfil con nombre y estadÃ­sticas reales.
     * @param {'player'|'opponent'} owner
     */
    buildProfile(owner) {
        const isPlayer = owner === 'player';
        const w = this.layout?.opponentProfile?.w || 348;
        const h = this.layout?.opponentProfile?.h || 128;
        const pos = isPlayer ? (this.layout?.playerProfile || { x: 20, y: this.H - 142 }) : (this.layout?.opponentProfile || { x: 20, y: 86 });
        const x = pos.x;
        const y = pos.y;
        const accent = isPlayer ? COLORS.blue : COLORS.red;

        const panel = drawOrnatePanel(this, { x, y, w, h, accent, fill: COLORS.panel });

        const name = isPlayer
            ? this.username
            : (this.gameScene && this.gameScene.vsBot
                ? 'BOT · NIVEL ' + ((this.gameScene.bot && this.gameScene.bot.difficulty) || 3)
                : (this.gameScene && this.gameScene.isLAN ? 'RIVAL · LAN' : 'RIVAL · EN LÍNEA'));

        const title = ornateLabel(this, x + 18, y + 21, name.toUpperCase(), {
            fontSize: '15px', color: isPlayer ? '#bfe1ff' : '#ffc2ad', originX: 0, originY: 0.5
        });
        title.setDepth(5);

        const role = this.add.text(x + w - 18, y + 21, isPlayer ? 'TÚ' : 'RIVAL', {
            fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'bold',
            color: isPlayer ? '#8fd4ff' : '#ffb08f', stroke: '#000', strokeThickness: 3
        }).setOrigin(1, 0.5).setDepth(5);

        const mkStat = (labelText, statsX) => {
            const label = this.add.text(statsX, y + 54, labelText, {
                fontFamily: 'Georgia, serif', fontSize: '11px', color: '#9fb0c8'
            }).setOrigin(0.5, 0.5).setDepth(5);
            const value = this.add.text(statsX, y + 77, '0', {
                fontFamily: 'Georgia, serif', fontSize: '21px', fontStyle: 'bold',
                color: '#ffffff', stroke: '#000', strokeThickness: 4
            }).setOrigin(0.5, 0.5).setDepth(5);
            return { label, value };
        };

        const colW = (w - 36) / 3;
        const baseX = x + 18;
        const deck = mkStat('MAZO', baseX + colW * 0.5);
        const hand = mkStat('MANO', baseX + colW * 1.5);
        const field = mkStat('CAMPO', baseX + colW * 2.5);

        const attackText = this.add.text(x + w - 18, y + h - 10, '', {
            fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold',
            color: '#d7e6ff', stroke: '#000', strokeThickness: 3
        }).setOrigin(1, 1).setDepth(5);

        if (!this.attackCounterTexts) this.attackCounterTexts = {};
        this.attackCounterTexts[owner] = attackText;

        // Contador de acciones disponibles del turno (atacar, colocar, fusionar).
        const actionsText = this.add.text(x + 18, y + h - 10, '', {
            fontFamily: 'Arial', fontSize: '11px', fontStyle: 'bold',
            color: '#8fd4ff', stroke: '#000', strokeThickness: 3
        }).setOrigin(0, 1).setDepth(5);

        if (!this.actionsTexts) this.actionsTexts = {};
        this.actionsTexts[owner] = actionsText;

        return { panel, title, role, deck, hand, field, attackText, actionsText };
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
                const fieldCount = typeof player.field?.count === 'function'
                    ? player.field.count()
                    : (player.field || []).filter(Boolean).length;
                profile.field.value.setText(String(fieldCount));
            } catch { /* modelo aún no listo */ }
        };

        fill(this.playerProfile, gs.player);
        fill(this.opponentProfile, gs.opponent);
    }

    createPhaseBanner() {
        const p = this.layout?.phasePanel || { x: this.W / 2 - 250, y: 8, w: 500, h: 64 };
        const w = p.w;
        const h = p.h;
        const x = p.x;
        const y = p.y;
        drawOrnatePanel(this, { x, y, w, h, accent: COLORS.gold, fill: COLORS.panelDeep });

        this.phaseText = this.add.text(this.W / 2, y + Math.round(h / 2 - 6), 'PREPARADO', {
            fontFamily: 'Georgia, serif', fontSize: '23px', fontStyle: 'bold',
            color: '#e8cf8f', stroke: '#000', strokeThickness: 5, letterSpacing: 2
        }).setOrigin(0.5).setDepth(5);

        // Contador de turnos en la esquina del estandarte (se actualiza por evento).
        this.turnCounterText = this.add.text(x + w - 16, y + Math.round(h / 2 - 6), '', {
            fontFamily: 'Georgia, serif', fontSize: '14px', fontStyle: 'bold',
            color: '#bfe1ff', stroke: '#000', strokeThickness: 3
        }).setOrigin(1, 0.5).setDepth(5);
        this.turnCounterText.setVisible(!!this.gameMode.maxTurns);
        this.events.off('update-turn-counter');
        this.gameScene.events.off('update-turn-counter');
        this.gameScene.events.on('update-turn-counter', (playerTurn, opponentTurn, max) => {
            if (!this.turnCounterText) return;
            this.turnCounterText.setText(max
                ? `TÚ ${playerTurn}/${max} · RIVAL ${opponentTurn}/${max}`
                : `T${playerTurn}`);
        });

        this.phaseSub = this.add.text(this.W / 2, y + h - 12, '', {
            fontFamily: 'Georgia, serif', fontSize: '11px', color: '#9fb0c8',
            stroke: '#000', strokeThickness: 3, letterSpacing: 1
        }).setOrigin(0.5).setDepth(5);

        // Ciclo elemental compacto, siempre visible y dentro del muelle derecho.
        const ds = this.layout?.dockSections?.status;
        if (ds) {
            this.objectiveSub = this.add.text(ds.x + ds.w / 2, ds.y + ds.h / 2, '', {
                fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'bold',
                color: '#c9b47a', stroke: '#000', strokeThickness: 3, letterSpacing: 0.5,
                align: 'center',
                wordWrap: { width: ds.w - 12 }
            }).setOrigin(0.5).setDepth(5);
        } else {
            this.objectiveSub = this.add.text(this.W / 2, this.H - 24, '', {
                fontFamily: 'Georgia, serif', fontSize: '12px', fontStyle: 'bold',
                color: '#c9b47a', stroke: '#000', strokeThickness: 3, letterSpacing: 1
            }).setOrigin(0.5).setDepth(5);
        }
    }

    createButtons() {
        // --- BOTÓN DE PAUSA ---
        const pb = this.layout?.pauseButton || { x: 48, y: 42, radius: 26 };
        const px = pb.x;
        const py = pb.y;
        const pr = pb.radius;
        const ring = this.add.graphics().setDepth(1000);
        ring.fillStyle(0x0a0e1c, 0.94).fillCircle(px, py, pr);
        ring.lineStyle(2, COLORS.gold, 0.9).strokeCircle(px, py, pr);
        ring.lineStyle(1, COLORS.goldBright, 0.35).strokeCircle(px, py, pr - 6);

        const pauseBars = [
            this.add.rectangle(px - 6, py, 5, 20, COLORS.goldBright).setDepth(1001),
            this.add.rectangle(px + 6, py, 5, 20, COLORS.goldBright).setDepth(1001)
        ];

        const pauseZone = this.add.zone(px, py, pr * 2 + 10, pr * 2 + 10).setOrigin(0.5)
            .setInteractive({ useHandCursor: true }).setDepth(1002);
        pauseZone.on('pointerover', () => pauseBars.forEach(bar => bar.setFillStyle(0xffffff)));
        pauseZone.on('pointerout', () => pauseBars.forEach(bar => bar.setFillStyle(COLORS.goldBright)));
        pauseZone.on('pointerdown', () => {
            this.scene.pause('GameScene');
            this.scene.pause('UIScene');
            this.scene.launch('PauseScene');
        });

        // --- BOTÓN INICIAR PARTIDA ---
        const sb = this.layout?.startButton || { x: this.W - 210 - 24, y: 14, w: 210, h: 44 };
        const bw = sb.w;
        const bh = sb.h;
        const bx = sb.x + bw / 2;
        const by = sb.y + bh / 2;

        const startContainer = this.add.container(bx, by).setDepth(5);
        const startBg = this.add.graphics();
        startBg.fillStyle(0x0c2a12, 0.94);
        startBg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
        startBg.lineStyle(2, 0x49d17a, 0.95);
        startBg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
        startBg.lineStyle(1, 0x9effc0, 0.35);
        startBg.strokeRoundedRect(-bw / 2 + 5, -bh / 2 + 5, bw - 10, bh - 10, 8);

        const playIcon = this.add.graphics();
        playIcon.fillStyle(0x9effc0, 0.95);
        playIcon.fillTriangle(-bw / 2 + 22, -8, -bw / 2 + 22, 8, -bw / 2 + 34, 0);

        const startText = this.add.text(8, 0, 'INICIAR PARTIDA', {
            fontFamily: 'Georgia, serif', fontSize: '19px', fontStyle: 'bold',
            color: '#d8ffe6', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        startContainer.add([startBg, playIcon, startText]);
        startContainer.setSize(bw, bh).setInteractive({ useHandCursor: true });
        startContainer.on('pointerover', () => startContainer.setScale(1.04));
        startContainer.on('pointerout', () => startContainer.setScale(1));
        startContainer.on('pointerdown', () => {
            this.gameScene.events.emit('start-game');
            startContainer.setVisible(false);
        });
    }

    createTurnTimer() {
        const pos = this.turnTimerPos || { x: this.W / 2 + 330, y: 40, radius: 34 };
        const cx = pos.x;
        const cy = pos.y;
        const r = pos.radius || 34;

        const base = this.add.graphics().setDepth(6);
        base.fillStyle(0x000000, 0.4).fillCircle(cx, cy + 2, r + 4);
        base.fillStyle(0x0a0e1c, 0.94).fillCircle(cx, cy, r + 4);
        base.lineStyle(2, COLORS.gold, 0.55).strokeCircle(cx, cy, r + 4);
        base.lineStyle(1, 0xffffff, 0.12).strokeCircle(cx, cy, r - 2);

        // Arco de progreso (se redibuja en cada tick).
        this.timerArc = this.add.graphics().setDepth(7);

        this.timerText = this.add.text(cx, cy, '', {
            fontFamily: 'Georgia, serif', fontSize: Math.round(r * 1.0) + 'px', fontStyle: 'bold',
            color: '#ffffff', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(8);

        this.timerLabel = this.add.text(cx, cy - (r + 16), 'TURNO', {
            fontFamily: 'Georgia, serif', fontSize: '11px', color: '#9fb0c8',
            stroke: '#000', strokeThickness: 3, letterSpacing: 1
        }).setOrigin(0.5).setDepth(8);

        this._timerColor = COLORS.blue;
        this._timerFrac = 1;
        this.drawTimerArc();
    }

    /** Redibuja el arco de progreso del temporizador. */
    drawTimerArc() {
        if (!this.timerArc) return;
        const pos = this.turnTimerPos || { x: this.W / 2 + 330, y: 40, radius: 34 };
        const cx = pos.x;
        const cy = pos.y;
        const r = pos.radius || 34;
        const frac = Phaser.Math.Clamp(this._timerFrac, 0, 1);
        this.timerArc.clear();
        this.timerArc.lineStyle(4, 0x12233d, 1).strokeCircle(cx, cy, r + 2);
        if (frac > 0) {
            const start = -Math.PI / 2;
            const end = start + frac * Math.PI * 2;
            this.timerArc.lineStyle(4, this._timerColor, 0.98);
            this.timerArc.beginPath();
            this.timerArc.arc(cx, cy, r + 2, start, end, false);
            this.timerArc.strokePath();
        }
        this.timerArc.lineStyle(1, 0xffffff, 0.12).strokeCircle(cx, cy, r - 4);
    }

    /** Redibuja el anillo del temporizador con el color de la fase activa. */
    drawTurnRing(color) {
        this._timerColor = color;
        this.drawTimerArc();
    }

    createMatchTimer() {
        const mp = this.layout?.matchTimerPanel || { x: this.W - 210 - 24, y: 64, w: 210, h: 38 };
        const w = mp.w;
        const h = mp.h;
        const x = mp.x;
        const y = mp.y;
        this.matchPanel = drawOrnatePanel(this, { x, y, w, h, accent: COLORS.gold, fill: COLORS.panelDeep });
        this.matchPanel.setVisible(false);

        this.matchTimerText = this.add.text(x + w / 2, y + h / 2, '', {
            fontFamily: 'Georgia, serif', fontSize: '16px', fontStyle: 'bold',
            color: '#ffff88', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(6).setVisible(false);
    }

    /* ------------------------------------------------------------------ *
     * Orbes de esencia
     * ------------------------------------------------------------------ */

    createEssenceOrbs() {
        if (this.essenceGraphics && this.essenceGraphics.length) {
            this.essenceGraphics.forEach(g => g.destroy?.());
        }
        this.essenceGraphics = [];

        const ds = this.layout?.dockSections?.essence;
        if (ds) {
            this.createEssencePanelDock('player', ds, COLORS.blue);
        } else {
            const sideX = 150;
            this.createEssencePanel('player', sideX, this.H * 0.622, COLORS.blue);
        }
    }

    createEssencePanelDock(ownerId, ds, accent) {
        const isPlayer = ownerId === 'player';
        const panel = drawOrnatePanel(this, {
            x: ds.x, y: ds.y, w: ds.w, h: ds.h, accent, fill: COLORS.panelDeep
        }).setDepth(4);
        this.essenceGraphics.push(panel);

        const title = ornateLabel(this, ds.x + ds.w / 2, ds.y + 14, isPlayer ? 'TUS ESENCIAS' : 'ESENCIAS', {
            fontSize: '11px',
            color: isPlayer ? '#bfe1ff' : '#ffc2ad'
        }).setDepth(6);
        this.essenceGraphics.push(title);

        const columns = [ds.x + ds.w * 0.28, ds.x + ds.w * 0.72];
        const rows = [ds.y + ds.h * 0.32, ds.y + ds.h * 0.56, ds.y + ds.h * 0.80];
        const orbR = Math.min(20, Math.round(ds.w * 0.13));
        const inactiveTint = 0x596477;

        ELEMENTS.forEach((type, i) => {
            const x = columns[i % 2];
            const y = rows[Math.floor(i / 2)];

            const ring = this.add.graphics().setDepth(5);
            ring.fillStyle(0x05070e, 0.92).fillCircle(x, y, orbR + 2);
            ring.lineStyle(2, accent, 0.58).strokeCircle(x, y, orbR + 2);
            ring.lineStyle(1, COLORS.gold, 0.35).strokeCircle(x, y, orbR);
            this.essenceGraphics.push(ring);

            const sprite = this.add.image(x, y, `orb-${type}`)
                .setDisplaySize(orbR * 1.6, orbR * 1.6)
                .setTint(inactiveTint)
                .setDepth(6)
                .setInteractive({ useHandCursor: isPlayer });
            sprite.setData('type', type);
            sprite.setData('owner', ownerId);
            sprite.setData('active', false);
            sprite.setData('ring', ring);
            this.essenceGraphics.push(sprite);

            if (isPlayer) {
                sprite.on('pointerover', () => {
                    if (!sprite.getData('active')) sprite.setTint(0x9aa8bd);
                });
                sprite.on('pointerout', () => {
                    if (!sprite.getData('active')) sprite.setTint(inactiveTint);
                });
                const orbType = type;
                sprite.on('pointerdown', () => {
                    if (this.gameScene && this.gameScene.events) {
                        this.gameScene.events.emit('request-essence-power', orbType);
                    }
                });
            }

            if (isPlayer) this.playerOrbs[type] = sprite;
            else this.opponentOrbs[type] = sprite;
        });
    }

    /**
     * Panel compacto de esencias: seis orbes en rejilla 2×3, sin flechas ni
     * diagramas flotantes. Responsabilidad agregada: reunir el estado de las
     * esencias y sus poderes en un único bloque lateral legible.
     * @param {'player'|'opponent'} ownerId
     * @param {number} cx
     * @param {number} cy
     * @param {number} accent
     */
    createEssencePanel(ownerId, cx, cy, accent) {
        const w = 214;
        const h = 194;
        const isPlayer = ownerId === 'player';

        const panel = drawOrnatePanel(this, {
            x: cx - w / 2, y: cy - h / 2, w, h, accent, fill: COLORS.panelDeep
        }).setDepth(4);
        this.essenceGraphics.push(panel);

        const title = ornateLabel(this, cx, cy - h / 2 + 18, isPlayer ? 'TUS ESENCIAS' : 'ESENCIAS RIVAL', {
            fontSize: '12px',
            color: isPlayer ? '#bfe1ff' : '#ffc2ad'
        }).setDepth(6);
        this.essenceGraphics.push(title);

        const columns = [cx - 46, cx + 46];
        const rows = [cy - 36, cy + 12, cy + 60];
        const inactiveTint = 0x596477;

        ELEMENTS.forEach((type, i) => {
            const x = columns[i % 2];
            const y = rows[Math.floor(i / 2)];

            const ring = this.add.graphics().setDepth(5);
            ring.fillStyle(0x05070e, 0.92).fillCircle(x, y, 22);
            ring.lineStyle(2, accent, 0.58).strokeCircle(x, y, 22);
            ring.lineStyle(1, COLORS.gold, 0.35).strokeCircle(x, y, 18);
            this.essenceGraphics.push(ring);

            const sprite = this.add.image(x, y, `orb-${type}`)
                .setDisplaySize(34, 34)
                .setTint(inactiveTint)
                .setDepth(6)
                .setInteractive({ useHandCursor: isPlayer });
            sprite.setData('type', type);
            sprite.setData('owner', ownerId);
            sprite.setData('active', false);
            sprite.setData('ring', ring);
            this.essenceGraphics.push(sprite);

            // Poderes de esencia: el orbe propio activo se puede pulsar para
            // disparar el poder de esa esencia (una vez por turno propio).
            if (isPlayer) {
                sprite.on('pointerover', () => {
                    if (!sprite.getData('active')) sprite.setTint(0x9aa8bd);
                });
                sprite.on('pointerout', () => {
                    if (!sprite.getData('active')) sprite.setTint(inactiveTint);
                });
                const orbType = type;
                sprite.on('pointerdown', () => {
                    if (this.gameScene && this.gameScene.events) {
                        this.gameScene.events.emit('request-essence-power', orbType);
                    }
                });
            }

            if (isPlayer) this.playerOrbs[type] = sprite;
            else this.opponentOrbs[type] = sprite;
        });
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
     * anillo del temporizador. PresentaciÃ³n basada en el evento real del juego.
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
        if (!this.gameMode.usesGems) return;

        const ds = this.layout?.dockSections?.gems;
        const gap = this.layout?.px ? this.layout.px(14) : 14;
        const gemSize = this.layout?.px ? Math.max(16, this.layout.px(18)) : 18;
        const shelfW = ds ? ds.w : 270;
        const shelfH = ds ? ds.h : 146;
        const cx = ds ? ds.x + ds.w / 2 : 150;
        const cy = ds ? ds.y + ds.h / 2 : 430;
        const startXOffset = (gap * (ELEMENTS.length - 1)) / 2;

        const titleStyle = {
            fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'bold',
            color: '#e8cf8f', stroke: '#000000', strokeThickness: 3, letterSpacing: 1
        };
        const countStyle = {
            fontFamily: 'Georgia, serif', fontSize: '11px', fontStyle: 'bold',
            color: '#ffffff', stroke: '#000000', strokeThickness: 3
        };

        const paintShelf = (g, x, y, highlight) => {
            g.clear();
            g.fillStyle(0x000000, 0.35).fillRoundedRect(x, y + 4, shelfW, shelfH, 14);
            g.fillStyle(highlight ? 0x2a1f04 : COLORS.panel, highlight ? 0.86 : 0.82)
                .fillRoundedRect(x, y, shelfW, shelfH, 14);
            const stroke = highlight ? 0xffd75a : COLORS.gold;
            g.lineStyle(2, stroke, highlight ? 0.95 : 0.7).strokeRoundedRect(x, y, shelfW, shelfH, 14);
            g.lineStyle(1, stroke, 0.3).strokeRoundedRect(x + 6, y + 6, shelfW - 12, shelfH - 12, 10);
        };

        const buildShelf = (ownerId, sx, sy) => {
            const bg = this.add.graphics().setDepth(8);
            const x = sx - shelfW / 2;
            const y = sy - shelfH / 2;
            paintShelf(bg, x, y, false);

            const title = this.add.text(x + 12, y + 12, ownerId === 'player' ? 'TUS GEMAS' : 'GEMAS RIVAL', titleStyle)
                .setOrigin(0, 0.5).setDepth(9);
            const total = this.add.text(x + shelfW - 12, y + 12, '0 / 0', {
                ...titleStyle, fontSize: '13px', color: '#f1c86a'
            }).setOrigin(1, 0.5).setDepth(9);

            const bar = this.add.graphics().setDepth(8).setAlpha(0);
            const drawBar = (frac, complete) => {
                const bw = shelfW - 28;
                const bx = x + 14;
                const by = y + shelfH - 14;
                bar.clear();
                bar.fillStyle(0x05070e, 0.9).fillRoundedRect(bx, by, bw, 6, 3);
                bar.lineStyle(1, COLORS.gold, 0.5).strokeRoundedRect(bx, by, bw, 6, 3);
                const fillW = Math.max(0, Math.min(1, frac)) * (bw - 4);
                if (fillW > 0) {
                    bar.fillStyle(complete ? 0x49d17a : COLORS.goldBright, 0.95)
                        .fillRoundedRect(bx + 2, by + 2, fillW, 2, 2);
                }
            };
            drawBar(0, false);

            this.gemShelves[ownerId] = { bg, title, bar, cx: sx, cy: sy, w: shelfW, h: shelfH, drawShelf: (h) => paintShelf(bg, x, y, h), drawBar };
            this.gemTotals[ownerId] = total;

            ELEMENTS.forEach((type, i) => {
                const gx = sx - startXOffset + i * gap;
                const gy = sy + 6;
                const gem = createGemVisual(this, gx, gy, type, gemSize, { depth: 9, filled: false });
                const count = this.add.text(gx, gy + shelfH * 0.28, '0/0', countStyle).setOrigin(0.5).setDepth(9);
                this.gemIcons[ownerId][type] = { gem, count, type };
            });
        };

        buildShelf('player', cx, cy);

        // El rival solo aparece en modos con objetivo de gemas.
        this.setGemPanelVisible('player', this.gameMode.usesGems);
        this.setGemPanelVisible('opponent', false);
        this.refreshGemCounts();
    }

    /**
     * Vuelca en la interfaz los contadores de gemas reales de ambos jugadores.
     */
    refreshGemCounts() {
        const gs = this.gameScene;
        if (!gs) return;
        const player = gs.player;
        const opponent = gs.opponent;
        if (player && player.gems && typeof player.gems.progress === 'function') {
            this.renderGems('player', player.gems.progress());
        }
        if (opponent && opponent.gems && typeof opponent.gems.progress === 'function') {
            this.renderGems('opponent', opponent.gems.progress());
        }
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
            // Sin requisitos de objetivo solo se muestra lo que se tiene.
            slot.count.setText(p.need > 0 ? `${p.have}/${p.need}` : `${p.have}`);
            slot.count.setColor(filled ? '#7CFC00' : '#ffffff');

            totalHave += p.have;
            totalNeed += p.need;
            if (p.need > 0) anyRequirement = true;
            if (!filled) allMet = false;
        });

        if (this.gemTotals[ownerId]) {
            this.gemTotals[ownerId].setText(totalNeed > 0 ? `${totalHave} / ${totalNeed}` : `${totalHave}`);
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
        this.setGemPanelVisible('player', usesGems);
        this.setGemPanelVisible('opponent', usesGems);
        this.renderGems('player', payload.player);
        this.renderGems('opponent', payload.opponent);
        this.updateObjectiveText(payload);
    }

    /**
     * Resume en una sola lÃ­nea el objetivo de victoria del modo activo:
     * gemas requeridas, lÃ­mite de turnos o reloj global. Solo presentaciÃ³n.
     * @param {object} payload Estado de objetivos emitido por GameScene.
     */
    updateObjectiveText(payload) {
        if (!this.objectiveSub) return;
        const mode = payload.mode || this.gameMode;
        if (mode.usesGems && payload.requirements) {
            const reqs = Object.values(payload.requirements).filter((v) => v > 0);
            const total = reqs.reduce((a, b) => a + b, 0);
            this.objectiveSub.setText(`${total} GEMAS · 6 ELEMENTOS EN CAMPO`);
        } else if (mode.matchTimeMs) {
            this.objectiveSub.setText(`CONTRARRELOJ · ${Math.round(mode.matchTimeMs / 60000)} MINUTOS`);
        } else if (mode.maxTurns) {
            this.objectiveSub.setText(`LÍMITE · ${mode.maxTurns} TURNOS`);
        } else {
            this.objectiveSub.setText('CLÁSICO · 6 ESENCIAS O CONTROL DEL CAMPO');
        }
    }

    setGemPanelsVisible(visible) {
        ['player', 'opponent'].forEach((ownerId) => {
            this.setGemPanelVisible(ownerId, visible);
        });
    }

    /**
     * Muestra u oculta la estanteria de gemas de un jugador.
     * @param {'player'|'opponent'} ownerId
     * @param {boolean} visible
     */
    setGemPanelVisible(ownerId, visible) {
        const shelf = this.gemShelves[ownerId];
        if (shelf) {
            if (shelf.bg) shelf.bg.setVisible(visible);
            if (shelf.title) shelf.title.setVisible(visible);
            if (shelf.bar) shelf.bar.setAlpha(visible ? 1 : 0);
        }
        if (this.gemTotals[ownerId]) this.gemTotals[ownerId].setVisible(visible);
        const row = this.gemIcons[ownerId] || {};
        ELEMENTS.forEach((type) => {
            const slot = row[type];
            if (!slot) return;
            if (slot.gem) slot.gem.setVisible(visible);
            if (slot.count) slot.count.setVisible(visible);
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
            bothTurnLimits: 'Ambos jugadores agotaron sus 30 turnos',
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

        const _overlay = track(this.add.rectangle(0, 0, width, height, 0x000000, 0.75).setOrigin(0).setDepth(100));

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
                fontSize: '18px', color: '#ffd75a', fontStyle: 'italic',
                fontFamily: 'Arial', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(102));
        }

        const detailText = this.buildGameOverDetail();
        if (detailText) {
            track(this.add.text(width / 2, height / 2 + 54, detailText, {
                fontSize: '18px', color: '#bfe1ff', fontStyle: 'bold',
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
        } catch {
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
            targetOrb.setData('active', true);
            const baseScale = targetOrb.scaleX || 0.085;
            const pulseScale = baseScale * 1.25;
            this.tweens.add({
                targets: targetOrb,
                scaleX: pulseScale,
                scaleY: pulseScale,
                duration: 180,
                yoyo: true,
                ease: 'Power1',
                onComplete: () => targetOrb.setScale(baseScale)
            });
        }
    }

    /**
     * Manejador del evento 'essence-power-used'.
     * @param {string} essenceType Tipo de esencia usada.
     * @param {string} powerName Nombre del poder ejecutado.
     */
    handleEssencePowerUsed(essenceType, powerName) {
        console.log('[UIScene] Poder de esencia usado', { essenceType, powerName });
        this.showToast(powerName, 1600);
        const orb = this.playerOrbs[essenceType];
        if (orb) {
            const baseScale = orb.scaleX || 0.08;
            this.tweens.add({
                targets: orb,
                scaleX: baseScale * 1.2,
                scaleY: baseScale * 1.2,
                duration: 150,
                yoyo: true,
                ease: 'Power1'
            });
        }
    }

    /**
     * Manejador del evento 'convergence-status'. Avisa solo cuando cambia el
     * estado: el jugador armÃ³ su convergencia o el rival armÃ³ la suya.
     * @param {{player: boolean, opponent: boolean}} status
     */
    handleConvergenceStatus(status) {
        const playerArmed = !!status.player;
        const opponentArmed = !!status.opponent;
        const playerChanged = playerArmed !== this.lastPlayerConvergence;
        const opponentChanged = opponentArmed !== this.lastOpponentConvergence;
        this.lastPlayerConvergence = playerArmed;
        this.lastOpponentConvergence = opponentArmed;

        if (playerArmed && playerChanged) {
            this.showToast('CONVERGENCIA: protege tus 6 tipos hasta tu próximo turno', 4000);
        } else if (opponentArmed && opponentChanged) {
            this.showToast('¡El rival selló su Convergencia! Destruye uno de sus tipos', 4000);
        }
    }

    /**
     * Manejador del evento 'update-actions-left'. Muestra el cupo de acciones
     * que le queda a cada jugador en su turno.
     * @param {'player'|'opponent'} owner Dueño del turno.
     * @param {number} remaining Acciones disponibles.
     * @param {number} max Cupo total del turno.
     */
    handleActionsLeft(owner, remaining, max) {
        const textObj = this.actionsTexts && this.actionsTexts[owner];
        if (!textObj) return;
        const total = max || GAME_CONFIG.ACTIONS_PER_TURN;
        textObj.setText(`ACCIONES ${remaining}/${total}`);
        textObj.setColor(remaining > 0 ? '#8fd4ff' : '#ff6b6b');
    }

    /**
     * Manejador del evento 'gems-spent'. Refresca el contador de gemas tras
     * pagar el coste de un poder de esencia.
     * @param {{ownerId: string, type: string, progress: object}} info
     */
    handleGemsSpent(info) {
        if (!info) return;
        this.renderGems(info.ownerId, info.progress);
    }

    /**
     * Manejador del evento 'essence-power-failed'. Explica por que no se pudo
     * activar el poder (gemas insuficientes, essence inactive, already used).
     * @param {string} essenceType Tipo de esencia.
     * @param {string} reason Codigo del rechazo.
     * @param {{name?: string, gemCost?: number}} [info]
     */
    handleEssencePowerFailed(essenceType, reason, info = {}) {
        const label = this.describePowerFailure(essenceType, reason, info);
        console.log('[UIScene] Poder de esencia no disponible', { essenceType, reason });
        this.showToast(label, 2400);
    }

    /**
     * Traduce el rechazo de un poder de esencia a un mensaje para el jugador.
     * @param {string} essenceType Tipo de esencia.
     * @param {string} reason Codigo del rechazo.
     * @param {{name?: string, gemCost?: number}} info
     * @returns {string}
     */
    describePowerFailure(essenceType, reason, info = {}) {
        const element = ELEMENT_LABELS[essenceType] || essenceType;
        const powerName = info.name || 'Ese poder';
        switch (reason) {
            case 'sin-gemas':
                return `Necesitas ${info.gemCost || 1} gemas de ${element} para ${powerName}`;
            case 'poder-agotado':
                return `${powerName} ya se uso este turno`;
            case 'esencia-inactiva':
                return `La esencia de ${element} no esta activa`;
            case 'sin-cementerio':
                return `${powerName} necesita una carta en tu cementerio`;
            case 'rival-sin-mano':
                return `${powerName} necesita que el rival tenga cartas en la mano`;
            case 'es-tu-turno':
                return 'Solo puedes usar poderes en tu turno';
            default:
                return `No puedes usar ${powerName} ahora`;
        }
    }

    /**
     * Muestra un aviso temporal centrado (poderes y convergencia).
     * @param {string} text
     * @param {number} duration ms de visibilidad total.
     */
    showToast(text, duration) {
        if (!this.powerToastText) return;
        this.powerToastText.setText(text).setVisible(true);
        this.tweens.killTweensOf(this.powerToastText);
        this.powerToastText.setAlpha(1);
        this.tweens.add({
            targets: this.powerToastText,
            delay: duration,
            alpha: 0,
            duration: 300,
            onComplete: () => { this.powerToastText.setVisible(false); }
        });
    }
}
