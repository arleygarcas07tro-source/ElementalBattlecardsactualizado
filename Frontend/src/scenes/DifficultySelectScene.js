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

    create() {
        const { width, height } = this.scale;

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
                font-family: Poppins, Arial;
                overflow: hidden;
                /* Background image with a translucent gradient overlay */
                background-image: linear-gradient(135deg, rgba(10,10,30,0.35) 0%, rgba(20,10,40,0.35) 100%), url('/assets/images/levels/background%20levels.jpeg');
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
            }

            /* HEADER */
            .header {
                flex: 0 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 28px;
                border-bottom: 2px solid rgba(138, 0, 255, 0.3);
            }
            .logo-box { display: flex; align-items: center; gap: 12px; }
            .logo { width: 40px; height: 40px; }
            .title { font-size: 24px; font-weight: bold; }

            /* MAIN CONTENT */
            .main {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                gap: 30px;
                overflow-y: auto;
            }

            .section-title {
                font-size: 32px;
                font-weight: bold;
                text-align: center;
                color: #8a00ff;
                margin-bottom: 20px;
            }

            /* DIFFICULTY GRID */
            .difficulty-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 180px));
                gap: 20px;
                width: 100%;
                max-width: 1000px;
                justify-content: center;
                place-items: start;
            }

            .difficulty-card {
                width: 180px;
                height: 160px;
                background: rgba(0, 0, 0, 0.5);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 16px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: center;
                box-sizing: border-box;
            }

            .difficulty-card:hover {
                border-color: #8a00ff;
                background: rgba(138, 0, 255, 0.1);
                transform: translateY(-5px);
                box-shadow: 0 0 20px rgba(138, 0, 255, 0.4);
            }

            .difficulty-level {
                font-size: 14px;
                color: #aaa;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
                flex-shrink: 0;
            }

            .difficulty-name {
                font-size: 16px;
                font-weight: bold;
                color: #fff;
                margin-bottom: 6px;
                flex-shrink: 0;
            }

            .difficulty-description {
                font-size: 11px;
                color: #ccc;
                text-align: center;
                line-height: 1.3;
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 32px;
            }

            .difficulty-stars {
                font-size: 12px;
                color: #ffd700;
                margin-top: 4px;
                flex-shrink: 0;
            }

            /* DIFFICULTY SPECIFIC COLORS */
            .difficulty-1 { --color: #00ff00; }
            .difficulty-2 { --color: #00ccff; }
            .difficulty-3 { --color: #ffaa00; }
            .difficulty-4 { --color: #ff6600; }
            .difficulty-5 { --color: #ff0000; }
            .difficulty-6 { --color: #cc00ff; }
            .difficulty-7 { --color: #9900ff; }
            .difficulty-8 { --color: #6600ff; }
            .difficulty-9 { --color: #3300ff; }
            .difficulty-10 { --color: #0000ff; }

            .difficulty-card.difficulty-1 { border-color: rgba(0, 255, 0, 0.4); }
            .difficulty-card.difficulty-1:hover { border-color: #00ff00; box-shadow: 0 0 20px rgba(0, 255, 0, 0.4); }

            .difficulty-card.difficulty-2 { border-color: rgba(0, 204, 255, 0.4); }
            .difficulty-card.difficulty-2:hover { border-color: #00ccff; box-shadow: 0 0 20px rgba(0, 204, 255, 0.4); }

            .difficulty-card.difficulty-3 { border-color: rgba(255, 170, 0, 0.4); }
            .difficulty-card.difficulty-3:hover { border-color: #ffaa00; box-shadow: 0 0 20px rgba(255, 170, 0, 0.4); }

            .difficulty-card.difficulty-4 { border-color: rgba(255, 102, 0, 0.4); }
            .difficulty-card.difficulty-4:hover { border-color: #ff6600; box-shadow: 0 0 20px rgba(255, 102, 0, 0.4); }

            .difficulty-card.difficulty-5 { border-color: rgba(255, 0, 0, 0.4); }
            .difficulty-card.difficulty-5:hover { border-color: #ff0000; box-shadow: 0 0 20px rgba(255, 0, 0, 0.4); }

            .difficulty-card.difficulty-6 { border-color: rgba(204, 0, 255, 0.4); }
            .difficulty-card.difficulty-6:hover { border-color: #cc00ff; box-shadow: 0 0 20px rgba(204, 0, 255, 0.4); }

            .difficulty-card.difficulty-7 { border-color: rgba(153, 0, 255, 0.4); }
            .difficulty-card.difficulty-7:hover { border-color: #9900ff; box-shadow: 0 0 20px rgba(153, 0, 255, 0.4); }
RESPONSIVE DESIGN */
            @media (max-width: 768px) {
                .difficulty-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    max-width: 100%;
                }

                .difficulty-card {
                    width: 100%;
                    height: 140px;
                    padding: 12px;
                }

                .section-title {
                    font-size: 28px;
                }
            }

            @media (max-width: 480px) {
                .difficulty-grid {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }

                .difficulty-card {
                    height: 130px;
                    padding: 10px;
                }

                .difficulty-name {
                    font-size: 15px;
                }

                .difficulty-description {
                    font-size: 10px;
                    min-height: 28px;
                };
                color: white;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.2s;
            }

            .back-button:hover {
                background: #8a00ff;
                border-color: #8a00ff;
            }
            .back-button {
                transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms, filter 180ms;
                will-change: transform;
            }
            @keyframes subtle-pulse { 0% { transform: scale(1);} 50% { transform: scale(1.02);} 100% { transform: scale(1);} }
            .back-button.pulse { animation: subtle-pulse 3.8s ease-in-out infinite; }
            .back-button.animated { backface-visibility: hidden; }
            .back-button:hover { transform: translateY(-4px) scale(1.03); box-shadow: 0 8px 20px rgba(0,0,0,0.35); }
            .back-button:active { transform: translateY(0) scale(0.98); }
        </style>

        <div class="wrap">
            <header class="header">
                <button class="back-button" id="back-btn">← Volver</button>
                <div class="logo-box">
                    <div class="title">Seleccionar Dificultad</div>
                </div>
                <div style="width: 100px;"></div>
            </header>

            <div class="main">
                <h1 class="section-title">Elige tu oponente</h1>

                <div class="difficulty-grid">
                    <!-- NIVEL 1: MUY FÁCIL -->
                    <div class="difficulty-card difficulty-1" data-level="1">
                        <div class="difficulty-level">Nivel 1</div>
                        <div class="difficulty-name">Muy Fácil</div>
                        <div class="difficulty-stars"></div>
                        <div class="difficulty-description">El bot comete errores, no fusiona cartas.</div>
                    </div>

                    <!-- NIVEL 2: FÁCIL -->
                    <div class="difficulty-card difficulty-2" data-level="2">
                        <div class="difficulty-level">Nivel 2</div>
                        <div class="difficulty-name">Fácil</div>
                        <div class="difficulty-stars"></div>
                        <div class="difficulty-description">El bot juega con decisiones predecibles.</div>
                    </div>

                    <!-- NIVEL 3: NORMAL -->
                    <div class="difficulty-card difficulty-3" data-level="3">
                        <div class="difficulty-level">Nivel 3</div>
                        <div class="difficulty-name">Normal</div>
                        <div class="difficulty-stars"></div>
                        <div class="difficulty-description">El bot juega bien y utiliza fusiones.</div>
                    </div>

                    <!-- NIVEL 4: DIFÍCIL -->
                    <div class="difficulty-card difficulty-4" data-level="4">
                        <div class="difficulty-level">Nivel 4</div>
                        <div class="difficulty-name">Difícil</div>
                        <div class="difficulty-stars"></div>
                        <div class="difficulty-description">El bot juega óptimamente con estrategia.</div>
                    </div>

                    <!-- NIVEL 5: MUY DIFÍCIL -->
                    <div class="difficulty-card difficulty-5" data-level="5">
                        <div class="difficulty-level">Nivel 5</div>
                        <div class="difficulty-name">Muy Difícil</div>
                        <div class="difficulty-stars"></div>
                        <div class="difficulty-description">El bot juega de forma casi perfecta.</div>
                    </div>


                    <!-- NIVEL 6: EXPERTO -->
                    <div class="difficulty-card difficulty-6" data-level="6">
                        <div class="difficulty-level">Nivel 6</div>
                        <div class="difficulty-name">Experto</div>
                        <div class="difficulty-stars"></div>
                        <div class="difficulty-description">El bot predice movimientos y juega agresivamente.</div>
                    </div>

                    <!-- NIVEL 7: MAESTRO -->
                    <div class="difficulty-card difficulty-7" data-level="7">
                        <div class="difficulty-level">Nivel 7</div>
                        <div class="difficulty-name">Maestro</div>
                        <div class="difficulty-stars"></div>
                        <div class="difficulty-description">El bot usa estrategias avanzadas y contrajuega.</div>
                    </div>

                    <!-- NIVEL 8: GRAN MAESTRO -->
                    <div class="difficulty-card difficulty-8" data-level="8">
                        <div class="difficulty-level">Nivel 8</div>
                        <div class="difficulty-name">Gran Maestro</div>
                        <div class="difficulty-stars"></div>
                        <div class="difficulty-description">El bot juega con precisión quirúrgica.</div>
                    </div>

                    <!-- NIVEL 9: LEYENDA -->
                    <div class="difficulty-card difficulty-9" data-level="9">
                        <div class="difficulty-level">Nivel 9</div>
                        <div class="difficulty-name">Leyenda</div>
                        <div class="difficulty-stars"></div>
                        <div class="difficulty-description">El bot es prácticamente imbatible.</div>
                    </div>

                    <!-- NIVEL 10: MITO -->
                    <div class="difficulty-card difficulty-10" data-level="10">
                        <div class="difficulty-level">Nivel 10</div>
                        <div class="difficulty-name">Mito</div>
                        <div class="difficulty-stars"></div>
                        <div class="difficulty-description">El bot juega como una deidad del juego.</div>
                    </div>
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
                backBtn.classList.add('animated', 'pulse');
                backBtn.style.animationDelay = (Math.random() * 2) + 's';
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
        if (this.domUI && this.domUI.node) {
            const node = this.domUI.node;
            if (node.style) {
                node.style.width = width + 'px';
                node.style.height = height + 'px';
            }
        }
    }
}
