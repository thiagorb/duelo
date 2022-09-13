import * as modelData from '../art/man.svg';
import {
    Animatable,
    animatableBeginStep,
    animatableCreate,
    animatableDraw,
    animatableGetRootTransform,
    animatableTransform,
    AnimatedProperty,
    Animation,
    animationCreate,
    AnimationElement,
    animationElementCreate,
    animationElementGetValue,
    animationFrameCreate,
    animationFrameItemCreate,
    animationIsRunning,
    animationPause,
    animationResume,
    animationStart,
    animationStep,
    boundElementCreate,
} from './animation';
import { GAME_WIDTH, Weapon, weaponGetId, weaponGetObject } from './game';
import { glDrawRect, glSetGlobalOpacity, Program } from './gl';
import { matrixScale, matrixSetIdentity, matrixTranslateVector, Vec2, vectorAdd, vectorCreate } from './glm';
import { Models, models, objectCreate } from './model';
import { weaponGetAttack, weaponGetDefense, weaponGetGap, weaponGetRange } from './weapon';

const enum KnightProperties {
    Position,
    AttackCooldown,
    AnimatableRight,
    AnimatableLeft,
    AttackAnimation,
    RestAnimation,
    WalkAnimation,
    DeadAnimation,
    FacingLeft,
    Attacking,
    HitSet,
    Opacity,
    Weapon,
    Health,
    AttackingArm,
}

export type Knight = {
    [KnightProperties.Position]: Vec2;
    [KnightProperties.AttackCooldown]: number;
    [KnightProperties.AnimatableRight]: Animatable;
    [KnightProperties.AnimatableLeft]: Animatable;
    [KnightProperties.AttackAnimation]: Animation;
    [KnightProperties.RestAnimation]: Animation;
    [KnightProperties.WalkAnimation]: Animation;
    [KnightProperties.DeadAnimation]: Animation;
    [KnightProperties.FacingLeft]: boolean;
    [KnightProperties.Attacking]: boolean;
    [KnightProperties.HitSet]: WeakSet<object>;
    [KnightProperties.Opacity]: number;
    [KnightProperties.Weapon]: Weapon;
    [KnightProperties.Health]: number;
    [KnightProperties.AttackingArm]: AnimationElement;
};

