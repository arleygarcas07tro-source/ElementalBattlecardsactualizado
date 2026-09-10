import Phaser from 'phaser';

/**
 * Gestor de audio procedural (WebAudio). No requiere archivos de audio.
 *
 * - Efectos de sonido: se generan al vuelo con `generateConfig` de Phaser
 *   (3.60+) y se limpian solos al terminar.
 * - Música de menú: pad ambiental en La menor generado con la AudioContext
 *   del SoundManager de Phaser, en bucle continuo (no tiene cortes porque
 *   la música se programa con lookahead sobre una línea de tiempo propia).
 */

const SFX = {
    click:    { type: 'sine', frequency: 640, attack: 0.004, decay: 0.05, duration: 0.08, volume: 0.28 },
    card:     { type: 'triangle', frequency: 330, attack: 0.01, decay: 0.14, duration: 0.18, volume: 0.35 },
    draw:     { type: 'triangle', frequency: 520, attack: 0.01, decay: 0.10, duration: 0.14, volume: 0.30 },
    hit:      { type: 'noise', duration: 0.16, attack: 0.004, decay: 0.13, band: 1600, volume: 0.80 },
    death:    { type: 'sawtooth', frequency: 150, attack: 0.02, decay: 0.45, duration: 0.50, volume: 0.45 },
    fusion:   { type: 'sine', frequency: 260, attack: 0.02, decay: 0.30, duration: 0.40, volume: 0.50 },
    firework: { type: 'noise', duration: 0.25, attack: 0.01, decay: 0.22, band: 900, volume: 0.45 },
    victory:  { type: 'triangle', frequency: 523, attack: 0.02, decay: 0.50, duration: 0.60, volume: 0.40 },
    defeat:   { type: 'sawtooth', frequency: 110, attack: 0.05, decay: 0.80, duration: 0.80, volume: 0.40 }
};

const DEFAULT_MUSIC_VOLUME = 80;
const DEFAULT_FX_VOLUME = 65;

let musicVolume = DEFAULT_MUSIC_VOLUME;
let effectsVolume = DEFAULT_FX_VOLUME;

function hasWebAudio(scene) {
    return !!(scene && scene.sound && scene.sound.context && scene.sound.context.state);
}

/* ------------------------------------------------------------------ */
/* Efectos de sonido                                                   */
/* ------------------------------------------------------------------ */

/**
 * Reproduce un efecto procedural. Los efectos se crean y se destruyen
 * solos al terminar, por lo que se pueden solapar sin problemas.
 * @param {string} name - Clave de SFX (ver constantes SFX).
 * @param {Phaser.Scene} scene - Escena actual (aporta el SoundManager).
 */
export function play(name, scene) {
    const cfg = SFX[name];
    if (!cfg || !hasWebAudio(scene)) return;

    const volume = Phaser.Math.Clamp((cfg.volume || 0.3) * (effectsVolume / 100), 0, 1);

    try {
        const sound = scene.sound.add(name, { generateConfig: cfg, volume });
        sound.play();
        sound.once('complete', () => {
            if (sound && sound.destroy) sound.destroy();
        });
        // Red de seguridad: si la escena se cierra antes de terminar el sonido.
        setTimeout(() => {
            if (sound && sound.destroy) sound.destroy();
        }, 3000);
    } catch (e) {
        console.warn('No se pudo reproducir SFX:', name, e);
    }
}

/* ------------------------------------------------------------------ */
/* Música de menú (pad ambiental procedural)                           */
/* ------------------------------------------------------------------ */

const CHORDS = [
    [110, 220, 261.63, 329.63],  // Am
    [87.31, 174.61, 220, 261.63], // F
    [98, 196, 246.94, 293.66],    // C
    [98, 196, 246.94, 329.63]     // G
];

const CHORD_LEN = 6;   // segundos por acorde
const FADE = 2;        // segundos de fundido de ataque/release (solapado)
const LEVEL = 0.07;    // ganancia por nota (silencioso, ambiente)
const LOOKAHEAD = 6;   // se programan acordes con esta antelación

