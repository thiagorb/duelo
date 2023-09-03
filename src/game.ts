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
    knightGetWeaponId,
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
    knightGetHealth,
} from './knight';
import { glClear, glDrawRect, glIncreaseTime, glSetViewMatrix, Program } from './gl';
import {
    Vec2,
    matrixCreate,
    matrixScale,
    matrixSetIdentity,
    matrixTranslate,
    vectorCreate,
    vectorMultiply,
} from './glm';
import { keyboardInitialize } from './keyboard';
import { weaponCreate, weaponGetGap, weaponGetRange } from './weapon';
import { uiOpponentUpdater, uiPlayerHealthUpdater, uiUpdaterSet } from './ui';
import { menuStart } from './menu';

export const FLOOR_LEVEL = -90;
export const VIRTUAL_WIDTH = 1600 / 3;
export const VIRTUAL_HEIGHT = 900 / 3;
export const GAME_WIDTH = 2000;
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
    TimePassed,
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
    [GameProperties.Knight]: knightCreate(vectorCreate(-200, FLOOR_LEVEL), weaponCreate(weaponType), initialHealth),
    [GameProperties.Enemy]: knightCreate(vectorCreate(200, FLOOR_LEVEL), weaponCreate(weaponType), initialHealth),
    [GameProperties.TimePassed]: 0,
    [GameProperties.Opponent]: null as Opponent,
});

let previousIntention = null;
let responseDelay = 0;
export const gameEnemyStep = (player: Knight, enemy: Knight, deltaTime: number) => {
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
    if (Math.abs(deltaX) > 150 || (!closeEnoughToAttack && Math.random() < 0.3)) {
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
        if (Math.random() < (knightIsDefending(enemy) ? 0.3 : 0.01)) {
            knightAttack(enemy);
        }

        if (knightIsAttacking(player) && Math.random() < 0.2) {
            knightDefend(enemy);
        }
    }
};

const gameKnightCheckHit = (knight: Knight, other: Knight) => {
    if (!knightIsHitting(knight, knightGetBoundingLeft(other), knightGetBoundingRight(other))) {
        return;
    }

    knightEndAttack(knight);

    knightHit(other, knightGetAttackPower(knight));
};

export const gameStep = (game: Game, deltaTime: number) => {
    const player = game[GameProperties.Knight];
    const enemy = game[GameProperties.Enemy];

    if (keyboard.Space || keyboard.Shift) {
        knightAttack(player);
    }

    if (keyboard.ArrowUp) {
        knightDefend(player);
    }

    if (keyboard.ArrowLeft || keyboard.ArrowRight) {
        if (!gameKnightMustTurn(player, enemy)) {
            knightWalk(player, deltaTime, keyboard.ArrowLeft);
        }
    }

    gameKnightTurnIfNecessary(player, enemy);
    gameKnightTurnIfNecessary(enemy, player);
    if (!knightIsDead(enemy) && !knightIsDead(player)) {
        gameEnemyStep(player, enemy, deltaTime);
        gameKnightCheckHit(player, enemy);
        gameKnightCheckHit(enemy, player);
    }

    knightStep(player, deltaTime);
    knightStep(enemy, deltaTime);

    uiUpdaterSet(uiPlayerHealthUpdater, knightGetHealth(player));
    uiUpdaterSet(uiOpponentUpdater, knightGetHealth(enemy));

    if (knightGetBoundingLeft(player) < -GAME_WIDTH / 2) {
        knightWalk(player, deltaTime, false);
    }

    if (knightGetBoundingRight(player) > GAME_WIDTH / 2) {
        knightWalk(player, deltaTime, true);
    }
};

const gameKnightTurnIfNecessary = (knight: Knight, other: Knight) => {
    if (knightIsDead(knight)) {
        return;
    }

    if (gameKnightMustTurnLeft(knight, other)) {
        knightTurnLeft(knight);
    } else if (gameKnightMustTurnRight(knight, other)) {
        knightTurnRight(knight);
    }
};

const gameKnightMustTurnRight = (knight: Knight, other: Knight) =>
    knightIsFacingLeft(knight) && knightGetCenter(knight) < knightGetCenter(other);

const gameKnightMustTurnLeft = (knight: Knight, other: Knight) =>
    !knightIsFacingLeft(knight) && knightGetCenter(knight) > knightGetCenter(other);

const gameKnightMustTurn = (knight: Knight, other: Knight) =>
    gameKnightMustTurnLeft(knight, other) || gameKnightMustTurnRight(knight, other);

const viewMatrix = matrixCreate();
let currentViewPosition = 0;
let currentViewScale = 1;
export const gameRender = (game: Game, program: Program) => {
    glClear(program, [0.1, 0.1, 0.1, 0]);

    matrixSetIdentity(viewMatrix);
    matrixScale(viewMatrix, 2 / VIRTUAL_WIDTH, 2 / VIRTUAL_HEIGHT);
    const playerCenter = knightGetCenter(game[GameProperties.Knight]);
    const enemyCenter = knightGetCenter(game[GameProperties.Enemy]);

    currentViewPosition -= ((playerCenter + enemyCenter) / 2 + currentViewPosition) * 0.02;
    currentViewScale +=
        (Math.min(VIRTUAL_WIDTH / (Math.abs(playerCenter - enemyCenter) + 400), 1.2) - currentViewScale) * 0.02;

    matrixTranslate(viewMatrix, 0, -VIRTUAL_HEIGHT * 0.1);
    matrixScale(viewMatrix, currentViewScale, currentViewScale);
    matrixTranslate(viewMatrix, 0, VIRTUAL_HEIGHT * 0.1);

    matrixTranslate(viewMatrix, currentViewPosition, 0);

    glSetViewMatrix(program, viewMatrix);

    backgroundDraw(
        program,
        currentViewPosition,
        currentViewScale,
        !game[GameProperties.TimePassed] || gameIsOver(game)
    );
    knightDraw(game[GameProperties.Knight], program);
    if (game[GameProperties.Enemy]) {
        knightDraw(game[GameProperties.Enemy], program);
    }

    if (false && process.env.NODE_ENV !== 'production') {
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
    document.querySelectorAll('.game-ui').forEach(e => e.classList.remove('hidden'));

    let previousTime = 0;
    const loop = (time: number) => {
        const deltaTime = time - previousTime;
        previousTime = time;

        gameStep(game, deltaTime * 0.8);
        glIncreaseTime(program, deltaTime);
        gameRender(game, program);

        game[GameProperties.TimePassed] += deltaTime;

        if (gameIsOver(game)) {
            document.querySelectorAll('.game-ui').forEach(e => e.classList.add('hidden'));
            menuStart(program, game);
            return;
        }

        requestAnimationFrame(loop);
    };

    requestAnimationFrame((time: number) => loop((previousTime = time)));
};

export const gameIsOver = (game: Game) =>
    knightIsDead(game[GameProperties.Knight]) || knightIsDead(game[GameProperties.Enemy]);
