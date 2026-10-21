import Phaser from 'phaser';
import { play as playSfx } from '../helpers/audioManager.js';
import { getProfileStats } from '../helpers/playerProgress.js';
import DomSceneBase from './ui/DomSceneBase.js';
import { elementByKey, elementsNavHTML, energyParticlesHTML } from './ui/elementCatalog.js';
import { ACHIEVEMENTS } from '../game/achievementsCatalog.js';

export default class ProfileScene extends DomSceneBase {
    constructor() {
        super('ProfileScene');
        this.playerData = {};
        this.listeners = [];
        this.imageChangeListener = null;
    }

    init(data) {
        this.playerData = data.playerData || data || {};
    }

    formatProfileId(id) {
        if (!id) return '#EBC-000000';
        const numeric = String(id).replace(/\D/g, '');
        if (!numeric) return `#EBC-${String(id).slice(0, 6).toUpperCase()}`;
        return `#EBC-${numeric.padStart(6, '0')}`;
    }

    create() {
        const { width, height } = this.scale;
        const stats = getProfileStats(this.playerData.username || 'Jugador');

        const player = {
            nombre: this.playerData.username || this.playerData.nombre || 'ShadowMaster',
            frase: this.playerData.frase || 'El verdadero poder nace del equilibrio.',
            id: this.formatProfileId(this.playerData.id || this.playerData._id || this.playerData.profileId),
            nivel: stats.nivel,
            xpActual: stats.xpActual,
            xpMaxima: stats.xpMaxima,
            battlesWon: stats.battlesWon,
            longestStreak: stats.longestStreak,
            missionsCompleted: stats.missionsCompleted,
            achievements: stats.achievements,
            collectedCards: stats.collectedCards,
            collectedTotal: stats.collectedTotal,
            ranking: stats.ranking
        };

        const xpPercent = Math.min(100, Math.round((player.xpActual / player.xpMaxima) * 100));

        const particles = energyParticlesHTML();

        const elementsNavHtml = elementsNavHTML();

        const statsCards = [
            { icon: '🃏', title: 'Cartas coleccionadas', value: `${player.collectedCards} / ${player.collectedTotal}` },
            { icon: '🎯', title: 'Misiones completadas', value: player.missionsCompleted },
            { icon: '⚔️', title: 'Victorias en batallas', value: player.battlesWon },
            { icon: '🏆', title: 'Posición en el ranking', value: player.ranking }
        ].map((s, i) => `
            <article class="stat-card" style="animation-delay:${i * 0.07}s;">
                <span class="stat-icon">${s.icon}</span>
                <p class="stat-title">${s.title}</p>
                <p class="stat-value">${s.value}</p>
            </article>
        `).join('');

        const logrosHtml = ACHIEVEMENTS.map((a, i) => {
            const el = elementByKey(a.el);
            const unlocked = a.condition(stats);
            return `
                <article class="logro-card ${unlocked ? 'is-done' : ''}" style="--el:${el.color}; --el-soft:${el.soft}; --el-glow:${el.glow}; animation-delay:${i * 0.06}s;">
                    <span class="logro-accent"></span>
                    <span class="logro-icon">${a.icon}</span>
                    <div class="logro-info">
                        <h4 class="logro-title">${a.title}</h4>
                        <p class="logro-desc">${a.desc}</p>
                    </div>
                    <span class="logro-state">${unlocked ? 'Desbloqueado' : 'Bloqueado'}</span>
                </article>
            `;
        }).join('');

        const html = `
        <style>
            :host { box-sizing: border-box; }
            .screen {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                color: white;
                font-family: Poppins, 'Segoe UI', Arial, sans-serif;
                background:
                    radial-gradient(1200px 640px at 18% -6%, rgba(138, 0, 255, 0.20), transparent 58%),
                    radial-gradient(1000px 560px at 88% 8%, rgba(43, 143, 239, 0.16), transparent 55%),
                    radial-gradient(1400px 900px at 50% 118%, rgba(255, 176, 64, 0.10), transparent 60%),
                    linear-gradient(180deg, rgba(6, 8, 26, 0.72) 0%, rgba(13, 12, 40, 0.66) 46%, rgba(8, 16, 38, 0.78) 100%),
                    url('/assets/images/PERFIL/PERFIL.jpeg') center / cover no-repeat;
            }

            /* ---------- FONDO: montañas, castillo, islas y energía ---------- */
            .bg-layer { position: absolute; inset: 0; pointer-events: none; }
            .mountains {
                position: absolute;
                left: 0; right: 0; bottom: 74px;
                height: 230px;
                opacity: 0.5;
                background: linear-gradient(180deg, rgba(30, 16, 58, 0) 0%, rgba(24, 14, 58, 0.55) 60%, rgba(60, 24, 96, 0.85) 100%);
                clip-path: polygon(0 58%, 7% 34%, 14% 56%, 24% 18%, 33% 50%, 42% 26%, 51% 54%, 61% 22%, 72% 52%, 82% 30%, 91% 55%, 100% 40%, 100% 100%, 0 100%);
                filter: drop-shadow(0 0 24px rgba(138, 0, 255, 0.25));
            }
            .castle-glow {
                position: absolute;
                left: 50%; bottom: 150px;
                transform: translateX(-50%);
                width: 520px; height: 200px;
                background: radial-gradient(ellipse at center, rgba(110, 240, 255, 0.22), rgba(138, 0, 255, 0.10) 45%, transparent 72%);
                filter: blur(8px);
            }
            .castle {
                position: absolute;
                left: 50%; bottom: 120px;
                transform: translateX(-50%);
                width: 440px; height: 280px;
                opacity: 0.8;
                background: linear-gradient(180deg, #241457 0%, #120b38 55%, #0a0a26 100%);
                clip-path: polygon(
                    0 100%, 0 44%, 6% 44%, 6% 28%, 12% 28%, 12% 44%,
                    20% 44%, 20% 22%, 25% 22%, 25% 40%, 32% 40%, 32% 30%,
                    39% 30%, 39% 14%, 46% 14%, 46% 0%, 54% 0%, 54% 14%,
                    61% 14%, 61% 30%, 68% 30%, 68% 40%, 75% 40%, 75% 22%,
                    80% 22%, 80% 44%, 88% 44%, 88% 28%, 94% 28%, 94% 44%,
                    100% 44%, 100% 100%
                );
                filter: drop-shadow(0 0 28px rgba(138, 0, 255, 0.4));
            }
            .horizon-glow {
                position: absolute;
                left: 50%; bottom: 70px;
                transform: translateX(-50%);
                width: 78%; height: 120px;
                background: radial-gradient(ellipse at center, rgba(110, 240, 255, 0.20), transparent 70%);
                filter: blur(6px);
            }
            .island {
                position: absolute;
                opacity: 0.42;
                clip-path: polygon(14% 46%, 30% 22%, 52% 30%, 74% 16%, 90% 44%, 82% 76%, 22% 82%);
                background: linear-gradient(180deg, #241457, #0b0a26);
                filter: drop-shadow(0 0 18px rgba(110, 240, 255, 0.22)) drop-shadow(0 14px 22px rgba(0,0,0,0.45));
                animation: floatY 15s ease-in-out infinite;
            }
            .island::after {
                content: "";
                position: absolute;
                left: 20%; right: 20%; bottom: -6px;
                height: 12px;
                background: radial-gradient(ellipse, rgba(110, 240, 255, 0.55), transparent 70%);
                filter: blur(6px);
            }
            .island-1 { width: 230px; height: 90px; top: 56%; left: -40px; animation-delay: -4s; }
            .island-2 { width: 300px; height: 110px; top: 50%; right: -60px; background: linear-gradient(180deg, #3a1158, #0b0a26); animation-delay: -9s; }
            .energy {
                position: absolute;
                border-radius: 50%;
                background: #7fe8ff;
                box-shadow: 0 0 12px 3px rgba(127, 232, 255, 0.65);
                animation: rise 9s ease-in-out infinite alternate;
                opacity: 0.25;
            }
            .screen::before {
                content: "";
                position: absolute; inset: 0;
                background: repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 4px);
                pointer-events: none;
            }

            /* ---------- CORNER BRACKETS ---------- */
            .hud { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
            .hud::before, .hud::after {
                content: "";
                position: absolute;
                width: 46px; height: 46px;
                border: 2px solid rgba(255, 215, 90, 0.35);
                border-radius: 6px;
                filter: drop-shadow(0 0 8px rgba(255, 215, 90, 0.3));
            }
            .hud::before { top: 58px; left: 14px; border-right: none; border-bottom: none; }
            .hud::after { bottom: 58px; right: 14px; border-left: none; border-top: none; }

            /* ---------- TOPBAR ---------- */
            .topbar {
                position: relative;
                z-index: 3;
                display: flex;
                align-items: center;
                gap: 26px;
                padding: 16px 30px 12px;
            }
            .brand { display: flex; align-items: center; gap: 16px; }
            .brand .logo {
                width: 58px; height: 58px;
                border-radius: 14px;
                object-fit: cover;
                border: 2px solid rgba(255, 215, 90, 0.5);
                box-shadow: 0 6px 24px rgba(0,0,0,0.5), 0 0 26px rgba(255, 215, 90, 0.16);
            }
            .brand-block { line-height: 1.15; }
            .brand-kicker {
                font-size: 10px;
                letter-spacing: 0.34em;
                text-transform: uppercase;
                color: #ffd75a;
                opacity: 0.85;
            }
            .brand h1 {
                margin: 0;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 34px;
                font-weight: 800;
                letter-spacing: 0.06em;
                background: linear-gradient(180deg, #fff3cf, #e9b949);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                filter: drop-shadow(0 2px 10px rgba(233, 185, 73, 0.35));
            }
            .brand-block p { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.68); max-width: 560px; }
            .btn-home {
                margin-left: auto;
                display: inline-flex;
                align-items: center;
                gap: 9px;
                appearance: none;
                border: 1px solid rgba(255, 215, 90, 0.45);
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.14), rgba(255, 215, 90, 0.04));
                color: #ffd75a;
                font-family: Poppins, Arial, sans-serif;
                font-size: 14px;
                font-weight: 600;
                padding: 12px 20px;
                border-radius: 14px;
                cursor: pointer;
                box-shadow: 0 0 22px rgba(255, 215, 90, 0.10);
                transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
            }
            .btn-home:hover {
                transform: translateY(-2px);
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.24), rgba(255, 215, 90, 0.08));
                box-shadow: 0 0 30px rgba(255, 215, 90, 0.22);
            }

            /* ---------- CUERPO ---------- */
            .profile-body {
                position: relative;
                z-index: 3;
                flex: 1;
                min-height: 0;
                display: grid;
                grid-template-columns: 300px minmax(0, 1fr);
                gap: 26px;
                padding: 6px 30px 18px;
            }
            .profile-side, .profile-main {
                position: relative;
                background: rgba(6, 8, 22, 0.72);
                backdrop-filter: blur(14px);
                border: 1px solid rgba(255, 215, 90, 0.22);
                box-shadow: 0 22px 56px rgba(0,0,0,0.42), inset 0 0 26px rgba(92, 227, 255, 0.04);
                border-radius: 24px;
                overflow: hidden;
                animation: panelReveal 0.55s cubic-bezier(.2,.8,.2,1) both;
            }
            .profile-side::before, .profile-main::before {
                content: "";
                position: absolute;
                top: 0; left: 12%; right: 12%;
                height: 2px;
                background: linear-gradient(90deg, transparent, #ffd75a, transparent);
                filter: drop-shadow(0 0 12px rgba(255, 215, 90, 0.6));
            }
            .profile-side {
                display: flex;
                flex-direction: column;
                gap: 20px;
                padding: 26px 22px;
            }

            /* ---------- PANEL IZQUIERDO: AVATAR ---------- */
            .avatar-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
            .avatar-orb {
                position: relative;
                width: 128px; height: 128px;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: conic-gradient(from 0deg, #ffd75a, #0b0a26 45%, #5ce3ff 72%, transparent 100%);
                padding: 4px;
                box-shadow: 0 0 34px rgba(255, 215, 90, 0.3), 0 0 18px rgba(92, 227, 255, 0.25);
                animation: avatarPulse 4.5s ease-in-out infinite;
            }
            .avatar-orb img {
                width: 100%; height: 100%;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid rgba(0,0,0,0.55);
            }
            .avatar-name {
                margin: 6px 0 0;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 21px;
                color: #fff;
                letter-spacing: 0.02em;
                text-align: center;
            }
            .avatar-level {
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                color: #5ce3ff;
                text-shadow: 0 0 12px rgba(92, 227, 255, 0.5);
            }

            .profile-tabs { display: flex; flex-direction: column; gap: 10px; }
            .p-tab {
                appearance: none;
                display: flex;
                align-items: center;
                gap: 12px;
                font-family: Poppins, Arial, sans-serif;
                font-size: 14.5px;
                font-weight: 600;
                color: rgba(255,255,255,0.65);
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.10);
                border-radius: 15px;
                padding: 12px 15px;
                cursor: pointer;
                text-align: left;
                transition: transform 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
            }
            .p-tab span {
                width: 34px; height: 34px;
                flex: 0 0 34px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 10px;
                font-size: 15px;
                background: rgba(92, 227, 255, 0.12);
                border: 1px solid rgba(92, 227, 255, 0.20);
            }
            .p-tab:hover { transform: translateX(4px); color: #fff; border-color: rgba(255,255,255,0.22); }
            .p-tab.active {
                color: #ffd75a;
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.14), rgba(255, 215, 90, 0.04));
                border-color: rgba(255, 215, 90, 0.45);
                box-shadow: 0 0 20px rgba(255, 215, 90, 0.16);
            }
            .p-tab.active span {
                background: rgba(255, 215, 90, 0.16);
                border-color: rgba(255, 215, 90, 0.4);
            }

            .btn-avatar {
                margin-top: auto;
                appearance: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 9px;
                font-family: Poppins, Arial, sans-serif;
                font-size: 13.5px;
                font-weight: 600;
                color: #5ce3ff;
                background: rgba(92, 227, 255, 0.08);
                border: 1px solid rgba(92, 227, 255, 0.32);
                padding: 12px 16px;
                border-radius: 13px;
                cursor: pointer;
                box-shadow: 0 0 16px rgba(92, 227, 255, 0.10);
                transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
            }
            .btn-avatar:hover {
                transform: translateY(-2px);
                background: rgba(92, 227, 255, 0.16);
                box-shadow: 0 0 24px rgba(92, 227, 255, 0.22);
            }

            /* ---------- PANEL CENTRAL ---------- */
            .profile-main { padding: 28px; display: flex; flex-direction: column; min-height: 0; overflow-y: auto; }
            .panel-kicker {
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.24em;
                text-transform: uppercase;
                color: #ffd75a;
                opacity: 0.85;
            }
            .panel-title {
                margin: 6px 0 2px;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 27px;
                color: #fff;
                letter-spacing: 0.02em;
            }
            .panel-sub { margin: 0 0 20px; font-size: 13px; color: rgba(255,255,255,0.6); }
            .panel-glow {
                height: 1px;
                margin-bottom: 24px;
                background: linear-gradient(90deg, #5ce3ff, transparent);
                box-shadow: 0 0 10px rgba(92, 227, 255, 0.4);
            }

            .pane { display: none; flex-direction: column; gap: 18px; }
            .pane.active { display: flex; }

            .info-row, .info-card {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 18px 20px;
                border-radius: 18px;
                background: rgba(255,255,255,0.045);
                border: 1px solid rgba(255,255,255,0.10);
                box-shadow: inset 0 0 18px rgba(255,255,255,0.03);
            }
            .info-icon {
                flex: 0 0 46px;
                width: 46px; height: 46px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                border-radius: 13px;
                background: rgba(92, 227, 255, 0.12);
                border: 1px solid rgba(92, 227, 255, 0.22);
                box-shadow: 0 0 14px rgba(92, 227, 255, 0.14);
            }
            .info-main { flex: 1; min-width: 0; }
            .info-label {
                display: block;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: rgba(255,255,255,0.55);
                margin-bottom: 4px;
            }
            .info-value {
                font-size: 17px;
                font-weight: 700;
                color: #fff;
            }

            /* Nombre editable */
            .name-row { position: relative; }
            .name-display { display: flex; align-items: center; gap: 12px; }
            .name-text { font-size: 18px; font-weight: 700; color: #fff; }
            .btn-edit {
                appearance: none;
                width: 36px; height: 36px;
                flex: 0 0 36px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 15px;
                border-radius: 10px;
                background: rgba(255, 215, 90, 0.12);
                border: 1px solid rgba(255, 215, 90, 0.35);
                color: #ffd75a;
                cursor: pointer;
                transition: transform 160ms ease, box-shadow 160ms ease;
            }
            .btn-edit:hover { transform: scale(1.08); box-shadow: 0 0 16px rgba(255, 215, 90, 0.35); }
            .name-edit { display: none; gap: 10px; align-items: center; }
            .name-edit input {
                flex: 1;
                min-width: 0;
                font-family: Poppins, Arial, sans-serif;
                font-size: 16px;
                font-weight: 600;
                color: #fff;
                background: rgba(6, 8, 22, 0.7);
                border: 1px solid rgba(92, 227, 255, 0.4);
                border-radius: 11px;
                padding: 10px 13px;
                outline: none;
                box-shadow: inset 0 0 16px rgba(0,0,0,0.4), 0 0 14px rgba(92, 227, 255, 0.12);
            }
            .name-edit button {
                appearance: none;
                font-family: Poppins, Arial, sans-serif;
                font-size: 13px;
                font-weight: 600;
                border-radius: 11px;
                padding: 10px 15px;
                cursor: pointer;
                transition: transform 160ms ease, box-shadow 160ms ease;
            }
            .btn-save {
                color: #ffd75a;
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.18), rgba(255, 215, 90, 0.05));
                border: 1px solid rgba(255, 215, 90, 0.45);
            }
            .btn-cancel {
                color: rgba(255,255,255,0.7);
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.18);
            }
            .btn-save:hover, .btn-cancel:hover { transform: translateY(-2px); }

            /* Nivel + XP */
            .level-block { display: flex; align-items: center; gap: 20px; }
            .level-badge {
                flex: 0 0 78px;
                width: 78px; height: 78px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 30px;
                font-weight: 800;
                color: #fff;
                background: conic-gradient(from 0deg, #ffd75a, #0b0a26 55%, #5ce3ff 85%, transparent 100%);
                padding: 4px;
                box-shadow: 0 0 22px rgba(255, 215, 90, 0.28);
            }
            .level-badge span {
                width: 100%; height: 100%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: rgba(6, 8, 22, 0.9);
                box-shadow: inset 0 0 14px rgba(0,0,0,0.6);
            }
            .xp-section { flex: 1; display: flex; flex-direction: column; gap: 8px; }
            .xp-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 12.5px; color: rgba(255,255,255,0.7); }
            .xp-bar {
                width: 100%; height: 16px;
                border-radius: 999px;
                background: rgba(255,255,255,0.07);
                border: 1px solid rgba(255,255,255,0.14);
                overflow: hidden;
                box-shadow: inset 0 0 14px rgba(0,0,0,0.35);
            }
            .xp-fill {
                height: 100%;
                width: 0%;
                border-radius: 999px;
                background: linear-gradient(90deg, #7d72ff, #5ce3ff);
                box-shadow: 0 0 20px rgba(92, 232, 255, 0.4), inset 0 0 8px rgba(255,255,255,0.3);
                transition: width 900ms ease;
            }
            .frase { margin: 0; font-size: 14px; font-style: italic; line-height: 1.65; color: rgba(255,255,255,0.72); padding: 16px 20px; border-left: 2px solid #ffd75a; background: rgba(255,255,255,0.03); border-radius: 0 14px 14px 0; }

            /* Estadísticas */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
            }
            .stat-card {
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 22px 18px;
                border-radius: 18px;
                background: rgba(255,255,255,0.045);
                border: 1px solid rgba(255,255,255,0.10);
                box-shadow: inset 0 0 18px rgba(255,255,255,0.03);
                transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
                animation: cardReveal 0.5s cubic-bezier(.2,.8,.2,1) both;
            }
            .stat-card:hover {
                transform: translateY(-4px);
                border-color: rgba(92, 227, 255, 0.35);
                box-shadow: 0 0 22px rgba(92, 227, 255, 0.12);
            }
            .stat-icon {
                width: 42px; height: 42px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                border-radius: 12px;
                background: rgba(255, 215, 90, 0.12);
                border: 1px solid rgba(255, 215, 90, 0.28);
                box-shadow: 0 0 14px rgba(255, 215, 90, 0.12);
            }
            .stat-title { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.55); }
            .stat-value { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 800; color: #fff; text-shadow: 0 0 16px rgba(92, 227, 255, 0.25); }

            /* Logros */
            .logros-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
            .logro-card {
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 16px 14px;
                border-radius: 16px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.09);
                overflow: hidden;
                opacity: 0.85;
                animation: cardReveal 0.5s cubic-bezier(.2,.8,.2,1) both;
                transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
            }
            .logro-card:hover { transform: translateY(-4px); }
            .logro-card.is-done {
                border-color: var(--el-soft);
                box-shadow: 0 0 18px var(--el-glow);
            }
            .logro-accent {
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, var(--el), transparent);
                box-shadow: 0 0 12px var(--el-glow);
            }
            .logro-icon { font-size: 22px; }
            .logro-title { margin: 0; font-size: 14px; font-weight: 700; color: #fff; }
            .is-done .logro-title { color: var(--el); text-shadow: 0 0 10px var(--el-glow); }
            .logro-desc { margin: 0; font-size: 11.5px; line-height: 1.5; color: rgba(255,255,255,0.6); }
            .logro-state {
                margin-top: auto;
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                color: rgba(255,255,255,0.4);
            }
            .is-done .logro-state { color: #ffd75a; }
            .logros-counter {
                display: inline-flex;
                align-self: flex-start;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                font-weight: 600;
                color: #ffd75a;
                background: rgba(255, 215, 90, 0.10);
                border: 1px solid rgba(255, 215, 90, 0.28);
                padding: 8px 14px;
                border-radius: 999px;
                box-shadow: 0 0 14px rgba(255, 215, 90, 0.12);
            }

            /* ---------- NAV INFERIOR ---------- */
            .bottom-nav {
                position: relative;
                z-index: 4;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 18px;
                padding: 10px 30px;
                background: rgba(6, 8, 22, 0.72);
                backdrop-filter: blur(14px);
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 -12px 40px rgba(0,0,0,0.35);
            }
            .nav-elements { display: flex; align-items: center; gap: 12px; }
            .nav-orb {
                width: 40px; height: 40px;
                border-radius: 50%;
                padding: 2px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: conic-gradient(from 0deg, var(--el), transparent 60%);
                opacity: 0.85;
                transition: transform 160ms ease, opacity 160ms ease;
            }
            .nav-orb img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.18); }
            .nav-orb:hover { transform: translateY(-3px) scale(1.08); opacity: 1; }
            .nav-items { display: flex; align-items: center; gap: 10px; }
            .nav-item {
                appearance: none;
                font-family: Poppins, Arial, sans-serif;
                font-size: 13px;
                font-weight: 600;
                color: rgba(255,255,255,0.72);
                background: transparent;
                border: 1px solid transparent;
                padding: 10px 18px;
                border-radius: 12px;
                cursor: pointer;
                transition: color 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease;
            }
            .nav-item:hover { color: #fff; background: rgba(255,255,255,0.06); }
            .nav-item.active {
                color: #ffd75a;
                background: linear-gradient(135deg, rgba(255, 215, 90, 0.14), rgba(255, 215, 90, 0.04));
                border-color: rgba(255, 215, 90, 0.4);
                box-shadow: 0 0 20px rgba(255, 215, 90, 0.16);
            }

            /* ---------- ANIMACIONES ---------- */
            @keyframes floatY {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-16px); }
            }
            @keyframes rise {
                0% { transform: translateY(0) scale(1); opacity: 0.2; }
                100% { transform: translateY(-70px) scale(1.35); opacity: 0.5; }
            }
            @keyframes panelReveal {
                from { opacity: 0; transform: translateY(18px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes cardReveal {
                from { opacity: 0; transform: translateY(18px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes avatarPulse {
                0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 215, 90, 0.25)); }
                50% { filter: drop-shadow(0 0 22px rgba(255, 215, 90, 0.5)); }
            }

            @media (max-width: 1000px) {
                .profile-body { grid-template-columns: 1fr; padding: 6px 24px 18px; }
                .profile-side { flex-direction: row; align-items: center; }
                .profile-tabs { flex-direction: row; }
                .p-tab { flex: 1; }
                .btn-avatar { margin-top: 0; }
                .logros-grid { grid-template-columns: 1fr; }
            }
            @media (max-width: 700px) {
                .stats-grid { grid-template-columns: 1fr; }
            }
        </style>

        <div class="screen">
            <div class="bg-layer">
                <div class="mountains"></div>
                <div class="castle-glow"></div>
                <div class="castle"></div>
                <div class="horizon-glow"></div>
                <div class="island island-1"></div>
                <div class="island island-2"></div>
                ${particles}
            </div>

            <div class="hud"></div>

            <header class="topbar">
                <div class="brand">
                    <img class="logo" src="/assets/images/logotipomenu.jpg" alt="Elemental Battlecards">
                    <div class="brand-block">
                        <span class="brand-kicker">Elemental Battle Cards</span>
                        <h1>Perfil</h1>
                        <p>Tu identidad elemental, tus estadísticas y tus logros.</p>
                    </div>
                </div>
                <button class="btn-home" id="btn-home">🏠 Inicio</button>
            </header>

            <main class="profile-body">
                <aside class="profile-side">
                    <div class="avatar-wrap">
                        <div class="avatar-orb">
                            <img id="preview" src="/assets/images/logo.png" alt="Avatar">
                        </div>
                        <h3 class="avatar-name" id="side-name">${player.nombre}</h3>
                        <span class="avatar-level">Nivel ${player.nivel}</span>
                    </div>

                    <nav class="profile-tabs">
                        <button class="p-tab active" data-tab="info"><span>ℹ️</span>Información</button>
                        <button class="p-tab" data-tab="stats"><span>📊</span>Estadísticas</button>
                        <button class="p-tab" data-tab="logros"><span>🏆</span>Logros</button>
                    </nav>

                    <button class="btn-avatar" id="btn-avatar">🖼️ Cambiar avatar</button>
                    <input type="file" id="avatar-file" hidden accept="image/*">
                </aside>

                <section class="profile-main">
                    <span class="panel-kicker">✦ Elemental Profile</span>
                    <h2 class="panel-title" id="panel-title">Información</h2>
                    <p class="panel-sub" id="panel-sub">Conoce tu esencia y afina tu leyenda.</p>
                    <div class="panel-glow"></div>

                    <div class="pane active" data-pane="info">
                        <div class="info-row name-row">
                            <span class="info-icon">🧙</span>
                            <div class="info-main">
                                <span class="info-label">Nombre de jugador</span>
                                <div class="name-display">
                                    <span class="name-text" id="name-text">${player.nombre}</span>
                                    <button class="btn-edit" id="btn-edit-name" title="Cambiar nombre">✏️</button>
                                </div>
                                <div class="name-edit" id="name-edit">
                                    <input type="text" id="name-input" maxlength="20" value="${player.nombre}">
                                    <button class="btn-save" id="btn-save-name">Guardar</button>
                                    <button class="btn-cancel" id="btn-cancel-name">Cancelar</button>
                                </div>
                            </div>
                        </div>

                        <div class="info-row">
                            <span class="info-icon">🪪</span>
                            <div class="info-main">
                                <span class="info-label">ID del jugador</span>
                                <span class="info-value" id="idJugador">${player.id}</span>
                            </div>
                        </div>

                        <div class="info-row">
                            <div class="level-block">
                                <div class="level-badge"><span id="numeroNivel">${player.nivel}</span></div>
                                <div class="xp-section">
                                    <div class="xp-header">
                                        <span>Experiencia</span>
                                        <span>${player.xpActual} / ${player.xpMaxima} XP</span>
                                    </div>
                                    <div class="xp-bar"><div class="xp-fill" id="xp-fill"></div></div>
                                </div>
                            </div>
                        </div>

                        <p class="frase">"${player.frase}"</p>
                    </div>

                    <div class="pane" data-pane="stats">
                        <div class="stats-grid">${statsCards}</div>
                    </div>

                    <div class="pane" data-pane="logros">
                        <span class="logros-counter">🏆 ${player.achievements} / 6 logros desbloqueados</span>
                        <div class="logros-grid">${logrosHtml}</div>
                    </div>
                </section>
            </main>

            <nav class="bottom-nav">
                <div class="nav-elements">${elementsNavHtml}</div>
                <div class="nav-items">
                    <button class="nav-item" data-nav="home">🏠 Inicio</button>
                    <button class="nav-item" data-nav="cards">🃏 Cartas</button>
                    <button class="nav-item" data-nav="missions">🎯 Misiones</button>
                    <button class="nav-item" data-nav="settings">⚙️ Configuración</button>
                    <button class="nav-item active">👤 Perfil</button>
                </div>
            </nav>
        </div>`;

        const node = this.mountDOM(html, { flex: true });

        this.bind('#btn-home', () => this.scene.start('HomeScenes', { playerData: this.playerData }));
        this.bind('[data-nav="home"]', () => this.scene.start('HomeScenes', { playerData: this.playerData }));
        this.bind('[data-nav="cards"]', () => this.scene.start('CardsScene', { playerData: this.playerData }));
        this.bind('[data-nav="missions"]', () => this.scene.start('MissionsScene', { playerData: this.playerData }));
        this.bind('[data-nav="settings"]', () => this.scene.start('SettingsScene', { playerData: this.playerData }));

        // Animación de la barra de experiencia al entrar.
        const xpFill = node.querySelector('#xp-fill');
        if (xpFill) {
            setTimeout(() => {
                xpFill.style.width = xpPercent + '%';
            }, 120);
        }

        // Tabs del panel izquierdo: Información / Estadísticas / Logros.
        const tabs = node.querySelectorAll('.p-tab');
        const panes = node.querySelectorAll('.pane[data-pane]');
        const panelTitle = node.querySelector('#panel-title');
        const panelSub = node.querySelector('#panel-sub');

        tabs.forEach(tab => {
            this.track(tab, () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const paneName = tab.dataset.tab;
                panes.forEach(pane => pane.classList.toggle('active', pane.dataset.pane === paneName));
                if (paneName === 'stats') {
                    panelTitle.textContent = 'Estadísticas';
                    panelSub.textContent = 'Tu progreso forjado a través del combate.';
                } else if (paneName === 'logros') {
                    panelTitle.textContent = 'Logros';
                    panelSub.textContent = 'Hazañas elementales conquistadas.';
                } else {
                    panelTitle.textContent = 'Información';
                    panelSub.textContent = 'Conoce tu esencia y afina tu leyenda.';
                }
            }, 'click');
        });

