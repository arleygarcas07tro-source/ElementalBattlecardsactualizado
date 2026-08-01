export default class CardsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CardsScene' });
        
        this.cardsContainer = null;
        this.cardwidth = 180;
        this.cardheight = 260;
        
        this.cards = [
            //cartas
            { element: "agua", level: 1 },
            { element: "agua", level: 2 },
            { element: "agua", level: 3 },  
            { element: "aire", level: 1 },
            { element: "aire", level: 2 },
            { element: "aire", level: 3 },
            { element: "fuego", level: 1 },
            { element: "fuego", level: 2 },
            { element: "fuego", level: 3 },
            { element: "tierra", level: 1 },
            { element: "tierra", level: 2 },
            { element: "tierra", level: 3 },
            { element: "luz", level: 1 },
            { element: "luz", level: 2 },
            { element: "luz", level: 3 },
            { element: "oscuridad", level: 1 },
            { element: "oscuridad", level: 2 },
            { element: "oscuridad", level: 3 }
        ];
    }
    preload() {
        this.load.image('fondocartas', 'public/assets/images/fondo_cartas/fondocartas.jpeg');
    
        const elements = [
            "agua", "aire", "fuego", "tierra", "luz", "oscuridad"
        ]
        elements.forEach(element => {
            for (let nivel = 1; nivel <= 3; nivel++) {
                this.load.image(`
                    'carta-${element}-${nivel}`, `public/assets/images/cartas/carta-${element}-${nivel}.jpeg`);
            }
        });
    }
    create() {
      //agregar fondo
      this.add.image(
        this.scale.width / 2, 
        this.scale.height / 2, 
        'fondocartas').setDisplaySize(this.scale.width, this.scale.height);

       const volver = this.add.text(40, 35, "← VOLVER", {
    fontFamily: "Cinzel",
    fontSize: "22px",
    fontStyle: "bold",
    color: "#C9A86A",
    stroke: "#3E2B14",
    strokeThickness: 2
});

volver.setInteractive({ useHandCursor: true });

// Efecto al pasar el cursor
volver.on("pointerover", () => {
    volver.setColor("#E7C98B");
    volver.setScale(1.05);
});

// Cuando el cursor sale
volver.on("pointerout", () => {
    volver.setColor("#C9A86A");
    volver.setScale(1);
});

// Al hacer clic
volver.on("pointerdown", () => {
    volver.setColor("#A87E3D");
});

// Al soltar el clic
volver.on("pointerup", () => {
    volver.setColor("#E7C98B");

    // Cambiar a la escena principal
    this.scene.start("homeScene");
});

    //contenedor de cartas
    this.cardsContainer = this.add.container(0.0);

    //crear la cuadricula de cartas
    this.createCardGrid();{

    const startX = 180;
    const startY = 180;

    const horizontalSpacing = 190;
    const verticalSpacing = 280;

    this.cards.forEach((card, index) => {

        const column = index % 6;
        const row = Math.floor(index / 6);

        const x = startX + (column * horizontalSpacing);
        const y = startY + (row * verticalSpacing);

        const imageKey = `carta-${card.element}-${card.level}`;

        const carta = this.add.image(x, y, imageKey);

        carta.setDisplaySize(150, 220);

        this.cardsContainer.add(carta);

    });

}

    }
    update() {}
 }    