const ATTACK_START = -3;
const ATTACK_END = -0.7;
export const knightCreate = (position: Vec2, weapon: Weapon, initialHealth: number = 1): Knight => {
    const REST_LEFT_1 = 0;
    const REST_LEFT_2 = -1.5;
    const REST_RIGHT_1 = 0;
    const REST_RIGHT_2 = -0.5;
    const leftArm1 = animationElementCreate(REST_LEFT_1);
    const leftArm2 = animationElementCreate(REST_LEFT_2);
    const rightArm1 = animationElementCreate(REST_RIGHT_1);
    const rightArm2 = animationElementCreate(REST_RIGHT_2);
    const leftLeg1 = animationElementCreate();
    const leftLeg2 = animationElementCreate();
    const rightLeg1 = animationElementCreate();
    const rightLeg2 = animationElementCreate();
    const weaponAnimationElement = animationElementCreate();
    const bodyTranslate = animationElementCreate();

    const restPositionLeftArm = [
        animationFrameItemCreate(leftArm1, REST_LEFT_1, 0.005),
        animationFrameItemCreate(leftArm2, REST_LEFT_2, 0.005),
    ];
    const restPosition = [
        ...restPositionLeftArm,
        animationFrameItemCreate(rightArm1, REST_RIGHT_1, 0.005),
        animationFrameItemCreate(rightArm2, REST_RIGHT_2, 0.005),
        animationFrameItemCreate(rightLeg1, 0, 0.005),
        animationFrameItemCreate(rightLeg2, 0, 0.005),
        animationFrameItemCreate(leftLeg1, 0, 0.005),
        animationFrameItemCreate(leftLeg2, 0, 0.005),
    ];

    const restAnimation = animationCreate([animationFrameCreate(restPosition)]);

    const walkSpeed = 0.9;
    const walkAnimation = animationCreate([
        animationFrameCreate([
            animationFrameItemCreate(leftArm1, -1, 0.01 * walkSpeed),
            animationFrameItemCreate(leftArm2, -0.2, 0.008 * walkSpeed),
            animationFrameItemCreate(rightArm1, 1, 0.01 * walkSpeed),
            animationFrameItemCreate(rightArm2, -1.1, 0.005 * walkSpeed),
            animationFrameItemCreate(leftLeg1, -1, 0.01 * walkSpeed),
            animationFrameItemCreate(leftLeg2, 0.2, 0.008 * walkSpeed),
            animationFrameItemCreate(rightLeg1, 0.5, 0.01 * walkSpeed),
            animationFrameItemCreate(rightLeg2, 1.1, 0.005 * walkSpeed),
        ]),
        animationFrameCreate([
            animationFrameItemCreate(leftArm1, 1, 0.01 * walkSpeed),
            animationFrameItemCreate(leftArm2, -2, 0.008 * walkSpeed),
            animationFrameItemCreate(rightArm1, -1, 0.01 * walkSpeed),
            animationFrameItemCreate(rightArm2, -1.4, 0.005 * walkSpeed),
            animationFrameItemCreate(leftLeg1, 0.5, 0.01 * walkSpeed),
            animationFrameItemCreate(leftLeg2, 2, 0.008 * walkSpeed),
            animationFrameItemCreate(rightLeg1, -1, 0.01 * walkSpeed),
            animationFrameItemCreate(rightLeg2, 0.5, 0.005 * walkSpeed),
        ]),
    ]);

    const knight: Knight = {
        [KnightProperties.Position]: position,
        [KnightProperties.AttackCooldown]: 0,
        [KnightProperties.AnimatableRight]: animatableCreate(
            objectCreate(models[Models.Man], {
                [modelData.weaponLeftComponentId]: weapon && weaponGetObject(weapon),
                [modelData.weaponRightComponentId]: null,
            }),
            [
                boundElementCreate(leftArm1, modelData.leftArm1ComponentId),
                boundElementCreate(leftArm2, modelData.leftArm2ComponentId),
                boundElementCreate(rightArm1, modelData.rightArm1ComponentId),
                boundElementCreate(rightArm2, modelData.rightArm2ComponentId),
                boundElementCreate(leftLeg1, modelData.leftLeg1ComponentId),
                boundElementCreate(leftLeg2, modelData.leftLeg2ComponentId),
                boundElementCreate(rightLeg1, modelData.rightLeg1ComponentId),
                boundElementCreate(rightLeg2, modelData.rightLeg2ComponentId),
                boundElementCreate(weaponAnimationElement, modelData.weaponLeftComponentId),
                boundElementCreate(bodyTranslate, modelData.bodyComponentId, AnimatedProperty.TranslationY),
            ]
        ),
        [KnightProperties.AnimatableLeft]: animatableCreate(
            objectCreate(models[Models.Man], {
                [modelData.weaponLeftComponentId]: null,
                [modelData.weaponRightComponentId]: weapon && weaponGetObject(weapon),
            }),
            [
                boundElementCreate(rightArm1, modelData.leftArm1ComponentId),
                boundElementCreate(rightArm2, modelData.leftArm2ComponentId),
                boundElementCreate(leftArm1, modelData.rightArm1ComponentId),
                boundElementCreate(leftArm2, modelData.rightArm2ComponentId),
                boundElementCreate(leftLeg1, modelData.leftLeg1ComponentId),
                boundElementCreate(leftLeg2, modelData.leftLeg2ComponentId),
                boundElementCreate(rightLeg1, modelData.rightLeg1ComponentId),
                boundElementCreate(rightLeg2, modelData.rightLeg2ComponentId),
                boundElementCreate(weaponAnimationElement, modelData.weaponLeftComponentId),
                boundElementCreate(bodyTranslate, modelData.bodyComponentId, AnimatedProperty.TranslationY),
            ]
        ),
        [KnightProperties.AttackAnimation]: null,
        [KnightProperties.RestAnimation]: restAnimation,
        [KnightProperties.WalkAnimation]: walkAnimation,
        [KnightProperties.DeadAnimation]: null,
        [KnightProperties.FacingLeft]: false,
        [KnightProperties.Attacking]: false,
        [KnightProperties.HitSet]: null,
        [KnightProperties.Opacity]: 0,
        [KnightProperties.Weapon]: weapon,
        [KnightProperties.Health]: initialHealth,
        [KnightProperties.AttackingArm]: leftArm1,
    };

    const attackPrepareSpeed = 0.02;
    const attackSpeed = attackPrepareSpeed * 2;
    knight[KnightProperties.AttackAnimation] = animationCreate([
        animationFrameCreate(
            [
                animationFrameItemCreate(leftArm1, ATTACK_START, attackPrepareSpeed),
                animationFrameItemCreate(leftArm2, -2, attackPrepareSpeed),
            ],
            () => {
                knight[KnightProperties.Attacking] = true;
                knight[KnightProperties.HitSet] = new WeakSet();
            }
        ),
        animationFrameCreate([
            animationFrameItemCreate(leftArm1, ATTACK_END, attackSpeed),
            animationFrameItemCreate(leftArm2, 0, attackSpeed),
        ]),
        animationFrameCreate(restPositionLeftArm),
    ]);

    knight[KnightProperties.DeadAnimation] = animationCreate([
        animationFrameCreate(
            [
                animationFrameItemCreate(leftArm1, 0, 0.01),
                animationFrameItemCreate(leftArm2, 0, 0.01),
                animationFrameItemCreate(rightArm1, 0, 0.01),
                animationFrameItemCreate(rightArm2, 0, 0.01),
                animationFrameItemCreate(weaponAnimationElement, 0.6, 0.002),
                animationFrameItemCreate(bodyTranslate, 60, 0.05),
            ],
            () => animationStart(knight[KnightProperties.DeadAnimation])
        ),
    ]);

    return knight;
};