const musicEngine = {
    ctx: null,
    running: false,
    master: null,
    bus: null,
    dryWash: null,
    interval: null,
    nextChordTime: 0,
    chordIndex: 0,
    volume: DEFAULT_MUSIC_VOLUME,

    start(scene) {
        const ctx = scene.sound.context;
        if (!ctx || this.running) return;
        if (ctx.state === 'suspended') ctx.resume();
        this.ctx = ctx;
        this.running = true;
        this.volume = musicVolume;

        // Cadena: bus -> lowpass -> master -> destination
        this.bus = ctx.createGain();
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 900;
        this.master = ctx.createGain();
        this.applyVolume();

        this.bus.connect(this.filter);
        this.filter.connect(this.master);
        this.master.connect(ctx.destination);

        // Tremolo muy suave sobre el bus para "respirar".
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.08;
        lfoGain.gain.value = 0.05;
        lfo.connect(lfoGain);
        lfoGain.connect(this.bus.gain);
        lfo.start();

        // Viento tenue (ruido filtrado) para dar aire al ambiente.
        this.startWind();

        this.nextChordTime = ctx.currentTime + 0.15;
        this.chordIndex = 0;
        this.interval = window.setInterval(() => this.tick(), 100);
    },

    startWind() {
        const ctx = this.ctx;
        const size = Math.floor(ctx.sampleRate * 2);
        const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 320;
        bp.Q.value = 0.6;

        const windGain = ctx.createGain();
        windGain.gain.value = 0.012;

        src.connect(bp);
        bp.connect(windGain);
        windGain.connect(this.master);
        src.start();
        this._windSource = src;
    },

    tick() {
        const horizon = this.ctx.currentTime + LOOKAHEAD;
        while (this.nextChordTime < horizon) {
            this.scheduleChord(this.chordIndex, this.nextChordTime);
            this.chordIndex = (this.chordIndex + 1) % CHORDS.length;
            this.nextChordTime += CHORD_LEN;
        }
    },

    scheduleChord(index, start) {
        const ctx = this.ctx;
        const freqs = CHORDS[index];
        const end = start + CHORD_LEN;
        const releaseStart = start + CHORD_LEN - FADE;

        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = i % 3 === 0 ? 'triangle' : 'sine';
            osc.frequency.value = f;
            g.gain.setValueAtTime(0, start);
            g.gain.linearRampToValueAtTime(LEVEL, start + FADE);
            g.gain.setValueAtTime(LEVEL, releaseStart);
            g.gain.linearRampToValueAtTime(0, end);
            osc.connect(g);
            g.connect(this.bus);
            osc.start(start);
            osc.stop(end + 0.05);
        });
    },

    applyVolume() {
        if (!this.ctx || !this.master) return;
        const now = this.ctx.currentTime;
        const target = (this.volume / 100) * 0.35;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(target, now);
    },

    setVolume(v) {
        this.volume = Phaser.Math.Clamp(Number(v) || 0, 0, 100);
        this.applyVolume();
    },

    stop() {
        if (this.interval) {
            window.clearInterval(this.interval);
            this.interval = null;
        }
        this.running = false;
        if (this.ctx && this.master) {
            const now = this.ctx.currentTime;
            this.master.gain.cancelScheduledValues(now);
            this.master.gain.setValueAtTime(this.master.gain.value, now);
            this.master.gain.linearRampToValueAtTime(0, now + 0.6);
            setTimeout(() => {
                try {
                    if (this.master) this.master.disconnect();
                    if (this.bus) this.bus.disconnect();
                } catch (e) { /* ignorar */ }
                this.master = null;
                this.bus = null;
                this.filter = null;
            }, 650);
        }
    }
};

/**
 * Arranca la música de menú (solo una vez; persiste entre escenas).
 * @param {Phaser.Scene} scene
 */
export function startMenuMusic(scene) {
    if (!hasWebAudio(scene)) return;
    musicEngine.start(scene);
}

export function stopMusic() {
    musicEngine.stop();
}

/* ------------------------------------------------------------------ */
/* Volúmenes (conectados a Configuración)                              */
/* ------------------------------------------------------------------ */

export function setMusicVolume(v) {
    musicVolume = Phaser.Math.Clamp(Number(v) || 0, 0, 100);
    musicEngine.setVolume(musicVolume);
}

export function setEffectsVolume(v) {
    effectsVolume = Phaser.Math.Clamp(Number(v) || 0, 0, 100);
}

export const audioManagerDefaults = {
    musicVolume: DEFAULT_MUSIC_VOLUME,
    effectsVolume: DEFAULT_FX_VOLUME
};