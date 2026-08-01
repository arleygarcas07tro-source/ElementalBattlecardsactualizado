import Phaser from 'phaser';

export default class StatsScene extends Phaser.Scene {
    constructor() {
        super('StatsScene');
        this.playerData = {};
        this.returnScene = 'HomeScenes';
        this.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            winRate: '0%',
            achievements: '0/50',
            timePlayed: '0h 0m',
            totalTimePlayed: 0,
            lastGameResult: 'N/A',
            longestWinStreak: 0,
            currentWinStreak: 0
        };
    }

    init(data) {
        this.playerData = data.playerData || {};
        this.returnScene = data.returnScene || 'HomeScenes';
        this.stats = {
            ...this.stats,
            ...(data.stats || {})
        };
    }

    create() {
        const { width, height } = this.scale;

        const html = `
            <div class="stats-root">
                <style>
                    .stats-root {
                        position: absolute;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(0, 0, 0, 0.62);
                        font-family: Poppins, Arial, sans-serif;
                        color: white;
                        overflow: hidden;
                    }
                    .stats-panel {
                        width: min(840px, 90vw);
                        border-radius: 24px;
                        background: rgba(9, 9, 13, 0.95);
                        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        padding: 28px;
                        display: grid;
                        gap: 24px;
                        max-height: 85vh;
                        overflow-y: auto;
                    }
                    .stats-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 16px;
                    }
                    .stats-header h1 {
                        margin: 0;
                        font-size: 28px;
                        letter-spacing: 0.04em;
                    }
                    .btn-back {
                        border: 1px solid rgba(241, 231, 188, 0.25);
                        background: rgba(241, 231, 188, 0.08);
                        color: #f1e7bc;
                        padding: 12px 18px;
                        border-radius: 14px;
                        cursor: pointer;
                        font-weight: 700;
                    }
                    .btn-back {
                        transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms, filter 180ms;
                        will-change: transform;
                    }
                    @keyframes subtle-pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.02); }
                        100% { transform: scale(1); }
                    }
                    .btn-back.pulse { animation: subtle-pulse 3.8s ease-in-out infinite; }
                    .btn-back.animated { backface-visibility: hidden; }
                    .btn-back:hover { transform: translateY(-4px) scale(1.03); box-shadow: 0 8px 20px rgba(0,0,0,0.35); }
                    .btn-back:active { transform: translateY(0) scale(0.98); }
                    .stats-grid {
                        display: grid;
                        gap: 20px;
                    }
                    .section {
                        background: rgba(255,255,255,0.04);
                        border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 20px;
                        padding: 20px;
                        display: grid;
                        gap: 18px;
                    }
                    .section-title {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-size: 16px;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        color: #f1e7bc;
                    }
                    .section-title span {
                        width: 38px;
                        height: 38px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        background: rgba(241,231,188,0.14);
                    }
                    .stat-row {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 16px;
                    }
                    .stat-item {
                        background: rgba(0,0,0,0.25);
                        border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 14px;
                        padding: 16px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .stat-label {
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.06em;
                        color: rgba(255,255,255,0.72);
                    }
                    .stat-value {
                        font-size: 24px;
                        font-weight: 700;
                        color: #f1e7bc;
                    }
                    .stat-row-full {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                    .stat-progress {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        font-size: 13px;
                        color: rgba(255,255,255,0.8);
                    }
                    .progress-bar {
                        width: 100%;
                        height: 8px;
                        background: rgba(255,255,255,0.08);
                        border-radius: 4px;
                        margin-top: 8px;
                        overflow: hidden;
                    }
                    .progress-fill {
                        height: 100%;
                        background: linear-gradient(90deg, #2be48a, #1b8a5f);
                        border-radius: 4px;
                        transition: width 0.5s ease;
                    }
                </style>
                <div class="stats-panel">
                    <div class="stats-header">
                        <div>
                            <h1>Estadísticas</h1>
                            <p style="margin:4px 0 0; color: rgba(255,255,255,0.72); font-size: 14px;">Historial de partidas y logros.</p>
                        </div>
                        <button class="btn-back" id="stats-back">Volver</button>
                    </div>

                    <div class="stats-grid">
                        <div class="section">
                            <div class="section-title"><span>⚔️</span> Rendimiento General</div>
                            <div class="stat-row">
                                <div class="stat-item">
                                    <div class="stat-label">Partidas Jugadas</div>
                                    <div class="stat-value">${this.stats.gamesPlayed}</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">Partidas Ganadas</div>
                                    <div class="stat-value">${this.stats.gamesWon}</div>
                                </div>
                            </div>
                            <div class="stat-row">
                                <div class="stat-item">
                                    <div class="stat-label">Tasa de Victoria</div>
                                    <div class="stat-value">${this.stats.winRate}</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">Última Partida</div>
                                    <div class="stat-value" style="font-size: 16px;">${this.stats.lastGameResult}</div>
                                </div>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title"><span>🔥</span> Racha de Victorias</div>
                            <div class="stat-row">
                                <div class="stat-item">
                                    <div class="stat-label">Racha Actual</div>
                                    <div class="stat-value">${this.stats.currentWinStreak}</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">Racha Más Larga</div>
                                    <div class="stat-value">${this.stats.longestWinStreak}</div>
                                </div>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title"><span>⏱️</span> Tiempo de Juego</div>
                            <div class="stat-row-full">
                                <div class="stat-item">
                                    <div class="stat-label">Tiempo Total</div>
                                    <div class="stat-value">${this.stats.timePlayed}</div>
                                </div>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title"><span>🏆</span> Logros</div>
                            <div class="stat-progress">
                                <span>Desbloqueados</span>
                                <span>${this.stats.achievements}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(parseInt(this.stats.achievements) / 50) * 100}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.domElement = this.add.dom(0, 0).createFromHTML(html);
        this.domElement.setOrigin(0);
        this.domElement.setDepth(9999);
        const node = this.domElement.node;
        node.style.position = 'absolute';
        node.style.left = '0';
        node.style.top = '0';
        node.style.width = `${width}px`;
        node.style.height = `${height}px`;
        node.style.pointerEvents = 'auto';

        const backButton = node.querySelector('#stats-back');

        if (backButton) {
            backButton.addEventListener('click', () => {
                this.scene.start(this.returnScene, { playerData: this.playerData });
            });
        }
    }
}
