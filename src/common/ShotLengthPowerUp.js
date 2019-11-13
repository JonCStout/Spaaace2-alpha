import { BaseTypes, DynamicObject, Renderer } from 'lance-gg';

export default class ShotLengthPowerUp extends DynamicObject {

    constructor(gameEngine, options, props){
        super(gameEngine, options, props);
    }

    // this is what allows usage of shadow object with input-created objects
    // see https://medium.com/javascript-multiplayer-gamedev/chronicles-of-the-development-of-a-multiplayer-game-part-2-loops-and-leaks-10b453e843e0
    // in the future this will probably be embodied in a component

    static get netScheme() {
        return Object.assign({
            inputId: { type: BaseTypes.TYPES.INT32 }
        }, super.netScheme);
    }

    // position correction if less than world width/height
    get bending() {
        return {
            // position: { max: 5000.0 },
            position: { percent: 1.0 },
            velocity: { percent: 1.0 }
        };
    }

    onAddToWorld(gameEngine) {
        if (Renderer) {
            let renderer = Renderer.getInstance();
            let sprite = new PIXI.Sprite(PIXI.loader.resources.shotLengthPowerUp.texture);
            renderer.sprites[this.id] = sprite;
            sprite.width = 64;
            sprite.height = 64;
            sprite.anchor.set(0.5, 0.5);
            sprite.position.set(this.position.x, this.position.y);
            renderer.layer2.addChild(sprite);
        }
    }

    onRemoveFromWorld(gameEngine) {
        if (Renderer) {
            let renderer = Renderer.getInstance();
            if (renderer.sprites[this.id]) {
                renderer.sprites[this.id].destroy();
                delete renderer.sprites[this.id];
            }
        }
    }

    syncTo(other) {
        super.syncTo(other);
        this.inputId = other.inputId;
    }
}
