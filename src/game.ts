import { backgroundDraw } from './background';
import {
    Knight,
    knightAttack,
    knightCreate,
    knightDefend,
    knightDraw,
    knightGetAttackPower,
    knightGetBoundingLeft,
    knightGetBoundingRight,
    knightGetCenter,
    knightGetPosition,
    knightGetWeaponId,
    knightGetWeaponTip,
    knightHit,
    knightIsAttacking,
    knightIsDead,
    knightIsDefending,
    knightIsFacingLeft,
    knightIsHitting,
    knightNeutralizeAttack as knightEndAttack,
    knightStep,
    knightTurnLeft,
    knightTurnRight,
    knightWalk,
} from './knight';
import { glClear, glDrawRect, glSetTime, Program } from './gl';
import { Vec2, vectorCreate, vectorMultiply } from './glm';
import { keyboardInitialize } from './keyboard';
import { weaponCreate, weaponGetGap, weaponGetRange } from './weapon';

export const FLOOR_LEVEL = -90;
export const VIRTUAL_WIDTH = 1600 / 3;
export const VIRTUAL_HEIGHT = 900 / 3;
export const GAME_WIDTH = 500;
export const INITIAL_TIME = 30;

const keyboard = keyboardInitialize(['Space', 'ArrowLeft', 'Shift', 'ArrowUp', 'ArrowRight']);

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
    //*
    [GameProperties.Enemy]: knightCreate(vectorCreate(0, FLOOR_LEVEL), weaponCreate(weaponType), initialHealth),
    /*/
    [GameProperties.Enemy]: null,
    //*/
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
    if (!enemy) {
        return;
    }

    if (knightIsDead(enemy)) {
        return;
    }

    const playerCenter = knightGetCenter(player);
    const enemyCenter = knightGetCenter(enemy);
    const playerDeltaX = playerCenter - enemyCenter;
    let desiredX;
    const weaponId = knightGetWeaponId(enemy);
    const desiredDistance = weaponGetGap(weaponId) + weaponGetRange(weaponId);
    if (Math.abs(playerCenter) > GAME_WIDTH / 2 - 100) {
        desiredX = playerCenter + desiredDistance * (playerCenter > 0 ? -1 : 1);
    } else {
        desiredX = playerCenter + desiredDistance * (playerDeltaX > 0 ? -1 : 1);
    }

    const deltaX = desiredX - enemyCenter;

    const closeEnoughToAttack = Math.abs(deltaX) < 50;
    let intention = null;
    if (Math.abs(deltaX) > 70 || (!closeEnoughToAttack && Math.random() < 0.1)) {
        intention = 1;
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

    if (closeEnoughToAttack) {
        if (Math.random() < (knightIsDefending(enemy) ? 0.5 : 0.01)) {
            knightAttack(enemy);
        }

        if (knightIsAttacking(player) && Math.random() < 0.2) {
            knightDefend(enemy);
        }
    }

    gameKnightAttack(game, player, enemy);
    gameKnightAttack(game, enemy, player);

    knightStep(enemy, deltaTime);
};

const gameKnightAttack = (game: Game, knight: Knight, other: Knight) => {
    if (!knightIsHitting(knight, knightGetBoundingLeft(other), knightGetBoundingRight(other))) {
        return;
    }

    knightEndAttack(knight);

    knightHit(other, knightGetAttackPower(knight));
    createHitIndicator(knightGetPosition(other));
    // uiUpdaterSet(uiOpponentUpdater, knightGetHealth(enemy));
    if (knightIsDead(other)) {
        // uiToggleOpponentHealth(false);
    }
};

export const gameStep = (game: Game, deltaTime: number) => {
    const knight = game[GameProperties.Knight];
    const enemy = game[GameProperties.Enemy];

    if (keyboard.Space || keyboard.Shift) {
        knightAttack(knight);
    }

    if (keyboard.ArrowUp) {
        console.log('defend');
        knightDefend(knight);
    }

    if (keyboard.ArrowLeft || keyboard.ArrowRight) {
        if (!enemy || !gameKnightMustTurn(knight, enemy)) {
            knightWalk(knight, deltaTime, keyboard.ArrowLeft);
        }
    }

    console.log(
        'after setp',
        knightGetBoundingLeft(knight),
        knightGetBoundingRight(knight),
        knightGetWeaponTip(knight)
    );
    if (enemy) {
        if (gameKnightMustTurnLeft(knight, enemy)) {
            knightTurnLeft(knight);
        } else if (gameKnightMustTurnRight(knight, enemy)) {
            knightTurnRight(knight);
        }

        if (gameKnightMustTurnLeft(enemy, knight)) {
            knightTurnLeft(enemy);
        } else if (gameKnightMustTurnRight(enemy, knight)) {
            knightTurnRight(enemy);
        }
    }
    gameEnemyStep(game, deltaTime);
    knightStep(knight, deltaTime);

    if (knightGetBoundingLeft(knight) < -GAME_WIDTH / 2) {
        knightWalk(knight, deltaTime, false);
    }
};

const gameKnightMustTurnRight = (knight: Knight, other: Knight) =>
    knightIsFacingLeft(knight) && knightGetCenter(knight) < knightGetCenter(other);

const gameKnightMustTurnLeft = (knight: Knight, other: Knight) =>
    !knightIsFacingLeft(knight) && knightGetCenter(knight) > knightGetCenter(other);

const gameKnightMustTurn = (knight: Knight, other: Knight) =>
    gameKnightMustTurnLeft(knight, other) || gameKnightMustTurnRight(knight, other);

export const gameRender = (game: Game, program: Program) => {
    glClear(program, [0.1, 0.1, 0.1, 0]);

    backgroundDraw(program);
    glSetTime(program, game[GameProperties.TimePassed]);
    knightDraw(game[GameProperties.Knight], program);
    if (game[GameProperties.Enemy]) {
        knightDraw(game[GameProperties.Enemy], program);
    }

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

        // const relativeSpeed = 0.6 + Math.min(0.3, ((game[GameProperties.TimePassed] * 0.00004) | 0) / 10);
        const relativeSpeed = 0.8;
        gameStep(game, deltaTime * relativeSpeed);
        gameRender(game, program);

        game[GameProperties.TimePassed] += deltaTime;

        requestAnimationFrame(loop);
    };

    requestAnimationFrame((time: number) => loop((previousTime = time)));
};
