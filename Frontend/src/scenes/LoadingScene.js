import Phaser from 'phaser';

export default class LoadingScene extends Phaser.Scene {
    constructor() {
        super('LoadingScene');
    }

    init(data) {
        this.playerData = data.playerData || { username: 'Jugador' };
    }

    create() {
        const { width, height } = this.scale;

        // Verificar si las texturas fueron cargadas por BootScene
        const hasBg = this.textures.exists('loading-background');
        const hasLogo = this.textures.exists('loading-logo');
        console.log('🎬 LoadingScene iniciada - textures - background:', hasBg, 'logo:', hasLogo);

        if (hasBg) {
            // Añadir el fondo y escalarlo en modo 'cover' para mantener la proporción
            const src = this.textures.get('loading-background').getSourceImage();
            const imgW = src.width;
            const imgH = src.height;
            const scaleX = width / imgW;
            const scaleY = height / imgH;
            const scale = Math.max(scaleX, scaleY);
            const displayW = imgW * scale;
            const displayH = imgH * scale;

            const bg = this.add.image(width / 2, height / 2, 'loading-background')
                .setOrigin(0.5)
                .setDisplaySize(displayW, displayH);
            // Enviar al fondo para que no tape otros elementos
            bg.setDepth(-10);
            console.log('✅ Fondo de carga cargado correctamente');
        } else {
            // Fallback si no está la imagen: fondo sólido (debug)
            this.add.rectangle(width / 2, height / 2, width, height, 0x050505).setOrigin(0.5);
            console.warn('⚠️ LoadingScene: loading-background no disponible, usando fondo sólido.');
        }

        // Overlay semi-transparente encima del fondo para mejorar legibilidad
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.25).setOrigin(0.5).setDepth(0);

        const titleStyle = {
            fontFamily: 'Georgia',
            fontSize: '64px',
            color: '#c68c46',
            fontStyle: 'bold',
            stroke: '#2b1d0f',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#000', blur: 18, fill: true }
        };

        const subtitleStyle = {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#e4d2a3',
            align: 'center'
        };

        this.add.text(width / 2, height * 0.30, 'Elemental Battlecards', titleStyle).setOrigin(0.5).setDepth(5);
        this.add.text(width / 2, height * 0.375, 'Cargando reino elemental...', subtitleStyle).setOrigin(0.5).setDepth(5);

        const elementIcons = [
            { key: 'icon-agua', label: 'Agua', fallback: '💧' },
            { key: 'icon-fuego', label: 'Fuego', fallback: '🔥' },
            { key: 'icon-espiritu', label: 'Tierra', fallback: '🌍' },
            { key: 'icon-luz', label: 'Aire', fallback: '🌬️' },
            { key: 'icon-planta', label: 'Naturaleza', fallback: '🌿' },
            { key: 'icon-sombra', label: 'Oscuridad', fallback: '🌑' }
        ];

        const iconXStart = width / 2 - ((elementIcons.length - 1) * 100) / 2;
        const iconY = height * 0.48;

        elementIcons.forEach((icon, index) => {
            const x = iconXStart + index * 100;
            const circle = this.add.circle(x, iconY, 42, 0x1b1308, 0.7).setStrokeStyle(2, 0xd7b276, 0.7).setDepth(5);

            if (this.textures.exists(icon.key)) {
                this.add.image(x, iconY, icon.key)
                    .setOrigin(0.5)
                    .setDisplaySize(64, 64)
                    .setDepth(6);
            } else {
                this.add.text(x, iconY, icon.fallback, { fontSize: '36px' }).setOrigin(0.5).setDepth(6);
            }

            this.add.text(x, iconY + 60, icon.label, { fontFamily: 'Arial', fontSize: '16px', color: '#e8d4a8' })
                .setOrigin(0.5)
                .setDepth(6);
        });

        const progressBarWidth = width * 0.7;
        const progressBarHeight = 18;
        const progressX = width / 2 - progressBarWidth / 2;
        const progressY = height * 0.70;

        const progressBg = this.add.rectangle(progressX, progressY, progressBarWidth, progressBarHeight, 0x1a1a1a).setOrigin(0).setDepth(5);
        progressBg.setStrokeStyle(2, 0x38d9a9, 0.4);
        
        const progressFill = this.add.rectangle(progressX, progressY, 0, progressBarHeight, 0x38d9a9).setOrigin(0).setDepth(6);
        const progressGlow = this.add.rectangle(progressX, progressY, 0, progressBarHeight, 0x9af7d4, 0.6).setOrigin(0).setDepth(5);

        const quoteStyle = {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#999999',
            fontStyle: 'italic',
            align: 'center'
        };

        this.add.text(width / 2, progressY + 50, '"El fuego consume, pero el agua perdura. Elige sabiamente tus aliados."', quoteStyle).setOrigin(0.5).setDepth(5);

        const loadingText = this.add.text(width / 2, progressY - 36, 'Cargando 0%', { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5).setDepth(6);

        let progress = 0;
        this.tweens.addCounter({
            from: 0,
            to: 100,
            duration: 2500,
            ease: 'Power1',
            onUpdate: (tween) => {
                progress = tween.getValue();
                progressFill.width = (progressBarWidth * progress) / 100;
                progressGlow.width = progressFill.width;
                loadingText.setText(`Cargando ${Math.round(progress)}%`);
            },
            onComplete: () => {
                console.log('✅ Carga completada, transitando a HomeScenes...');
                this.scene.start('HomeScenes', { playerData: this.playerData });
            }
        });
    }
}
