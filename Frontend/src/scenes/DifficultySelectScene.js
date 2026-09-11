import Phaser from 'phaser';

/**
 * Escena para seleccionar el nivel de dificultad antes de jugar contra el bot.
 * Ofrece 10 niveles de dificultad con descripción visual.
 */
export default class DifficultySelectScene extends Phaser.Scene {
    constructor() {
        super('DifficultySelectScene');
        this.playerData = null;
    }

    init(data) {
        this.playerData = data;
    }

    preload() {
        this.load.video('levels-bg-video', '/assets/images/levels/fondoSELE.mp4', { muted: true, noAudio: true });
    }

    create() {
        const { width, height } = this.scale;

        // Fondo inmediato para que nunca se vea un hueco negro mientras el video
        // termina de preparar su primer frame.
        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0e22).setDepth(-2);

        this.bg = this.add.video(width / 2, height / 2, 'levels-bg-video').setOrigin(0.5);
        this.bg.setDepth(-1); // Poner el video al fondo

        // Esperar a que el video esté listo para escalar correctamente
        this.bg.on('play', () => {
            const scaleX = width / this.bg.width;
            const scaleY = height / this.bg.height;
            const scale = Math.max(scaleX, scaleY);
            this.bg.setScale(scale);
        });

        this.bg.once('ready', () => {
            const videoEl = this.bg.video;

            if (!videoEl) {
                return;
            }

            videoEl.muted = true;
            videoEl.defaultMuted = true;
            videoEl.loop = true; // Bucle continuo: al terminar, se reinicia desde el inicio.
            videoEl.playbackRate = 1;
            videoEl.playsInline = true;
            videoEl.preload = 'auto';
            videoEl.currentTime = 0;
            videoEl.play().catch(() => {});
        });

        this.bg.play(true); // Reproducir en bucle

        const levels = [
            { level: 1,  name: 'Muy Fácil',   icon: 'agua',   clr: '#5bc0ff', desc: 'El bot comete errores, no fusiona cartas.' },
            { level: 2,  name: 'Fácil',       icon: 'planta', clr: '#7fe09a', desc: 'El bot juega con decisiones predecibles.' },
            { level: 3,  name: 'Normal',      icon: 'luz',    clr: '#f1c86a', desc: 'El bot juega bien y utiliza fusiones.' },
            { level: 4,  name: 'Difícil',     icon: 'fuego',  clr: '#ff9a5c', desc: 'El bot juega óptimamente con estrategia.' },
            { level: 5,  name: 'Muy Difícil', icon: 'sombra', clr: '#b78bff', desc: 'El bot juega de forma casi perfecta.' },
            { level: 6,  name: 'Experto',     icon: 'espiritu', clr: '#8b5cf6', desc: 'El bot predice movimientos y juega agresivamente.' },
            { level: 7,  name: 'Maestro',     icon: 'agua',   clr: '#3b82f6', desc: 'El bot usa estrategias avanzadas y contrajuega.' },
            { level: 8,  name: 'Gran Maestro',icon: 'fuego',  clr: '#ff5c5c', desc: 'El bot juega con precisión quirúrgica.' },
            { level: 9,  name: 'Leyenda',     icon: 'planta', clr: '#34d399', desc: 'El bot es prácticamente imbatible.' },
            { level: 10, name: 'Mito',        icon: 'luz',    clr: '#ffd666', desc: 'El bot juega como una deidad del juego.' }
        ];