export const knightDraw = (knight: Knight, program: Program) => {
    glSetGlobalOpacity(program, knight[KnightProperties.Opacity]);

    const animatable = knight[KnightProperties.FacingLeft]
        ? knight[KnightProperties.AnimatableLeft]
        : knight[KnightProperties.AnimatableRight];
    const matrix = animatableGetRootTransform(animatable);
    matrixSetIdentity(matrix);
    matrixTranslateVector(matrix, knight[KnightProperties.Position]);
    if (knight[KnightProperties.FacingLeft]) {
        matrixScale(matrix, -1, 1);
    }
    animatableTransform(animatable);
    animatableDraw(animatable, program);

    glSetGlobalOpacity(program, 1);

    if (false && process.env.NODE_ENV !== 'production') {
        const progress = knightIsAttacking(knight) ? getAttackProgress(knight) : 1;
        if (knight[KnightProperties.Weapon]) {
            glDrawRect(program, vectorCreate(getAttackLeft(knight, progress), 0), vectorCreate(ATTACK_WIDTH, 100));
        }

        glDrawRect(
            program,
            vectorAdd(vectorCreate(-KNIGHT_WIDTH / 2, 0), knight[KnightProperties.Position]),
            vectorCreate(KNIGHT_WIDTH, KNIGHT_HEIGHT)
        );
    }
};

const ATTACK_COOLDOWN_TIME = 100;

export const knightAttack = (knight: Knight) => {
    if (animationIsRunning(knight[KnightProperties.AttackAnimation]) || knight[KnightProperties.AttackCooldown] > 0) {
        return;
    }

    animationStart(knight[KnightProperties.AttackAnimation]);
};

const moveSpeed = 0.3;
export const knightWalk = (knight: Knight, deltaTime: number, left: boolean) => {
    const newX = knight[KnightProperties.Position][0] + moveSpeed * deltaTime * (left ? -1 : 1);
    knight[KnightProperties.Position][0] = Math.max(-GAME_WIDTH / 2, Math.min(GAME_WIDTH / 2, newX));
    animationResume(knight[KnightProperties.WalkAnimation]);
    knight[KnightProperties.FacingLeft] = left;
};

export const knightTurnRight = (knight: Knight) => {
    knight[KnightProperties.FacingLeft] = false;
};

export const knightIsAttacking = (knight: Knight) => {
    return !knightIsDead(knight) && knight[KnightProperties.Attacking];
};

export const knightDie = (knight: Knight) => {
    knight[KnightProperties.Health] = 0;
    animationStart(knight[KnightProperties.DeadAnimation]);
};

export const knightIsDead = (knight: Knight) => knight[KnightProperties.Health] <= 0;

