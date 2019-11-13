import { SimplePhysicsEngine, GameEngine, TwoVector } from 'lance-gg';
import Ship from './Ship';
import Missile from './Missile';
import ShotLengthPowerUp from './ShotLengthPowerUp';

const BASE_MISSILE_STEPS = 30;  // 30 is original, for updateRate 6 in main.js;  less for higher

export default class SpaaaceGameEngine extends GameEngine {

    constructor(options) {
        super(options);
        this.physicsEngine = new SimplePhysicsEngine({
            gameEngine: this,
            collisions: {
                type: 'brute',
                collisionDistance: 28
            }
        });
    }

    registerClasses(serializer){
        serializer.registerClass(Ship);
        serializer.registerClass(Missile);
        serializer.registerClass(ShotLengthPowerUp);
    }

    initWorld(){
        super.initWorld({
            worldWrap: true,
            width: 3000,
            height: 3000
        });
    }

    start() {
        super.start();

        this.on('collisionStart', e => {
            let collisionObjects = Object.keys(e).map(k => e[k]);
            let ship = collisionObjects.find(o => o instanceof Ship);
            let missile = collisionObjects.find(o => o instanceof Missile);
            let shotLengthPowerUp = collisionObjects.find(o => o instanceof ShotLengthPowerUp);

            // make sure not to process the collision between a missile and the ship that fired it
            if (ship && missile && missile.playerId !== ship.playerId) {
                this.destroyMissile(missile.id);
                this.trace.info(() => `missile by ship=${missile.playerId} hit ship=${ship.id}`);
                this.emit('missileHit', { missile, ship });
                return;  // skip further processing
            }

            // powerUp collision: ignore non-ship collisions and ships already powered up
            if (ship && shotLengthPowerUp && ship.missileLifeSteps == BASE_MISSILE_STEPS) {
                ship.missileLifeSteps = BASE_MISSILE_STEPS * 3;  // length is 3x longer
                this.timer.add(ship.missileLifeSteps*10, this.shotLengthPowerDown, this, [ship]);  // timer to remove powerup
                let newX = Math.floor(Math.random()*(this.worldSettings.width-200)) + 200;
                let newY = Math.floor(Math.random()*(this.worldSettings.height-200)) + 200;
                shotLengthPowerUp.position.set(newX, newY);  // move powerup *** not showing move?
                // return;  // skip further processing;  unneeded for last item
            }
        });

        this.on('postStep', this.reduceVisibleThrust.bind(this));
    }

    processInput(inputData, playerId, isServer) {

        super.processInput(inputData, playerId);

        // get the player ship tied to the player socket
        let playerShip = this.world.queryObject({
            playerId: playerId,
            instanceType: Ship
        });

        if (playerShip) {
            if (inputData.input == 'up') {
                playerShip.accelerate(0.05);
                playerShip.showThrust = 5; // show thrust for next steps.
            } else if (inputData.input == 'right') {
                playerShip.turnRight(2.5);
            } else if (inputData.input == 'left') {
                playerShip.turnLeft(2.5);
            } else if (inputData.input == 'space') {
                this.makeMissile(playerShip, inputData.messageIndex);
                this.emit('fireMissile');
            }
        }
    }

    // Makes a new ship, places it randomly and adds it to the game world
    makeShip(playerId) {
        let newShipX = Math.floor(Math.random()*(this.worldSettings.width-200)) + 200;
        let newShipY = Math.floor(Math.random()*(this.worldSettings.height-200)) + 200;

        let ship = new Ship(this, null, {
            position: new TwoVector(newShipX, newShipY)
        });

        ship.playerId = playerId;
        ship.missileLifeSteps = BASE_MISSILE_STEPS;
        this.addObjectToWorld(ship);
        console.log(`ship added: ${ship.toString()}`);

        return ship;
    }

    makeShotLengthPowerUp() {
        let newX = Math.floor(Math.random()*(this.worldSettings.width-200)) + 200;
        let newY = Math.floor(Math.random()*(this.worldSettings.height-200)) + 200;

        let obj = new ShotLengthPowerUp(this, null, {
            position: new TwoVector(newX, newY)
        });
        obj.angle = Math.floor(Math.random()*360);
        obj.width = 2;

        // obj.objId = id;  // don't overwrite obj.id!  don't really need to save unique id anyway
        this.addObjectToWorld(obj);

        return obj;
    }

    // remove powerup effect
    shotLengthPowerDown(ship) {
        if (ship) {
            ship.missileLifeSteps = BASE_MISSILE_STEPS;
        } else {
            console.log('Can\'t powerdown a non-existant ship!');
        }
    }


    makeMissile(playerShip, inputId) {
        let missile = new Missile(this);

        // we want the missile location and velocity to correspond to that of the ship firing it
        missile.position.copy(playerShip.position);
        missile.velocity.copy(playerShip.velocity);
        missile.angle = playerShip.angle;
        missile.playerId = playerShip.playerId;
        missile.ownerId = playerShip.id;
        missile.inputId = inputId; // this enables usage of the missile shadow object
        missile.velocity.x += Math.cos(missile.angle * (Math.PI / 180)) * 10;
        missile.velocity.y += Math.sin(missile.angle * (Math.PI / 180)) * 10;

        this.trace.trace(() => `missile[${missile.id}] created vel=${missile.velocity}`);

        let obj = this.addObjectToWorld(missile);

        // if the object was added successfully to the game world, destroy the missile after some game ticks
        if (obj)
            this.timer.add(playerShip.missileLifeSteps, this.destroyMissile, this, [obj.id]);

        return missile;
    }

    // destroy the missile if it still exists
    destroyMissile(missileId) {
        if (this.world.objects[missileId]) {
            this.trace.trace(() => `missile[${missileId}] destroyed`);
            this.removeObjectFromWorld(missileId);
        }
    }

    // at the end of the step, reduce the thrust for all objects
    reduceVisibleThrust(postStepEv) {
        if (postStepEv.isReenact)
            return;

        let ships = this.world.queryObjects({
            instanceType: Ship
        });

        ships.forEach(ship => {
            if (Number.isInteger(ship.showThrust) && ship.showThrust >= 1)
                ship.showThrust--;
        });
    }
}