        const cardsHtml = levels.map(lv => {
            const filled = Math.min(5, Math.ceil(lv.level / 2));
            const dots = Array.from({ length: 5 }, (_, i) =>
                `<span class="dv-dot${i < filled ? ' on' : ''}"></span>`
            ).join('');
            return `
            <div class="difficulty-card" data-level="${lv.level}" style="--clr:${lv.clr};">
                <span class="dv-corner tl"></span><span class="dv-corner tr"></span>
                <span class="dv-corner bl"></span><span class="dv-corner br"></span>
                <div class="dv-medallion"><span>${lv.level}</span></div>
                <img class="dv-el" src="/assets/images/iconos/${lv.icon}.jpeg" alt="${lv.name}">
                <div class="dv-level">Nivel ${lv.level}</div>
                <div class="dv-name">${lv.name}</div>
                <div class="dv-dots">${dots}</div>
                <div class="dv-desc">${lv.desc}</div>
            </div>`;
        }).join('');

        // UI TEMPLATE
        const html = `<div class="scene-root">
        <style>
            :host { box-sizing: border-box; }

            .wrap {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                color: white;
                font-family: Poppins, Arial, sans-serif;
                overflow: hidden;
                background: linear-gradient(180deg, rgba(6, 8, 22, 0.62), rgba(6, 8, 22, 0.34) 40%, rgba(6, 8, 22, 0.48) 80%, rgba(4, 6, 18, 0.72));
            }

            .wrap::before {
                content: "";
                position: absolute;
                inset: 0;
                pointer-events: none;
                z-index: 1;
                background:
                    radial-gradient(900px 460px at 50% 10%, rgba(91, 192, 255, 0.06), transparent 60%),
                    radial-gradient(700px 380px at 12% 96%, rgba(139, 92, 246, 0.08), transparent 55%);
            }

            /* HEADER */
            .header {
                position: relative;
                z-index: 2;
                flex: 0 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 20px;
                padding: 16px 28px 8px;
            }
            .back-button {
                position: relative;
                appearance: none;
                background: linear-gradient(160deg, rgba(10, 18, 48, 0.72), rgba(6, 10, 30, 0.72));
                border: 1px solid rgba(214, 180, 110, 0.5);
                color: #f1e7bc;
                padding: 11px 20px;
                border-radius: 12px;
                cursor: pointer;
                font-family: Poppins, Arial, sans-serif;
                font-size: 13px;
                font-weight: 600;
                letter-spacing: 0.03em;
                backdrop-filter: blur(8px);
                box-shadow: inset 0 0 18px rgba(91, 192, 255, 0.07), 0 0 16px rgba(214, 180, 110, 0.07);
                transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
            }
            .back-button::before {
                content: "";
                position: absolute;
                top: -1px; left: -1px;
                width: 11px; height: 11px;
                border-top: 2px solid rgba(214, 180, 110, 0.9);
                border-left: 2px solid rgba(214, 180, 110, 0.9);
                border-top-left-radius: 11px;
                filter: drop-shadow(0 0 6px rgba(214, 180, 110, 0.6));
            }
            .back-button::after {
                content: "";
                position: absolute;
                bottom: -1px; right: -1px;
                width: 11px; height: 11px;
                border-bottom: 2px solid rgba(214, 180, 110, 0.9);
                border-right: 2px solid rgba(214, 180, 110, 0.9);
                border-bottom-right-radius: 11px;
                filter: drop-shadow(0 0 6px rgba(214, 180, 110, 0.6));
            }
            .back-button:hover {
                background: linear-gradient(160deg, rgba(16, 28, 70, 0.82), rgba(10, 18, 48, 0.8));
                transform: translateY(-2px);
                box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35), 0 0 22px rgba(214, 180, 110, 0.16);
            }
            .back-button:active { transform: translateY(0) scale(0.98); }

            .head-title {
                margin: 0;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 22px;
                font-weight: 800;
                letter-spacing: 0.05em;
                background: linear-gradient(180deg, #fff4d6, #d9b36a);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            /* MAIN CONTENT */
            .main {
                position: relative;
                z-index: 2;
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 8px 30px 12px;
                gap: 16px;
                overflow-y: auto;
                min-height: 0;
            }

            .cards-header { text-align: center; }
            .cards-subtitle {
                margin: 0;
                font-size: 11px;
                letter-spacing: 0.26em;
                text-transform: uppercase;
                color: #d9b36a;
                opacity: 0.9;
            }
            .section-title {
                margin: 6px 0 2px;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 34px;
                font-weight: 800;
                letter-spacing: 0.03em;
                background: linear-gradient(180deg, #fff4d6, #e6cf9d);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.55));
            }
            .cards-desc {
                margin: 2px 0 0;
                font-size: 13px;
                color: rgba(255, 255, 255, 0.68);
            }

            /* DIFFICULTY GRID - dos filas de 5 */
            .difficulty-grid {
                display: grid;
                grid-template-columns: repeat(5, minmax(150px, 200px));
                gap: 18px;
                justify-content: center;
            }

            .difficulty-card {
                position: relative;
                height: 220px;
                border-radius: 18px;
                background: linear-gradient(170deg, rgba(9, 14, 32, 0.78), rgba(5, 8, 20, 0.82));
                border: 1px solid var(--clr);
                padding: 14px 14px 12px;
                text-align: center;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                box-sizing: border-box;
                overflow: hidden;
                box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45), 0 0 20px color-mix(in srgb, var(--clr) 26%, transparent);
                backdrop-filter: blur(6px);
                transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease, border-color .3s ease;
            }
            .difficulty-card::before {
                content: "";
                position: absolute;
                top: 0; left: 12%; right: 12%;
                height: 2px;
                background: linear-gradient(90deg, transparent, var(--clr), transparent);
                box-shadow: 0 0 14px var(--clr);
                opacity: 0.8;
            }
            .difficulty-card:hover {
                transform: translateY(-8px);
                border-color: var(--clr);
                box-shadow: 0 22px 46px rgba(0, 0, 0, 0.5), 0 0 38px color-mix(in srgb, var(--clr) 45%, transparent);
            }
            .difficulty-card:active { transform: translateY(-2px) scale(0.98); }

            .dv-corner {
                position: absolute;
                width: 18px; height: 18px;
                pointer-events: none;
                filter: drop-shadow(0 0 5px var(--clr));
            }
            .dv-corner.tl { top: 8px; left: 8px; border-top: 2px solid var(--clr); border-left: 2px solid var(--clr); border-top-left-radius: 10px; }
            .dv-corner.tr { top: 8px; right: 8px; border-top: 2px solid var(--clr); border-right: 2px solid var(--clr); border-top-right-radius: 10px; }
            .dv-corner.bl { bottom: 8px; left: 8px; border-bottom: 2px solid var(--clr); border-left: 2px solid var(--clr); border-bottom-left-radius: 10px; }
            .dv-corner.br { bottom: 8px; right: 8px; border-bottom: 2px solid var(--clr); border-right: 2px solid var(--clr); border-bottom-right-radius: 10px; }

            .dv-medallion {
                width: 46px; height: 46px;
                transform: rotate(45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 10px auto 8px;
                background: linear-gradient(160deg, color-mix(in srgb, var(--clr) 26%, rgba(6,10,26,0.9)), rgba(6, 10, 26, 0.95));
                border: 1px solid color-mix(in srgb, var(--clr) 70%, #fff 10%);
                border-radius: 12px;
                box-shadow: 0 0 18px color-mix(in srgb, var(--clr) 55%, transparent), inset 0 0 12px color-mix(in srgb, var(--clr) 25%, transparent);
            }
            .dv-medallion span {
                transform: rotate(-45deg);
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 21px;
                font-weight: 700;
                color: #fff;
                text-shadow: 0 0 12px var(--clr);
            }

            .dv-el {
                position: absolute;
                top: 14px; right: 14px;
                width: 34px; height: 34px;
                border-radius: 10px;
                object-fit: cover;
                border: 1px solid color-mix(in srgb, var(--clr) 65%, transparent);
                box-shadow: 0 0 12px color-mix(in srgb, var(--clr) 45%, transparent);
            }

            .dv-level {
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.18em;
                color: var(--clr);
                margin-bottom: 3px;
            }
            .dv-name {
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 17px;
                font-weight: 700;
                color: #fff;
                text-shadow: 0 0 10px color-mix(in srgb, var(--clr) 35%, transparent);
                margin-bottom: 6px;
                line-height: 1.1;
                flex: 0 0 auto;
            }
            .dv-dots {
                display: flex;
                gap: 5px;
                margin-bottom: 8px;
                flex: 0 0 auto;
            }
            .dv-dot {
                width: 8px; height: 8px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.14);
                border: 1px solid rgba(255, 255, 255, 0.14);
            }
            .dv-dot.on {
                background: var(--clr);
                border-color: color-mix(in srgb, var(--clr) 80%, #fff);
                box-shadow: 0 0 8px var(--clr);
            }
            .dv-desc {
                font-size: 11px;
                line-height: 1.4;
                color: rgba(255, 255, 255, 0.72);
                overflow: hidden;
            }

            @media (max-width: 1160px) {
                .difficulty-grid { grid-template-columns: repeat(5, 150px); gap: 14px; }
                .difficulty-card { height: 205px; }
            }
            @media (max-width: 960px) {
                .difficulty-grid { grid-template-columns: repeat(2, 200px); }
            }
            @media (max-width: 520px) {
                .difficulty-grid { grid-template-columns: 1fr; }
            }
        </style>

        <div class="wrap">
            <header class="header">
                <button class="back-button" id="back-btn">← Volver</button>
                <h1 class="head-title">Seleccionar Dificultad</h1>
                <div style="width: 104px;"></div>
            </header>

            <div class="main">
                <div class="cards-header">
                    <p class="cards-subtitle">Modo aventura</p>
                    <h1 class="section-title">Elige tu oponente</h1>
                    <p class="cards-desc">Cada nivel eleva la inteligencia del bot. Elige con sabiduría.</p>
                </div>

                <div class="difficulty-grid">
                    ${cardsHtml}
                </div>
            </div>
        </div>`;

