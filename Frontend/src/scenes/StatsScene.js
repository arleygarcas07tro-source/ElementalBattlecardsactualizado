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

    rankFor(wins) {
        if (wins <= 0) return 'Novato';
        if (wins < 10) return 'Bronce';
        if (wins < 25) return 'Plata';
        if (wins < 50) return 'Oro';
        if (wins < 100) return 'Platino';
        return 'Diamante';
    }

    create() {
        const { width, height } = this.scale;

        const gamesPlayed = Number(this.stats.gamesPlayed) || 0;
        const gamesWon = Number(this.stats.gamesWon) || 0;
        const gamesLost = Math.max(0, gamesPlayed - gamesWon);
        const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

        const [achDone, achTotal] = String(this.stats.achievements || '0/50')
            .split('/')
            .map((n) => parseInt(n, 10) || 0);
        const achPct = achTotal > 0 ? Math.round((achDone / achTotal) * 100) : 0;

        const username = this.playerData.username || 'Jugador';
        const rank = this.rankFor(gamesWon);
        const level = Math.floor(gamesWon / 10) + 1;
        const initial = String(username).charAt(0).toUpperCase();

        const lastResults = Array.from({ length: 10 }, (_, i) => {
            if (i < gamesWon) return 'W';
            if (i < gamesPlayed) return 'L';
            return 'P';
        });

        const html = `
            <style>
                :host { box-sizing: border-box; }
                .stats-root {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-family: Poppins, Arial, sans-serif;
                    overflow: auto;
                    background:
                        radial-gradient(1000px 500px at 12% 0%, rgba(138, 0, 255, 0.2), transparent 60%),
                        radial-gradient(900px 480px at 92% 100%, rgba(43, 143, 239, 0.16), transparent 55%),
                        linear-gradient(180deg, #0a0d1f 0%, #141030 100%);
                }
                .stats-panel {
                    width: min(1020px, 92vw);
                    border-radius: 26px;
                    background: rgba(9, 9, 17, 0.92);
                    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
                    border: 1px solid rgba(255, 255, 255, 0.09);
                    padding: 28px;
                    display: grid;
                    gap: 22px;
                    max-height: 90vh;
                    overflow-y: auto;
                    margin: 30px auto;
                }
                .stats-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                }
                .stats-header h1 {
                    margin: 0;
                    font-size: 30px;
                    letter-spacing: 0.04em;
                    color: #F1E7BC;
                }
                .stats-header p {
                    margin: 4px 0 0;
                    color: rgba(255,255,255,0.7);
                    font-size: 14px;
                }
                .btn-back {
                    border: 1px solid rgba(241, 231, 188, 0.3);
                    background: rgba(241, 231, 188, 0.08);
                    color: #f1e7bc;
                    padding: 12px 20px;
                    border-radius: 14px;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 14px;
                    transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms, background 180ms;
                }
                .btn-back:hover {
                    transform: translateY(-3px) scale(1.02);
                    background: rgba(241, 231, 188, 0.16);
                    box-shadow: 0 8px 22px rgba(0,0,0,0.35);
                }
                .btn-back:active { transform: translateY(0) scale(0.98); }

                .player-card {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    flex-wrap: wrap;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 22px;
                    padding: 20px 24px;
                    box-shadow: inset 0 0 22px rgba(255,255,255,0.03);
                }
                .player-avatar {
                    width: 74px;
                    height: 74px;
                    flex: 0 0 74px;
                    border-radius: 20px;
                    background: linear-gradient(135deg, #2b8fef, #183f8a);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 34px;
                    font-weight: 800;
                    color: #fff;
                    border: 2px solid rgba(241,231,188,0.3);
                }
                .player-info { flex: 1 1 260px; min-width: 200px; }
                .player-name { margin: 0; font-size: 22px; font-weight: 800; }
                .player-meta { margin: 6px 0 0; color: rgba(255,255,255,0.7); font-size: 13px; }
                .rank-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(241, 231, 188, 0.12);
                    border: 1px solid rgba(241, 231, 188, 0.35);
                    color: #f1e7bc;
                    padding: 8px 16px;
                    border-radius: 999px;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }
                .player-bar {
                    width: 100%;
                    height: 10px;
                    background: rgba(255,255,255,0.09);
                    border-radius: 999px;
                    overflow: hidden;
                    margin-top: 14px;
                }
                .player-fill {
                    height: 100%;
                    width: ${Math.min(100, winRate)}%;
                    border-radius: 999px;
                    background: linear-gradient(90deg, #8a00ff, #5ce3ff);
                    box-shadow: 0 0 16px rgba(92,232,255,0.45);
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                .section {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.09);
                    border-radius: 20px;
                    padding: 20px;
                    display: grid;
                    gap: 16px;
                }
                .section-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 14px;
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
                    border-radius: 12px;
                    background: rgba(241,231,188,0.12);
                }
                .stat-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                }
                .stat-item {
                    background: rgba(0,0,0,0.25);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 14px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    transition: transform 180ms ease, box-shadow 180ms ease;
                }
                .stat-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 24px rgba(0,0,0,0.3);
                }
                .stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(255,255,255,0.7); }
                .stat-value { font-size: 26px; font-weight: 800; color: #f1e7bc; }
                .stat-value.win { color: #2be48a; }
                .stat-value.loss { color: #ff6b6b; }

                .ring-wrap {
                    display: flex;
                    align-items: center;
                    gap: 24px;
                    flex-wrap: wrap;
                }
                .progress-ring {
                    width: 130px;
                    height: 130px;
                    flex: 0 0 130px;
                    border-radius: 50%;
                    background: conic-gradient(#5ce3ff 0deg, rgba(255,255,255,0.07) 0deg);
                    display: grid;
                    place-items: center;
                    box-shadow: inset 0 0 22px rgba(100, 216, 255, 0.18), 0 0 24px rgba(92, 232, 255, 0.15);
                }
                .progress-ring span { font-size: 30px; font-weight: 800; color: #fff; }
                .ring-side { flex: 1; min-width: 180px; display: grid; gap: 10px; }
                .ring-note { margin: 0; color: rgba(255,255,255,0.72); font-size: 13px; line-height: 1.6; }

                .chips { display: flex; gap: 8px; flex-wrap: wrap; }
                .chip {
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    font-weight: 800;
                    color: #fff;
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .chip.win { background: rgba(43,228,138,0.22); border-color: rgba(43,228,138,0.4); color: #a5ffd1; }
                .chip.loss { background: rgba(255,107,107,0.18); border-color: rgba(255,107,107,0.4); color: #ffb3b3; }
                .chip.pending { color: rgba(255,255,255,0.4); }

                .progress-bar {
                    width: 100%;
                    height: 10px;
                    background: rgba(255,255,255,0.09);
                    border-radius: 999px;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #ffd75a, #e7a418);
                    border-radius: 999px;
                    box-shadow: 0 0 14px rgba(255, 215, 90, 0.4);
                    transition: width 0.6s ease;
                }
                .stat-progress { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,0.85); }

                @media(max-width: 860px) {
                    .stats-grid { grid-template-columns: 1fr; }
                }
            </style>

            <div class="stats-panel">
                <div class="stats-header">
                    <div>
                        <h1>Estadísticas</h1>
                        <p>Resumen de rendimiento de ${username}.</p>
                    </div>
                    <button class="btn-back" id="stats-back">Volver</button>
                </div>

                <div class="player-card">
                    <div class="player-avatar">${initial}</div>
                    <div class="player-info">
                        <h2 class="player-name">${username}</h2>
                        <p class="player-meta">Nivel ${level} · ${gamesPlayed} partidas jugadas</p>
                        <span class="rank-badge">⚔️ ${rank}</span>
                        <div class="player-bar"><div class="player-fill"></div></div>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="section">
                        <div class="section-title"><span>⚔️</span> Rendimiento General</div>
                        <div class="stat-row">
                            <div class="stat-item">
                                <div class="stat-label">Partidas Jugadas</div>
                                <div class="stat-value">${gamesPlayed}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Partidas Perdidas</div>
                                <div class="stat-value loss">${gamesLost}</div>
                            </div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-item">
                                <div class="stat-label">Partidas Ganadas</div>
                                <div class="stat-value win">${gamesWon}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Última Partida</div>
                                <div class="stat-value" style="font-size: 17px;">${this.stats.lastGameResult}</div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title"><span>🏆</span> Tasa de Victoria</div>
                        <div class="ring-wrap">
                            <div class="progress-ring"><span>${winRate}%</span></div>
                            <div class="ring-side">
                                <p class="ring-note">${winRate >= 50 ? 'Excelente ritmo, mantén la constancia.' : winRate >= 25 ? 'Vas por buen camino, sigue mejorando.' : 'Cada derrota te acerca a la victoria.'}</p>
                                <div class="progress-bar"><div class="progress-fill" style="width:${winRate}%; background:linear-gradient(90deg,#8a00ff,#5ce3ff);"></div></div>
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
                        <div class="chips">
                            ${lastResults.map((r) => `<span class="chip ${r === 'W' ? 'win' : r === 'L' ? 'loss' : 'pending'}">${r === 'W' ? 'V' : r === 'L' ? 'D' : '·'}</span>`).join('')}
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title"><span>⏱️</span> Tiempo de Juego</div>
                        <div class="stat-row-full">
                            <div class="stat-item">
                                <div class="stat-label">Tiempo Total</div>
                                <div class="stat-value" style="font-size: 22px;">${this.stats.timePlayed}</div>
                            </div>
                        </div>
                        <div class="stat-progress">
                            <span>Tiempo de sesión</span>
                            <span>${this.stats.totalTimePlayed || 0} min</span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title"><span>💎</span> Logros</div>
                        <div class="stat-progress">
                            <span>Desbloqueados</span>
                            <span>${Math.min(achDone, achTotal)} / ${achTotal} (${achPct}%)</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${achPct}%"></div>
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

        const fill = node.querySelector('.player-fill');
        const ring = node.querySelector('.progress-ring');
        const ringLabel = node.querySelector('.progress-ring span');

        if (fill) {
            fill.style.width = '0%';
            setTimeout(() => {
                fill.style.width = `${Math.min(100, winRate)}%`;
            }, 120);
        }

        if (ring && ringLabel) {
            const duration = 900;
            const start = performance.now();

            const animateRing = (t) => {
                const elapsed = t - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const value = Math.round(winRate * eased);
                ringLabel.textContent = `${value}%`;
                ring.style.background = `conic-gradient(#5ce3ff ${value * 3.6}deg, rgba(255,255,255,0.07) 0deg)`;
                if (progress < 1) requestAnimationFrame(animateRing);
            };

            requestAnimationFrame(animateRing);
        }
    }
}