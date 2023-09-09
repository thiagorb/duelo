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
    knightSetHealth,
    knightIncreaseHealth,
    knightGetPosition,
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
import { uiOpponentUpdater, uiPlayerHealthUpdater, uiUpdaterSet } from './ui';
import { menuStart } from './menu';
import { Drop, dropCreate, dropDraw, dropIsPickable, dropStep } from './drop';
import { inventoryAddItem, inventoryIsFull, inventorySetOnEquip } from './inventory';
import {
    EquippedIds,
    EquippedIdsProperties,
    ITEM_LEVELS,
    equipCreateAnimatable,
    equipGetItemId,
    equipGetOriginComponentId,
} from './equip';
import { storageGetEquippedIds, storageGetGold, storageSetGold } from './storage';
import { ModelType, objectCreate } from './model';
import { Animatable, animatableCreate } from './animation';

declare const gameUi: HTMLElement;
declare const btnnext: HTMLElement;
declare const enemyName: HTMLElement;

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
    Player,
    Enemy,
    EnemyEquips,
    TimePassed,
    Drops,
    Level,
    IsOver,
}

export type Game = ReturnType<typeof gameCreate>;

const enum GameDropProperties {
    ItemId,
    Drop,
    Gold,
}

type GameDrop = {
    [GameDropProperties.ItemId]: EquippedIdsProperties;
    [GameDropProperties.Drop]: Drop;
    [GameDropProperties.Gold]: number;
};

export const gameCreate = () => {
    const game = {
        [GameProperties.Player]: knightCreate(vectorCreate(-200, FLOOR_LEVEL), storageGetEquippedIds()),
        [GameProperties.Enemy]: null,
        [GameProperties.TimePassed]: 0,
        [GameProperties.EnemyEquips]: {} as EquippedIds,
        [GameProperties.Drops]: new Array<GameDrop>(),
        [GameProperties.Level]: 0,
        [GameProperties.IsOver]: false,
    };

    gameNextEnemy(game);

    inventorySetOnEquip(equipped => {
        game[GameProperties.Player] = knightCreate(knightGetPosition(game[GameProperties.Player]), equipped);
    });

    return game;
};

let previousIntention = null;
let responseDelay = 0;

const interpolate = (a: number, b: number, t: number) => a + (b - a) * t;