        // DOM ELEMENT
        this.domUI = this.add.dom(0, 0).createFromHTML(html);
        this.domUI.setOrigin(0);
        this.domUI.setDepth(9999);

        const node = this.domUI.node;
        node.style.position = 'absolute';
        node.style.left = 0;
        node.style.top = 0;
        node.style.width = width + 'px';
        node.style.height = height + 'px';
        node.style.pointerEvents = 'auto';

        // EVENT LISTENERS
        const backBtn = node.querySelector('#back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.scene.start('HomeScenes', { playerData: this.playerData });
            });
            try {
                backBtn.addEventListener('pointerdown', () => { backBtn.style.transform = 'translateY(0) scale(0.98)'; });
                backBtn.addEventListener('pointerup', () => { backBtn.style.transform = ''; });
                backBtn.addEventListener('pointerleave', () => { backBtn.style.transform = ''; });
            } catch (e) {
                console.warn('No se pudieron inicializar animaciones en DifficultySelectScene', e);
            }
        }

        // Difficulty card selection
        const difficultyCards = node.querySelectorAll('.difficulty-card');
        difficultyCards.forEach(card => {
            card.addEventListener('click', () => {
                const level = parseInt(card.getAttribute('data-level'));
                console.log(`Iniciando partida con dificultad nivel ${level}`);
                this.scene.start('GameScene', {
                    playerData: this.playerData,
                    vsBot: true,
                    botDifficulty: level
                });
            });
        });

        // Responsive resize handler
        this.scale.on('resize', this.onResize, this);
    }

    onResize(gameSize) {
        const { width, height } = gameSize;
        if (this.bg) this.bg.setDisplaySize(width, height);
        if (this.domUI && this.domUI.node) {
            const node = this.domUI.node;
            if (node.style) {
                node.style.width = width + 'px';
                node.style.height = height + 'px';
            }
        }
    }
}