        // Nombre de jugador editable.
        const nameText = node.querySelector('#name-text');
        const nameEdit = node.querySelector('#name-edit');
        const nameInput = node.querySelector('#name-input');
        const sideName = node.querySelector('#side-name');
        const btnEditName = node.querySelector('#btn-edit-name');
        const btnSaveName = node.querySelector('#btn-save-name');
        const btnCancelName = node.querySelector('#btn-cancel-name');

        const stopEditing = (save) => {
            const value = nameInput.value.trim();
            if (save && value) {
                nameText.textContent = value;
                if (sideName) sideName.textContent = value;
                if (this.playerData.username) this.playerData.username = value;
            }
            nameEdit.style.display = 'none';
            nameText.hidden = false;
        };

        if (btnEditName && nameEdit && nameText) {
            this.track(btnEditName, () => {
                playSfx('click', this);
                nameText.hidden = true;
                nameEdit.style.display = 'flex';
                nameInput.value = nameText.textContent;
                nameInput.focus();
                nameInput.select();
            }, 'click');
        }
        if (btnSaveName) {
            this.track(btnSaveName, () => { playSfx('card', this); stopEditing(true); }, 'click');
        }
        if (btnCancelName) {
            this.track(btnCancelName, () => { playSfx('click', this); stopEditing(false); }, 'click');
        }
        if (nameInput) {
            this.track(nameInput, (ev) => {
                ev.stopPropagation();
                if (ev.key === 'Enter') { playSfx('card', this); stopEditing(true); }
                if (ev.key === 'Escape') { playSfx('click', this); stopEditing(false); }
            }, 'keydown');
        }

        // Avatar: cambiar desde un archivo local.
        const preview = node.querySelector('#preview');
        const avatarFile = node.querySelector('#avatar-file');
        const btnAvatar = node.querySelector('#btn-avatar');

        if (btnAvatar && avatarFile) {
            this.track(btnAvatar, () => { playSfx('click', this); avatarFile.click(); }, 'click');
        }

        this.imageChangeListener = (event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                if (preview) preview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        };
        if (avatarFile) {
            this.track(avatarFile, this.imageChangeListener, 'change');
        }
    }
}