export const gameEnemyStep = (game: Game, player: Knight, enemy: Knight, deltaTime: number) => {
    const playerCenter = knightGetCenter(player);
    const enemyCenter = knightGetCenter(enemy);
    const playerDeltaX = playerCenter - enemyCenter;
    const desiredDistance = 90;
    const desiredX = playerCenter + desiredDistance * (playerDeltaX > 0 ? -1 : 1);
    const deltaX = desiredX - enemyCenter;
    const difficulty = Math.min(1, Math.max(0, game[GameProperties.Level] / 10));

    const closeEnoughToAttack = Math.abs(playerDeltaX) < desiredDistance;
    let intention = null;
    if (Math.abs(deltaX) > desiredDistance * 1.5 || (!closeEnoughToAttack && Math.random() < 0.3)) {
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
        if (
            Math.random() <
            (knightIsDefending(enemy) ? interpolate(0.01, 0.3, difficulty) : interpolate(0.001, 0.01, difficulty))
        ) {
            knightAttack(enemy);
        }

        if (knightIsAttacking(player) && Math.random() < interpolate(0.05, 0.2, difficulty)) {
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
    const player = game[GameProperties.Player];
    const enemy = game[GameProperties.Enemy];

    for (let i = game[GameProperties.Drops].length - 1; i >= 0; i--) {
        const drop = game[GameProperties.Drops][i];
        dropStep(drop[GameDropProperties.Drop], deltaTime);
        if (dropIsPickable(drop[GameDropProperties.Drop], knightGetCenter(player))) {
            if (drop[GameDropProperties.Gold] > 0) {
                storageSetGold(storageGetGold() + drop[GameDropProperties.Gold]);
            } else if (!inventoryIsFull()) {
                inventoryAddItem(drop[GameDropProperties.ItemId]);
            } else {
                continue;
            }
            game[GameProperties.Drops].splice(i, 1);
        }
    }

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
        gameEnemyStep(game, player, enemy, deltaTime);
        gameKnightCheckHit(enemy, player);
        gameKnightEnemyCheckHit(game, player, enemy);
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

const gameKnightEnemyCheckHit = (game: Game, player: Knight, enemy: Knight) => {
    gameKnightCheckHit(player, enemy);

    if (knightIsDead(enemy)) {
        const enemyItems = Object.values(game[GameProperties.EnemyEquips]).filter(id => id >= 0);
        let gold = 0;
        let itemId = enemyItems[(Math.random() * enemyItems.length) | 0];
        let animatable: Animatable;
        let originComponentId = 0;
        if (Math.random() < 0.3 || !(itemId >= 0)) {
            gold = ((Math.random() * 20) | 0) + 5;
            animatable = animatableCreate(objectCreate(ModelType.Gold), []);
        } else {
            animatable = equipCreateAnimatable(itemId);
            originComponentId = equipGetOriginComponentId(itemId);
        }

        const directionLeft = knightGetCenter(enemy) < knightGetCenter(player);
        game[GameProperties.Drops].push({
            [GameDropProperties.ItemId]: itemId,
            [GameDropProperties.Drop]: dropCreate(animatable, originComponentId, knightGetCenter(enemy), directionLeft),
            [GameDropProperties.Gold]: gold,
        });
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
    const playerCenter = knightGetCenter(game[GameProperties.Player]);
    const enemyCenter = knightGetCenter(game[GameProperties.Enemy]);

    currentViewPosition -= ((playerCenter + enemyCenter) / 2 + currentViewPosition) * 0.02;
    const targetScale =
        false && gameIsOver(game) ? 0.4 : Math.min(VIRTUAL_WIDTH / (Math.abs(playerCenter - enemyCenter) + 400), 1.2);
    currentViewScale += (targetScale - currentViewScale) * 0.02;

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
    knightDraw(game[GameProperties.Player], program);
    if (game[GameProperties.Enemy]) {
        knightDraw(game[GameProperties.Enemy], program);
    }

    for (const drop of game[GameProperties.Drops]) {
        dropDraw(drop[GameDropProperties.Drop], program);
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
    gameUi.style.display = null;
    setTimeout(() => gameUi.classList.remove('hidden'));

    let ending = 0;
    let previousTime = 0;
    const loop = (time: number) => {
        const deltaTime = time - previousTime;
        previousTime = time;

        gameStep(game, deltaTime * 0.8);
        glIncreaseTime(program, deltaTime);
        gameRender(game, program);

        game[GameProperties.TimePassed] += deltaTime;

        if (ending === 0 && knightIsDead(game[GameProperties.Player])) {
            ending = 1;
            setTimeout(() => {
                ending = 2;
                gameUi.classList.add('hidden');
                setTimeout(() => (gameUi.style.display = 'none'), 500);
                game[GameProperties.IsOver] = true;
                menuStart(program, game);
            }, 2000);
        }

        if (ending < 2) {
            requestAnimationFrame(loop);
        }
    };

    btnnext.onclick = () => {
        knightSetHealth(game[GameProperties.Player], 1);
        gameNextEnemy(game);
    };

    requestAnimationFrame((time: number) => loop((previousTime = time)));

    if (process.env.NODE_ENV !== 'production') {
        window['game'] = game;
    }
};

const randomEquipLevel = (level: number) =>
    Math.min(ITEM_LEVELS - 1, Math.min(ITEM_LEVELS - 2, level - 2) + ((Math.random() * 2) | 0));

const gameNextEnemy = (game: Game) => {
    game[GameProperties.Level]++;
    enemyName.innerText = `ENEMY LEVEL ${game[GameProperties.Level]}`;
    const level = (game[GameProperties.Level] / 3) | 0;
    game[GameProperties.EnemyEquips] = {
        [EquippedIdsProperties.SwordId]: equipGetItemId(EquippedIdsProperties.SwordId, randomEquipLevel(level)),
        [EquippedIdsProperties.GauntletsId]: equipGetItemId(EquippedIdsProperties.GauntletsId, randomEquipLevel(level)),
        [EquippedIdsProperties.BootsId]: equipGetItemId(EquippedIdsProperties.BootsId, randomEquipLevel(level)),
        [EquippedIdsProperties.HelmetId]: equipGetItemId(EquippedIdsProperties.HelmetId, randomEquipLevel(level)),
        [EquippedIdsProperties.ArmorId]: equipGetItemId(EquippedIdsProperties.ArmorId, randomEquipLevel(level)),
    };
    game[GameProperties.Enemy] = knightCreate(vectorCreate(200, FLOOR_LEVEL), game[GameProperties.EnemyEquips]);
};

if (process.env.NODE_ENV !== 'production') {
    document.body.addEventListener('keydown', e => {
        const game = window['game'];
        if (e.key === 'k') {
            knightIncreaseHealth(game[GameProperties.Enemy], -1);
            gameKnightEnemyCheckHit(game, game[GameProperties.Player], game[GameProperties.Enemy]);
        }

        if (e.key === 'd') {
            knightIncreaseHealth(game[GameProperties.Player], -1);
        }
    });
}

export const gameIsOver = (game: Game) => game[GameProperties.IsOver];
