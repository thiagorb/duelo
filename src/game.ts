import * as swordModelData from '../art/sword.svg';
import { backgroundDraw } from './background';
import {
    knightAttack,
    knightCreate,
    knightDraw,
    knightGetAttackPower,
    knightGetBoundingLeft,
    knightGetBoundingRight,
    knightGetPosition,
    knightGetWeaponId,
    knightHit,
    knightIsDead,
    knightIsFacingLeft,
    knightIsHitting,
    knightRegisterHit,
    knightStep,
    knightWalk,
} from './knight';
import { ColorRGB, glClear, glDrawRect, glSetTime, Program } from './gl';
import { Vec2, vectorCreate, vectorMultiply } from './glm';
import { keyboardInitialize } from './keyboard';
import { modelGetWeapons, Object, objectCreate } from './model';
import { weaponGetAttack, weaponGetDefense, weaponGetGap, weaponGetModelType, weaponGetRange } from './weapon';

export const FLOOR_LEVEL = -90;
export const VIRTUAL_WIDTH = 1600 / 3;
export const VIRTUAL_HEIGHT = 900 / 3;
export const GAME_WIDTH = 500;
export const INITIAL_TIME = 30;

const keyboard = keyboardInitialize(['Space', 'ArrowLeft', 'ArrowRight']);

export const gameIsOutOfArea = (position: Vec2) => {
    return (
        position[0] > (GAME_WIDTH * 1.1) / 2 ||
        position[0] < (-GAME_WIDTH * 1.1) / 2 ||
        position[1] > (GAME_WIDTH * 1.1) / 2 ||
        position[1] < (-GAME_WIDTH * 1.1) / 2
    );
};

export const enum GameProperties {
    Knight,
    Enemy,
    Score,
    NextEnemy,
    TimePassed,
    Combo,
    Opponent,
}

export type Game = ReturnType<typeof gameCreate>;

export const enum OpponentProperties {
    WeaponType,
    Name,
}

export type Opponent = {
    [OpponentProperties.WeaponType]: number;
    [OpponentProperties.Name]: string;
};

export const gameCreate = (weaponType: number, initialHealth: number = 1) => ({
    [GameProperties.Knight]: knightCreate(vectorCreate(0, FLOOR_LEVEL), weaponCreate(weaponType), initialHealth),
    [GameProperties.Enemy]: knightCreate(vectorCreate(0, FLOOR_LEVEL), weaponCreate(weaponType), initialHealth),
    [GameProperties.Score]: 0,
    [GameProperties.NextEnemy]: (15 + 30 * Math.random()) * 1000,
    [GameProperties.TimePassed]: 0,
    [GameProperties.Combo]: 0,
    [GameProperties.Opponent]: null as Opponent,
});

const createHitIndicator = (position: Vec2) => createIndicator('HIT', position[0], position[1] + 50, 'hit');

const createIndicator = (text: string, x: number, y: number, type: string) => {
    const indicator = document.createElement('div');
    indicator.classList.add('indicator');
    indicator.classList.add(type);
    indicator.onanimationend = () => indicator.remove();
    indicator.innerText = text;
    Object.assign(indicator.style, {
        left: `calc(50% + ${x}px`,
        top: `calc(50% - ${y}px`,
    });
    document.querySelector('#screen').appendChild(indicator);
};

let previousIntention = null;
let responseDelay = 0;
export const gameEnemyStep = (game: Game, deltaTime: number) => {
    const player = game[GameProperties.Knight];
    const enemy = game[GameProperties.Enemy];
    if (enemy) {
        knightStep(enemy, deltaTime);

        if (!knightIsDead(enemy)) {
            const playerX = knightGetPosition(player)[0];
            const playerDeltaX = playerX - knightGetPosition(enemy)[0];
            let desiredX;
            const weaponId = knightGetWeaponId(enemy);
            const desiredDistance = weaponGetGap(weaponId) + weaponGetRange(weaponId);
            if (Math.abs(playerX) > GAME_WIDTH / 2 - 100) {
                desiredX = playerX + desiredDistance * (playerX > 0 ? -1 : 1);
            } else {
                desiredX = playerX + desiredDistance * (playerDeltaX > 0 ? -1 : 1);
            }

            const deltaX = desiredX - knightGetPosition(enemy)[0];
            const facingOpposite = knightIsFacingLeft(enemy) !== playerDeltaX < 0;

            let intention = null;
            if ((Math.abs(deltaX) > 10 && facingOpposite) || Math.abs(deltaX) > 20) {
                intention = 1;
            } else if (facingOpposite) {
                intention = 2;
            }

            if (responseDelay > 0) {
                responseDelay -= deltaTime;
            } else if (previousIntention !== intention) {
                responseDelay = 150 + Math.random() * 150;
                previousIntention = intention;
            } else {
                if (intention === 1) {
                    knightWalk(enemy, deltaTime, deltaX < 0);
                } else if (intention === 2) {
                    knightWalk(enemy, deltaTime, !knightIsFacingLeft(enemy));
                }
            }

            if (!facingOpposite && Math.random() < 0.01) {
                knightAttack(enemy);
            }

            if (
                knightIsHitting(enemy, knightGetBoundingLeft(player), knightGetBoundingRight(player)) &&
                knightRegisterHit(enemy, player)
            ) {
                knightHit(player, knightGetAttackPower(enemy));
                createHitIndicator(knightGetPosition(player));
            }

            if (
                knightIsHitting(player, knightGetBoundingLeft(enemy), knightGetBoundingRight(enemy)) &&
                knightRegisterHit(player, enemy)
            ) {
                knightHit(enemy, knightGetAttackPower(player));
                createHitIndicator(knightGetPosition(enemy));
                // uiUpdaterSet(uiOpponentUpdater, knightGetHealth(enemy));
                if (knightIsDead(enemy)) {
                    // uiToggleOpponentHealth(false);
                }
            }
        }
    }
};

