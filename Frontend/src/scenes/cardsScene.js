import { ADVANTAGES, CARD_TYPES } from '../helpers/constants.js';
import { play as playSfx } from '../helpers/audioManager.js';

const TYPE_LABELS = {
    [CARD_TYPES.AGUA]: 'Agua',
    [CARD_TYPES.FUEGO]: 'Fuego',
    [CARD_TYPES.PLANTA]: 'Planta',
    [CARD_TYPES.LUZ]: 'Luz',
    [CARD_TYPES.SOMBRA]: 'Sombra',
    [CARD_TYPES.ESPIRITU]: 'Espíritu'
};

const LEVEL_LABELS = { 1: 'I', 2: 'II', 3: 'III' };

export default class CardsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CardsScene' });

        this.cardsContainer = null;
        this.currentTooltip = null;
        this.cardWidth = 170;
        this.cardHeight = 240;
        this.elements = Object.values(CARD_TYPES);

        this.cards = [];
        for (const element of this.elements) {
            for (let level = 1; level <= 3; level++) {
                this.cards.push({ element, level });
            }
        }
    }

    init(data) {
        this.playerData = data.playerData || {};
    }

    preload() {
        this.load.image('fondocartas', '/assets/images/fondo_cartas/fondocartas.jpeg');

        for (const element of this.elements) {
            for (let level = 1; level <= 3; level++) {
                const key = `carta-${element}-${level}`;
                this.load.image(key, `/assets/images/cartas/${key}.jpeg`);
            }
        }
    }

    create() {
        const { width, height } = this.scale;

        this.add.image(width / 2, height / 2, 'fondocartas').setDisplaySize(width, height);

        this.createBackButton();
        this.createHeader();

        this.createCardGrid();

        this.add.text(width / 2, height - 35, 'Los 6 tipos elementales con sus 3 niveles de fusión y sus ventajas elementales.', {
            fontFamily: 'Poppins',
            fontSize: '16px',
            color: 'rgba(255,255,255,0.75)'
        }).setOrigin(0.5);
    }

    createBackButton() {
        const volver = this.add.text(40, 35, '← VOLVER', {
            fontFamily: 'Cinzel',
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#C9A86A',
            stroke: '#3E2B14',
            strokeThickness: 2
        });

        volver.setInteractive({ useHandCursor: true });

        volver.on('pointerover', () => {
            volver.setColor('#E7C98B');
        });

        volver.on('pointerout', () => {
            volver.setColor('#C9A86A');
        });

        volver.on('pointerdown', () => volver.setColor('#A87E3D'));
        volver.on('pointerup', () => {
            volver.setColor('#E7C98B');
            playSfx('click', this);
            this.scene.start('HomeScenes', { playerData: this.playerData });
        });
    }

    createHeader() {
        const { width } = this.scale;

        this.add.text(width / 2, 52, 'Colección de cartas', {
            fontFamily: 'Cinzel',
            fontSize: '40px',
            fontStyle: 'bold',
            color: '#F1E7BC',
            stroke: '#3E2B14',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(width / 2, 92, this.cards.length + ' cartas · 6 elementos · 3 niveles', {
            fontFamily: 'Poppins',
            fontSize: '18px',
            color: '#E7C98B'
        }).setOrigin(0.5);
    }

    createCardGrid() {
        const { width } = this.scale;
        const columns = 6;
        const horizontalSpacing = 215;
        const verticalSpacing = 252;

        const startX = (width - (horizontalSpacing * (columns - 1) + this.cardWidth)) / 2;
        const startY = 165;

        this.cardsContainer = this.add.container(0, 0);

        const panelX = startX - 40;
        const panelY = startY - 55;
        const panelW = horizontalSpacing * (columns - 1) + this.cardWidth + 80;
        const panelH = verticalSpacing * 2 + this.cardHeight + 120;

        const panel = this.add.graphics();
        panel.fillStyle(0x170f24, 0.6);
        panel.lineStyle(2, 0xC9A86A, 0.4);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);
        this.cardsContainer.add(panel);

        this.cards.forEach((card, index) => {
            const column = index % columns;
            const row = Math.floor(index / columns);

            const x = startX + (column * horizontalSpacing);
            const y = startY + (row * verticalSpacing);

            const imageKey = `carta-${card.element}-${card.level}`;
            const carta = this.add.image(x, y, imageKey)
                .setDisplaySize(this.cardWidth, this.cardHeight)
                .setInteractive({ useHandCursor: true });

            carta.on('pointerover', () => {
                this.cardsContainer.bringToTop(carta);
                this.showTooltip(this.getTooltipText(card), x, y - this.cardHeight / 2 - 10);
            });

            carta.on('pointerout', () => this.clearTooltip());
            carta.on('pointerup', () => playSfx('click', this));

            const label = this.add.text(
                x,
                y + this.cardHeight / 2 + 16,
                `${TYPE_LABELS[card.element]} · Nivel ${LEVEL_LABELS[card.level]}`,
                {
                    fontFamily: 'Cinzel',
                    fontSize: '17px',
                    fontStyle: 'bold',
                    color: '#C9A86A',
                    stroke: '#3E2B14',
                    strokeThickness: 2
                }
            ).setOrigin(0.5, 0);

            this.cardsContainer.add([carta, label]);
        });
    }

    getTooltipText(card) {
        const advantage = ADVANTAGES[card.element];
        return `${TYPE_LABELS[card.element]} — Nivel ${card.level} · Vence a ${TYPE_LABELS[advantage]}`;
    }

    showTooltip(text, x, y) {
        this.clearTooltip();
        this.currentTooltip = this.add.text(x, y, text, {
            fontFamily: 'Poppins',
            fontSize: '15px',
            color: '#F1E7BC',
            backgroundColor: 'rgba(23,15,36,0.9)',
            padding: { x: 10, y: 6 }
        }).setOrigin(0.5, 1).setDepth(100);
    }

    clearTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.destroy();
            this.currentTooltip = null;
        }
    }

    update() {}
}