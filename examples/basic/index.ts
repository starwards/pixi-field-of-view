import { AppLoaderPlugin, PointOfView } from '../../src';
import { Application, Container, InteractionEvent, SCALE_MODES, Sprite, Texture } from 'pixi.js';

// Initialise the plugin
Application.registerPlugin(AppLoaderPlugin);
/* The actual demo code: */

// Create your application
const width = 800;
const height = 500;
const app = new Application({ width, height, autoStart: true });

document.body.appendChild(app.view);
// AppLoaderPlugin.init.apply(app);

// Create a world container
const world = app.fov.container;

// A function to combine different assets of your world object, but give them a common transform by using pixi-layers
// It is of course recommended to create a custom class for this, but this demo just shows the minimal steps required
function createShadowSprite(texture: Texture, shadowTexture: Texture) {
    const container = new Container(); // This represents your final 'sprite'

    // Things that block vision
    if (shadowTexture) {
        const shadowCastingSprite = new Sprite(shadowTexture);

        shadowCastingSprite.parentGroup = app.fov.casterGroup;
        container.addChild(shadowCastingSprite);
    }

    // The things themselves (their texture)
    const sprite = new Sprite(texture);

    container.addChild(sprite);

    return container;
}

// Can set ambientLight for the shadow filter, making the shadow less dark:
// shadows.filter.ambientLight = 0.4;

// Create a point of view
const pointOfView = new PointOfView(700, 1);

pointOfView.position.set(450, 150);
world.addChild(pointOfView);

// Create a background (that doesn't block vision)
const bgTexture = Texture.from('../../assets/background.jpg');
const background = new Sprite(bgTexture);

world.addChild(background);

// Create some shadow casting demons
const demonTexture = Texture.from('../../assets/flameDemon.png');

demonTexture.baseTexture.scaleMode = SCALE_MODES.NEAREST; // For pixelated scaling

const demon1 = createShadowSprite(demonTexture, demonTexture);

demon1.position.set(100, 100);
demon1.scale.set(3);
world.addChild(demon1);

const demon2 = createShadowSprite(demonTexture, demonTexture);

demon2.position.set(500, 100);
demon2.scale.set(3);
world.addChild(demon2);

const demon3 = createShadowSprite(demonTexture, demonTexture);

demon3.position.set(300, 200);
demon3.scale.set(3);
world.addChild(demon3);

// Make the light track your mouse
world.interactive = true;
world.on('mousemove', (event: InteractionEvent) => {
    pointOfView.position.copyFrom(event.data.global);
});

// Create a point of view on click
world.on('pointerdown', (event: InteractionEvent) => {
    const pointOfView2 = new PointOfView(700, 0.7);

    pointOfView2.position.copyFrom(event.data.global);
    world.addChild(pointOfView2);
});