export const gameStep = (game: Game, deltaTime: number) => {
    if (keyboard.ArrowLeft || keyboard.ArrowRight) {
        knightWalk(game[GameProperties.Knight], deltaTime, keyboard.ArrowLeft);
    }

    if (keyboard.Space) {
        knightAttack(game[GameProperties.Knight]);
    }

    knightStep(game[GameProperties.Knight], deltaTime);
    gameEnemyStep(game, deltaTime);
};

export const gameRender = (game: Game, program: Program) => {
    glClear(program, [0.1, 0.1, 0.1, 0]);

    backgroundDraw(program);
    glSetTime(program, game[GameProperties.TimePassed]);
    knightDraw(game[GameProperties.Knight], program);
    knightDraw(game[GameProperties.Enemy], program);

    if (process.env.NODE_ENV !== 'production') {
        renderDebuggingRects(program);
    }
};

const virtualOrigin = vectorMultiply(vectorCreate(VIRTUAL_WIDTH, VIRTUAL_HEIGHT), -0.5);
const virtualSize = vectorCreate(VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
const gameOrigin = vectorMultiply(vectorCreate(GAME_WIDTH, VIRTUAL_HEIGHT), -0.5);
const gameSize = vectorCreate(GAME_WIDTH, VIRTUAL_HEIGHT);
const renderDebuggingRects = (program: Program) => {
    glDrawRect(program, virtualOrigin, virtualSize);
    glDrawRect(program, gameOrigin, gameSize);
};

export const gameStart = (game: Game, program: Program) => {
    let previousTime = 0;
    const loop = (time: number) => {
        const deltaTime = time - previousTime;
        previousTime = time;

        const relativeSpeed = 0.6 + Math.min(0.3, ((game[GameProperties.TimePassed] * 0.00004) | 0) / 10);
        gameStep(game, deltaTime * relativeSpeed);
        gameRender(game, program);

        game[GameProperties.TimePassed] += deltaTime;

        requestAnimationFrame(loop);
    };

    requestAnimationFrame((time: number) => loop((previousTime = time)));
};

const enum WeaponProperties {
    Object,
    Id,
}

export type Weapon = {
    [WeaponProperties.Object]: Object;
    [WeaponProperties.Id]: number;
};

const weaponColors: Array<ColorRGB> = [
    [0.4, 0.22, 0], // wood
    [0.75, 0.54, 0.44], // bronze
    [0.81, 0.82, 0.84], // steel
    [0.83, 0.69, 0.22], // gold
];

export const weaponCreate = (weaponId: number): Weapon => {
    const modelType = weaponGetModelType(weaponId);
    const model = modelGetWeapons()[modelType];
    const metalColor = weaponColors[1 + weaponGetAttack(weaponId)];
    const gripColor = weaponColors[weaponGetDefense(weaponId)];
    const colorOverrides = [
        {
            [swordModelData.metalComponentId]: metalColor,
            [swordModelData.gripComponentId]: gripColor,
        },
    ][modelType];

    return {
        [WeaponProperties.Object]: objectCreate(model, {}, colorOverrides),
        [WeaponProperties.Id]: weaponId,
    };
};

export const weaponGetObject = (weapon: Weapon) => weapon[WeaponProperties.Object];
export const weaponGetId = (weapon: Weapon) => weapon[WeaponProperties.Id];
