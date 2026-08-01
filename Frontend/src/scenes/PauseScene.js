/**
 * Escena de Pausa - Se superpone a la GameScene cuando el jugador pausa
 * Muestra un menú elegante con opciones de continuar, reiniciar, configuración y salir
 */
export default class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
        this.isPaused = false;
        this.playerData = {};
    }

    init(data) {
        this.playerData = data.playerData || {};
    }

    create(data) {
        const { width, height } = this.scale;
        
        // Trasfondo oscuro semi-transparente (efecto blur)
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
            .setOrigin(0)
            .setDepth(100)
            .setInteractive(); // Evita clicks detrás del menú
        
        // =============== TÍTULO ===============
        const titleY = height * 0.15;
        
        // Ícono de pausa (círculo con dos barras)
        const iconBg = this.add.graphics();
        iconBg.fillStyle(0xffd700, 0.1);
        iconBg.fillCircle(0, 0, 60);
        iconBg.lineStyle(3, 0xffd700, 1);
        iconBg.strokeCircle(0, 0, 60);
        iconBg.setPosition(width / 2, titleY);
        iconBg.setDepth(101);
        
        const pauseIcon = this.add.text(width / 2, titleY, '⏸', { 
            fontSize: '60px', 
            color: '#ffd700' 
        }).setOrigin(0.5).setDepth(102);
        
        // Título
        this.add.text(width / 2, titleY + 90, 'MODO NIVELES', {
            fontSize: '48px',
            color: '#ffffff',
            fontStyle: 'bold',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(102);
        
        // Subtítulo
        this.add.text(width / 2, titleY + 140, 'El juego está en pausa', {
            fontSize: '24px',
            color: '#cccccc',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(102);
        
        // =============== BOTONES ===============
        const centerX = width / 2;
        const buttonsStartY = height * 0.35;
        const buttonSpacing = 80;
        const buttonWidth = 350;
        const buttonHeight = 60;
        
        // Función para crear botón estilizado
        const createMenuButton = (x, y, text, icon, borderColor, bgColor) => {
            const container = this.add.container(x, y);
            
            // Fondo del botón
            const bg = this.add.graphics();
            bg.fillStyle(bgColor, 0.2);
            bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
            bg.lineStyle(3, borderColor, 1);
            bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
            
            // Ícono
            const iconText = this.add.text(-120, 0, icon, {
                fontSize: '36px',
                color: borderColor
            }).setOrigin(0.5).setDepth(103);
            
            // Texto del botón
            const btnText = this.add.text(0, 0, text, {
                fontSize: '22px',
                color: '#ffffff',
                fontStyle: 'bold',
                fontFamily: 'Arial'
            }).setOrigin(0.5, 0.5).setDepth(103);
            
            container.add([bg, iconText, btnText]);
            container.setSize(buttonWidth, buttonHeight);
            container.setInteractive(
                new Phaser.Geom.Rectangle(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight),
                Phaser.Geom.Rectangle.Contains
            );
            container.setDepth(102);
            
            // Efectos hover
            container.on('pointerover', () => {
                container.setScale(1.05);
                bg.clear();
                bg.fillStyle(borderColor, 0.15);
                bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
                bg.lineStyle(3, borderColor, 1.5);
                bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
                this.input.setDefaultCursor('pointer');
            });
            
            container.on('pointerout', () => {
                container.setScale(1);
                bg.clear();
                bg.fillStyle(bgColor, 0.2);
                bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
                bg.lineStyle(3, borderColor, 1);
                bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 15);
                this.input.setDefaultCursor('default');
            });
            
            return container;
        };
        
        // Botón CONTINUAR (Verde)
        const continueBtn = createMenuButton(
            centerX,
            buttonsStartY,
            'CONTINUAR',
            '▶',
            0x00ff00,
            0x006600
        );
        
        continueBtn.on('pointerdown', () => {
            this.scene.stop('PauseScene');
            this.scene.resume('GameScene');
            this.scene.resume('UIScene');
        });
        
        // Botón CONFIGURACIÓN (Naranja)
        const configBtn = createMenuButton(
            centerX,
            buttonsStartY + buttonSpacing,
            'CONFIGURACIÓN',
            '⚙',
            0xffaa00,
            0x663300
        );
        
        configBtn.on('pointerdown', () => {
            this.scene.start('SettingsScene', {
                playerData: this.playerData,
                returnScene: 'PauseScene'
            });
        });
        
        // Botón SALIR AL MENÚ (Rojo)
        const exitBtn = createMenuButton(
            centerX,
            buttonsStartY + buttonSpacing * 2,
            'SALIR AL MENÚ PRINCIPAL',
            '←',
            0xff4444,
            0x660000
        );
        
        exitBtn.on('pointerdown', () => {
            this.scene.stop('PauseScene');
            this.scene.stop('UIScene');
            this.scene.stop('GameScene');
            this.scene.start('HomeScenes');
        });
        
        // =============== TECLA ESC PARA CERRAR ===============
        this.input.keyboard.on('keydown-ESC', () => {
            continueBtn.emit('pointerdown');
        });
    }
}