export const knightStep = (knight: Knight, deltaTime: number) => {
    if (knightIsAttacking(knight) && getAttackProgress(knight) === 1) {
        knight[KnightProperties.Attacking] = false;
    }

    const opacityDirection = knightIsDead(knight) ? -0.5 : 1;
    knight[KnightProperties.Opacity] = Math.max(
        0,
        Math.min(1, knight[KnightProperties.Opacity] + 0.002 * deltaTime * opacityDirection)
    );
    animatableBeginStep(knight[KnightProperties.AnimatableRight]);
    animatableBeginStep(knight[KnightProperties.AnimatableLeft]);

    knight[KnightProperties.AttackCooldown] = Math.max(0, knight[KnightProperties.AttackCooldown] - deltaTime);

    animationStep(knight[KnightProperties.DeadAnimation], deltaTime);
    if (animationStep(knight[KnightProperties.AttackAnimation], deltaTime)) {
        knight[KnightProperties.AttackCooldown] = ATTACK_COOLDOWN_TIME;
    }
    animationStep(knight[KnightProperties.WalkAnimation], deltaTime);

    if (!animationIsRunning(knight[KnightProperties.RestAnimation])) {
        animationStart(knight[KnightProperties.RestAnimation]);
    }
    animationStep(knight[KnightProperties.RestAnimation], deltaTime);

    animationPause(knight[KnightProperties.WalkAnimation]);
};

const ATTACK_WIDTH = 1;
const getAttackProgress = (knight: Knight) => {
    const arm = knight[KnightProperties.AttackingArm];

    return (animationElementGetValue(arm) - ATTACK_START) / (ATTACK_END - ATTACK_START);
};
const getAttackLeft = (knight: Knight, progress: number) => {
    const gap = weaponGetGap(weaponGetId(knight[KnightProperties.Weapon]));
    const range = weaponGetRange(weaponGetId(knight[KnightProperties.Weapon]));
    const direction = knight[KnightProperties.FacingLeft] ? -1 : 1;
    const attackOrigin = knight[KnightProperties.Position][0] + direction * gap;
    return attackOrigin + progress * direction * range - ATTACK_WIDTH / 2;
};

export const knightIsHitting = (knight: Knight, boundingLeft: number, boundingRight: number) => {
    if (!knightIsAttacking(knight)) {
        return false;
    }

    const attackProgress = getAttackProgress(knight);
    const attackLeft = getAttackLeft(knight, attackProgress);
    const attackRight = attackLeft + ATTACK_WIDTH;
    return attackLeft < boundingRight && attackRight >= boundingLeft;
};

export const knightRegisterHit = (knight: Knight, target: object): boolean => {
    if (knight[KnightProperties.HitSet].has(target)) {
        return false;
    }

    knight[KnightProperties.HitSet].add(target);
    return true;
};

// This was measured
const KNIGHT_WIDTH = 50;
const KNIGHT_HEIGHT = 100;

export const knightGetPosition = (knight: Knight) => knight[KnightProperties.Position];

export const knightIsFacingLeft = (knight: Knight) => knight[KnightProperties.FacingLeft];

const ATTACK_DURATION = 50;
export const knightGetBoundingLeft = (knight: Knight) => knight[KnightProperties.Position][0] - KNIGHT_WIDTH / 2;
export const knightGetBoundingRight = (knight: Knight) => knight[KnightProperties.Position][0] + KNIGHT_WIDTH / 2;

export const knightGetAttackPower = (knight: Knight) =>
    2 + 2 * weaponGetAttack(weaponGetId(knight[KnightProperties.Weapon]));

export const knightGetDefense = (knight: Knight) =>
    15 + 2 * weaponGetDefense(weaponGetId(knight[KnightProperties.Weapon]));

export const knightHit = (knight: Knight, power: number) => {
    knightIncreaseHealth(knight, -power / knightGetDefense(knight));
};

export const knightGetHealth = (knight: Knight) => knight[KnightProperties.Health];

export const knightIncreaseHealth = (knight: Knight, amount: number) => {
    if (knightIsDead(knight)) {
        return;
    }

    // knight[KnightProperties.Health] += amount;
    if (knightIsDead(knight)) {
        knightDie(knight);
    }
};

export const knightGetWeaponId = (knight: Knight) => weaponGetId(knight[KnightProperties.Weapon]);
