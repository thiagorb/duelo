import * as modelData from '../art/man.svg';
import {
    Animatable,
    animatableBeginStep,
    animatableCreate,
    animatableDraw,
    animatableGetRootTransform,
    AnimatableProperties,
    animatableSetOriginComponent,
    animatableTransform,
    animatableTransformApply,
    AnimatedProperty,
    Animation,
    animationCreate,
    animationElementCreate,
    animationFrameCreate,
    animationFrameItemCreate,
    animationIsRunning,
    animationResume,
    animationStart,
    animationStep,
    boundElementCreate,
} from './animation';
import { Weapon, weaponGetId, weaponGetObject } from './weapon';
import { glDrawRect, glSetGlobalOpacity, Program } from './gl';
import { matrixScale, matrixSetIdentity, matrixTranslateVector, Vec2, vectorCreate } from './glm';
import { Models, models, objectCalculateomponentTransformedOrigin, objectCreate } from './model';
import { weaponGetAttack, weaponGetDefense, weaponGetTipPosition } from './weapon';

const enum KnightProperties {
    Position,
    BoundingBoxLeft,
    BoundingBoxRight,
    AnimatableRight,
    AnimatableLeft,
    CurrentAnimation,
    AttackAnimation,
    DefendAnimation,
    AfterDefendAnimation,
    AfterDefend2Animation,
    HitAnimation,
    RestAnimation,
    WalkAnimation,
    BackwardWalkAnimation,
    DeadAnimation,
    FacingLeft,
    Attacking,
    Opacity,
    Weapon,
    Health,
    SupportFoot,
    SupportFootSwap,
    DidDefend,
    WillAttack,
}

export type Knight = {
    [KnightProperties.Position]: Vec2;
    [KnightProperties.AnimatableRight]: Animatable;
    [KnightProperties.AnimatableLeft]: Animatable;
    [KnightProperties.CurrentAnimation]: Animation;
    [KnightProperties.AttackAnimation]: Animation;
    [KnightProperties.DefendAnimation]: Animation;
    [KnightProperties.AfterDefendAnimation]: Animation;
    [KnightProperties.AfterDefend2Animation]: Animation;
    [KnightProperties.HitAnimation]: Animation;
    [KnightProperties.RestAnimation]: Animation;
    [KnightProperties.WalkAnimation]: Animation;
    [KnightProperties.BackwardWalkAnimation]: Animation;
    [KnightProperties.DeadAnimation]: Animation;
    [KnightProperties.FacingLeft]: boolean;
    [KnightProperties.Attacking]: boolean;
    [KnightProperties.Opacity]: number;
    [KnightProperties.Weapon]: Weapon;
    [KnightProperties.Health]: number;
    [KnightProperties.SupportFoot]: boolean;
    [KnightProperties.SupportFootSwap]: boolean;
    [KnightProperties.DidDefend]: boolean;
    [KnightProperties.WillAttack]: boolean;
};

const ATTACK_START = -3;
const ATTACK_END = -1.3;
export const knightCreate = (position: Vec2, weapon: Weapon, initialHealth: number = 1): Knight => {
    const REST_LEFT_LEG_1 = 0.1;
    const REST_LEFT_LEG_2 = 0.7;
    const REST_RIGHT_LEG_1 = -0.7;
    const REST_RIGHT_LEG_2 = 0.5;
    const REST_LEFT_ARM_1 = 0;
    const REST_LEFT_ARM_2 = -1.5;
    const REST_RIGHT_ARM_1 = 0.5;
    const REST_RIGHT_ARM_2 = -0.5;
    const attackPrepareSpeed = 0.003;
    const attackSpeed = attackPrepareSpeed * 9;
    const body = animationElementCreate();
    const face = animationElementCreate();
    const leftArm1 = animationElementCreate(REST_LEFT_ARM_1);
    const leftArm2 = animationElementCreate(REST_LEFT_ARM_2);
    const rightArm1 = animationElementCreate(REST_RIGHT_ARM_1);
    const rightArm2 = animationElementCreate(REST_RIGHT_ARM_2);
    const leftLeg1 = animationElementCreate();
    const leftLeg2 = animationElementCreate();
    const leftFoot = animationElementCreate();
    const rightLeg1 = animationElementCreate();
    const rightLeg2 = animationElementCreate();
    const rightFoot = animationElementCreate();
    const weaponAnimationElement = animationElementCreate();
    const bodyTranslate = animationElementCreate();

    const walkSpeed = 0.6;

    const restPosition = [
        animationFrameItemCreate(leftArm1, REST_LEFT_ARM_1, 0.01 * walkSpeed),
        animationFrameItemCreate(leftArm2, REST_LEFT_ARM_2, 0.01 * walkSpeed),
        animationFrameItemCreate(body, 0, 0.01 * walkSpeed),
        animationFrameItemCreate(face, 0, 0.01 * walkSpeed),
        animationFrameItemCreate(rightArm1, REST_RIGHT_ARM_1, 0.01 * walkSpeed),
        animationFrameItemCreate(rightArm2, REST_RIGHT_ARM_2, 0.01 * walkSpeed),
        animationFrameItemCreate(leftLeg1, REST_LEFT_LEG_1, 0.01 * walkSpeed),
        animationFrameItemCreate(leftLeg2, REST_LEFT_LEG_2, 0.01 * walkSpeed),
        animationFrameItemCreate(leftFoot, -0.8, 0.01 * walkSpeed),
        animationFrameItemCreate(rightLeg1, REST_RIGHT_LEG_1, 0.01 * walkSpeed),
        animationFrameItemCreate(rightLeg2, REST_RIGHT_LEG_2, 0.01 * walkSpeed),
        animationFrameItemCreate(rightFoot, 0.2, 0.01 * walkSpeed),
    ];

    const restAnimation = animationCreate([animationFrameCreate(restPosition)]);

    const knight: Knight = {
        [KnightProperties.Position]: position,
        [KnightProperties.AnimatableRight]: animatableCreate(
            objectCreate(models[Models.Man], {
                [modelData.weaponLeftComponentId]: weapon && weaponGetObject(weapon),
                [modelData.weaponRightComponentId]: null,
            }),
            [
                boundElementCreate(body, modelData.bodyComponentId),
                boundElementCreate(face, modelData.faceComponentId),
                boundElementCreate(leftArm1, modelData.leftArm1ComponentId),
                boundElementCreate(leftArm2, modelData.leftArm2ComponentId),
                boundElementCreate(rightArm1, modelData.rightArm1ComponentId),
                boundElementCreate(rightArm2, modelData.rightArm2ComponentId),
                boundElementCreate(leftLeg1, modelData.leftLeg1ComponentId),
                boundElementCreate(leftLeg2, modelData.leftLeg2ComponentId),
                boundElementCreate(leftFoot, modelData.leftFootComponentId),
                boundElementCreate(rightLeg1, modelData.rightLeg1ComponentId),
                boundElementCreate(rightLeg2, modelData.rightLeg2ComponentId),
                boundElementCreate(rightFoot, modelData.rightFootComponentId),
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
                boundElementCreate(body, modelData.bodyComponentId),
                boundElementCreate(face, modelData.faceComponentId),
                boundElementCreate(rightArm1, modelData.leftArm1ComponentId),
                boundElementCreate(rightArm2, modelData.leftArm2ComponentId),
                boundElementCreate(leftArm1, modelData.rightArm1ComponentId),
                boundElementCreate(leftArm2, modelData.rightArm2ComponentId),
                boundElementCreate(leftLeg1, modelData.leftLeg1ComponentId),
                boundElementCreate(leftLeg2, modelData.leftLeg2ComponentId),
                boundElementCreate(leftFoot, modelData.leftFootComponentId),
                boundElementCreate(rightLeg1, modelData.rightLeg1ComponentId),
                boundElementCreate(rightLeg2, modelData.rightLeg2ComponentId),
                boundElementCreate(rightFoot, modelData.rightFootComponentId),
                boundElementCreate(weaponAnimationElement, modelData.weaponLeftComponentId),
                boundElementCreate(bodyTranslate, modelData.bodyComponentId, AnimatedProperty.TranslationY),
            ]
        ),
        [KnightProperties.CurrentAnimation]: null,
        [KnightProperties.AttackAnimation]: null,
        [KnightProperties.DefendAnimation]: null,
        [KnightProperties.AfterDefendAnimation]: null,
        [KnightProperties.AfterDefend2Animation]: null,
        [KnightProperties.HitAnimation]: null,
        [KnightProperties.RestAnimation]: restAnimation,
        [KnightProperties.WalkAnimation]: null,
        [KnightProperties.BackwardWalkAnimation]: null,
        [KnightProperties.DeadAnimation]: null,
        [KnightProperties.FacingLeft]: false,
        [KnightProperties.Attacking]: false,
        [KnightProperties.Opacity]: 0,
        [KnightProperties.Weapon]: weapon,
        [KnightProperties.Health]: initialHealth,
        [KnightProperties.SupportFoot]: false,
        [KnightProperties.SupportFootSwap]: false,
        [KnightProperties.DidDefend]: false,
        [KnightProperties.WillAttack]: false,
    };

    const walkFrame = animationFrameCreate(
        [
            animationFrameItemCreate(leftLeg1, 0.5, 0.01 * walkSpeed),
            animationFrameItemCreate(leftLeg2, 1.0, 0.02 * walkSpeed),
            animationFrameItemCreate(leftFoot, -0.3, 0.01 * walkSpeed),
            animationFrameItemCreate(rightLeg1, -1.1, 0.01 * walkSpeed),
            animationFrameItemCreate(rightLeg2, 0.9, 0.01 * walkSpeed),
            animationFrameItemCreate(rightFoot, 0.2, 0.01 * walkSpeed),
            animationFrameItemCreate(rightArm2, -1.5, 0.04 * walkSpeed),
        ],
        () => (knight[KnightProperties.SupportFootSwap] = true)
    );

    //*
    knight[KnightProperties.WalkAnimation] = animationCreate([
        /*/
    knight[KnightProperties.WalkAnimation] = knight[KnightProperties.RestAnimation];
    knight[KnightProperties.RestAnimation] = animationCreate([
        //*/
        walkFrame,
        animationFrameCreate(restPosition),
        animationFrameCreate([], () => (knight[KnightProperties.SupportFootSwap] = true)),
    ]);

    //*
    knight[KnightProperties.BackwardWalkAnimation] = animationCreate([
        /*/
    knight[KnightProperties.BackwardWalkAnimation] = knight[KnightProperties.RestAnimation];
    knight[KnightProperties.RestAnimation] = animationCreate([
        //*/
        animationFrameCreate([], () => (knight[KnightProperties.SupportFootSwap] = true)),
        walkFrame,
        animationFrameCreate(restPosition),
    ]);

    //*
    knight[KnightProperties.AttackAnimation] = animationCreate([
        /*/
    knight[KnightProperties.AttackAnimation] = knight[KnightProperties.RestAnimation];
    knight[KnightProperties.RestAnimation] = animationCreate([
        //*/
        animationFrameCreate(
            [
                animationFrameItemCreate(body, 0.2, 1 * attackPrepareSpeed),
                animationFrameItemCreate(face, -0.2, attackPrepareSpeed),
                animationFrameItemCreate(leftArm1, ATTACK_START, 4 * attackPrepareSpeed),
                animationFrameItemCreate(leftArm2, -2, attackPrepareSpeed),
                animationFrameItemCreate(rightArm1, 0.6, attackPrepareSpeed),
                animationFrameItemCreate(rightArm2, -1.5, 2 * attackPrepareSpeed),
                animationFrameItemCreate(leftLeg1, 0.0, 0.5 * attackPrepareSpeed),
                animationFrameItemCreate(leftLeg2, 1.0, attackPrepareSpeed),
                animationFrameItemCreate(leftFoot, -0.4, attackPrepareSpeed),
                animationFrameItemCreate(rightLeg1, -1.5, 1 * attackPrepareSpeed),
                animationFrameItemCreate(rightLeg2, 0.7, attackPrepareSpeed),
            ],
            () => {
                knight[KnightProperties.Attacking] = true;
            }
        ),
        animationFrameCreate(
            [
                animationFrameItemCreate(body, 0.3, attackPrepareSpeed),
                animationFrameItemCreate(face, -0.3, attackPrepareSpeed),
                animationFrameItemCreate(leftArm1, ATTACK_END, attackSpeed),
                animationFrameItemCreate(leftArm2, 0, attackSpeed),
                animationFrameItemCreate(leftLeg1, 0.3, attackPrepareSpeed),
                animationFrameItemCreate(leftLeg2, 1.3, attackPrepareSpeed),
                animationFrameItemCreate(leftFoot, -0.4, 1.1 * attackPrepareSpeed),
                animationFrameItemCreate(rightLeg1, -1.9, 1.5 * attackPrepareSpeed),
                animationFrameItemCreate(rightLeg2, 1.8, 1.5 * attackPrepareSpeed),
            ],
            () => {
                knight[KnightProperties.Attacking] = false;
            }
        ),
        animationFrameCreate(restPosition),
    ]);

    const afterDefend = animationFrameCreate([
        animationFrameItemCreate(leftArm1, REST_LEFT_ARM_1, 0.01 * walkSpeed * 2),
        animationFrameItemCreate(leftArm2, REST_LEFT_ARM_2, 0.01 * walkSpeed * 2),
        animationFrameItemCreate(body, 0, 0.01 * walkSpeed * 2),
        animationFrameItemCreate(rightArm1, REST_RIGHT_ARM_1, 0.01 * walkSpeed * 2),
        animationFrameItemCreate(rightArm2, REST_RIGHT_ARM_2, 0.01 * walkSpeed * 2),
        animationFrameItemCreate(leftLeg1, REST_LEFT_LEG_1, 0.01 * walkSpeed * 2),
        animationFrameItemCreate(leftLeg2, REST_LEFT_LEG_2, 0.01 * walkSpeed * 2),
        animationFrameItemCreate(leftFoot, -0.8, 0.01 * walkSpeed * 2),
        animationFrameItemCreate(rightLeg1, REST_RIGHT_LEG_1, 0.01 * walkSpeed * 2),
        animationFrameItemCreate(rightLeg2, REST_RIGHT_LEG_2, 0.02 * walkSpeed * 2),
        animationFrameItemCreate(rightFoot, 0.2, 0.01 * walkSpeed * 2),
    ]);
    //*
    knight[KnightProperties.DefendAnimation] = animationCreate([
        /*/
    knight[KnightProperties.DefendAnimation] = knight[KnightProperties.RestAnimation];
    knight[KnightProperties.RestAnimation] = animationCreate([
        //*/
        animationFrameCreate(restPosition),
        animationFrameCreate([], () => (knight[KnightProperties.SupportFootSwap] = true)),
        animationFrameCreate([
            animationFrameItemCreate(leftArm1, -2, 0.01 * 2 * walkSpeed * 0.8),
            animationFrameItemCreate(leftArm2, -1, 0.2 * 2 * walkSpeed * 0.8),
            animationFrameItemCreate(rightArm1, -1, 0.01 * 2 * walkSpeed * 0.8),
            animationFrameItemCreate(rightArm2, -2, 0.01 * 2 * walkSpeed * 0.8),
            animationFrameItemCreate(leftLeg1, 0.5, 0.01 * walkSpeed * 0.8),
            animationFrameItemCreate(leftLeg2, 1.0, 0.02 * walkSpeed * 0.8),
            animationFrameItemCreate(rightLeg1, -1.1, 0.01 * walkSpeed * 0.8),
            animationFrameItemCreate(rightLeg2, 0.9, 0.01 * walkSpeed * 0.8),
        ]),
    ]);

    //*
    knight[KnightProperties.AfterDefendAnimation] = animationCreate([
        /*/
    knight[KnightProperties.AfterDefendAnimation] = knight[KnightProperties.RestAnimation];
    knight[KnightProperties.RestAnimation] = animationCreate([
        //*/
        afterDefend,
        animationFrameCreate([], () => (knight[KnightProperties.SupportFootSwap] = true)),
    ]);

    //*
    knight[KnightProperties.AfterDefend2Animation] = animationCreate([
        /*/
    knight[KnightProperties.AfterDefendAnimation] = knight[KnightProperties.RestAnimation];
    knight[KnightProperties.RestAnimation] = animationCreate([
        //*/
        animationFrameCreate([], () => (knight[KnightProperties.SupportFootSwap] = true)),
        afterDefend,
    ]);

    //*
    knight[KnightProperties.HitAnimation] = animationCreate([
        /*/
    knight[KnightProperties.HitAnimation] = knight[KnightProperties.RestAnimation];
    knight[KnightProperties.RestAnimation] = animationCreate([
        //*/
        animationFrameCreate([
            animationFrameItemCreate(leftArm1, 0, 0.1 * walkSpeed),
            animationFrameItemCreate(leftArm2, -0.5, 0.01 * walkSpeed),
            animationFrameItemCreate(body, -0.3, 0.003 * walkSpeed),
            animationFrameItemCreate(face, 0.8, 0.01 * walkSpeed),
            animationFrameItemCreate(rightArm1, -0.7, 0.02 * walkSpeed),
            animationFrameItemCreate(rightArm2, -0.7, 0.02 * walkSpeed),
            animationFrameItemCreate(leftLeg1, -0.2, 0.01 * walkSpeed),
            animationFrameItemCreate(leftLeg2, 0.6, 0.01 * walkSpeed),
            animationFrameItemCreate(leftFoot, -0.0, 0.01 * walkSpeed),
            animationFrameItemCreate(rightLeg1, -0.9, 0.01 * walkSpeed),
            animationFrameItemCreate(rightLeg2, 0.5, 0.01 * walkSpeed),
            animationFrameItemCreate(rightFoot, 0.5, 0.01 * walkSpeed),
        ]),
        animationFrameCreate([
            animationFrameItemCreate(face, 0.3, 0.01 * walkSpeed),
            animationFrameItemCreate(rightArm1, 0.7, 0.02 * walkSpeed),
            animationFrameItemCreate(rightArm2, -1.7, 0.02 * walkSpeed),
            animationFrameItemCreate(leftLeg1, -0.2, 0.01 * walkSpeed),
            animationFrameItemCreate(leftLeg2, 0.6, 0.01 * walkSpeed),
            animationFrameItemCreate(rightLeg1, -0.2, 0.01 * walkSpeed),
            animationFrameItemCreate(rightLeg2, 0.5, 0.01 * walkSpeed),
            animationFrameItemCreate(rightFoot, 0.3, 0.01 * walkSpeed),
        ]),
        animationFrameCreate([], () => (knight[KnightProperties.SupportFootSwap] = true)),
        animationFrameCreate(restPosition),
        animationFrameCreate([], () => (knight[KnightProperties.SupportFootSwap] = true)),
    ]);

    //*
    knight[KnightProperties.DeadAnimation] = animationCreate([
        /*/
    knight[KnightProperties.DeadAnimation] = knight[KnightProperties.RestAnimation];
    knight[KnightProperties.RestAnimation] = animationCreate([
        //*/
        animationFrameCreate([
            animationFrameItemCreate(leftArm1, 0.2, 0.1 * walkSpeed),
            animationFrameItemCreate(leftArm2, -0.0, 0.01 * walkSpeed),
            animationFrameItemCreate(body, -0.3, 0.003 * walkSpeed),
            animationFrameItemCreate(face, 0.8, 0.01 * walkSpeed),
            animationFrameItemCreate(rightArm1, 0.3, 0.02 * walkSpeed),
            animationFrameItemCreate(rightArm2, -0.3, 0.02 * walkSpeed),
            animationFrameItemCreate(leftLeg1, -0.2, 0.01 * walkSpeed),
            animationFrameItemCreate(leftLeg2, 1.6, 0.01 * walkSpeed),
            animationFrameItemCreate(leftFoot, -0.5, 0.01 * walkSpeed),
            animationFrameItemCreate(rightLeg1, -0.4, 0.01 * walkSpeed),
            animationFrameItemCreate(rightLeg2, 1.5, 0.01 * walkSpeed),
            animationFrameItemCreate(rightFoot, -0.5, 0.01 * walkSpeed),
        ]),
        animationFrameCreate([
            animationFrameItemCreate(leftArm1, 0.0, 0.1 * walkSpeed),
            animationFrameItemCreate(leftArm2, -2.5, 0.005 * walkSpeed),
            animationFrameItemCreate(body, 1.4, 0.003 * walkSpeed),
            animationFrameItemCreate(face, -0.5, 0.005 * walkSpeed),
            animationFrameItemCreate(rightArm1, -0.0, 0.002 * walkSpeed),
            animationFrameItemCreate(rightArm2, -0.4, 0.002 * walkSpeed),
            animationFrameItemCreate(leftLeg1, -0.2, 0.01 * walkSpeed),
            animationFrameItemCreate(leftLeg2, 0.3, 0.003 * walkSpeed),
            animationFrameItemCreate(leftFoot, 0.8, 0.01 * walkSpeed),
            animationFrameItemCreate(rightLeg1, 0.2, 0.002 * walkSpeed),
            animationFrameItemCreate(rightLeg2, 0.5, 0.003 * walkSpeed),
            animationFrameItemCreate(rightFoot, -0.5, 0.01 * walkSpeed),
            animationFrameItemCreate(weaponAnimationElement, 5, 0.01 * walkSpeed),
        ]),
        animationFrameCreate([
            animationFrameItemCreate(face, 0.0, 0.005 * walkSpeed),
            animationFrameItemCreate(rightArm2, -0.2, 0.005 * walkSpeed),
        ]),
    ]);

    return knight;
};

const knightChangeSupportFootV1 = vectorCreate();
const knightChangeSupportFootV2 = vectorCreate();
const knightChangeSupportFoot = (knight: Knight) => {
    knightGetComponentTransformedOrigin(knight, modelData.leftSupportComponentId, knightChangeSupportFootV1);
    knightGetComponentTransformedOrigin(knight, modelData.rightSupportComponentId, knightChangeSupportFootV2);
    const distance = knightChangeSupportFootV2[0] - knightChangeSupportFootV1[0];
    knight[KnightProperties.Position][0] += knight[KnightProperties.SupportFoot] ? -distance : distance;
    knight[KnightProperties.SupportFoot] = !knight[KnightProperties.SupportFoot];
};

const knightGetComponentTransformedOrigin = (knight: Knight, componentId: number, out: Vec2) => {
    const animatable = knight[KnightProperties.FacingLeft]
        ? knight[KnightProperties.AnimatableLeft]
        : knight[KnightProperties.AnimatableRight];

    objectCalculateomponentTransformedOrigin(animatable[AnimatableProperties.Object], componentId, out);
};

export const knightDraw = (knight: Knight, program: Program) => {
    glSetGlobalOpacity(program, knight[KnightProperties.Opacity]);

    const animatable = knight[KnightProperties.FacingLeft]
        ? knight[KnightProperties.AnimatableLeft]
        : knight[KnightProperties.AnimatableRight];
    const matrix = animatableGetRootTransform(animatable);
    matrixSetIdentity(matrix);
    if (knight[KnightProperties.FacingLeft]) {
        matrixScale(matrix, -1, 1);
    }
    animatableTransform(animatable);

    if (knight[KnightProperties.SupportFoot]) {
        animatableSetOriginComponent(animatable, modelData.rightSupportComponentId);
    } else {
        animatableSetOriginComponent(animatable, modelData.leftSupportComponentId);
    }

    matrixSetIdentity(matrix);
    matrixTranslateVector(matrix, knight[KnightProperties.Position]);
    animatableTransformApply(animatable, matrix);
    animatableDraw(animatable, program);

    glSetGlobalOpacity(program, 1);

    if (false && process.env.NODE_ENV !== 'production') {
        if (knight[KnightProperties.Weapon]) {
            glDrawRect(program, vectorCreate(knightGetWeaponTip(knight), 0), vectorCreate(1, 100));
        }

        glDrawRect(
            program,
            vectorCreate(knightGetBoundingLeft(knight), knight[KnightProperties.Position][1] + KNIGHT_HEIGHT),
            vectorCreate(knightGetBoundingRight(knight) - knightGetBoundingLeft(knight), 10)
        );

        glDrawRect(
            program,
            vectorCreate(knight[KnightProperties.Position][0] - 5, knight[KnightProperties.Position][1]),
            vectorCreate(10, KNIGHT_HEIGHT)
        );
    }
};

const knightAnimate = (knight: Knight, animation: Animation) => {
    knight[KnightProperties.CurrentAnimation] = animation;
    animationStart(animation);
};

export const knightAttack = (knight: Knight) => {
    if (knightIsAnimating(knight) || knightIsDead(knight)) {
        if (knightIsDefending(knight)) {
            knight[KnightProperties.WillAttack] = true;
        }
        return;
    }

    knightAnimate(knight, knight[KnightProperties.AttackAnimation]);
};

export const knightDefend = (knight: Knight) => {
    if (knightIsAnimating(knight) || knightIsDead(knight)) {
        return;
    }

    knight[KnightProperties.DidDefend] = false;
    knightAnimate(knight, knight[KnightProperties.DefendAnimation]);
};

const knightIsAnimating = (knight: Knight) => {
    const animation = knight[KnightProperties.CurrentAnimation];
    return animation && animationIsRunning(animation);
};

export const knightWalk = (knight: Knight, deltaTime: number, left: boolean) => {
    if (knightIsAnimating(knight) || knightIsDead(knight)) {
        return;
    }

    if (left === knight[KnightProperties.FacingLeft]) {
        knightAnimate(knight, knight[KnightProperties.WalkAnimation]);
    } else {
        knightAnimate(knight, knight[KnightProperties.BackwardWalkAnimation]);
    }
};

export const knightTurnRight = (knight: Knight) => {
    if (knight[KnightProperties.FacingLeft] && knightCanTurn(knight)) {
        knight[KnightProperties.FacingLeft] = false;
        knight[KnightProperties.Position][0] += (knightGetBoundingLeft(knight) - knightGetBoundingRight(knight)) / 2;
    }
};

export const knightCanTurn = (knight: Knight) =>
    !knight[KnightProperties.SupportFootSwap] && !knightIsAnimating(knight);

export const knightTurnLeft = (knight: Knight) => {
    if (!knight[KnightProperties.FacingLeft] && knightCanTurn(knight)) {
        knight[KnightProperties.FacingLeft] = true;
        knight[KnightProperties.Position][0] -= (knightGetBoundingLeft(knight) - knightGetBoundingRight(knight)) / 2;
    }
};

export const knightIsAttacking = (knight: Knight) => {
    return (
        knight[KnightProperties.Attacking] &&
        knightIsAnimating(knight) &&
        knight[KnightProperties.CurrentAnimation] === knight[KnightProperties.AttackAnimation]
    );
};

export const knightNeutralizeAttack = (knight: Knight) => {
    knight[KnightProperties.Attacking] = false;
};

export const knightIsDefending = (knight: Knight) => {
    return (
        knightIsAnimating(knight) &&
        knight[KnightProperties.CurrentAnimation] === knight[KnightProperties.DefendAnimation]
    );
};

export const knightDie = (knight: Knight) => {
    knight[KnightProperties.Health] = 0;
    knightAnimate(knight, knight[KnightProperties.DeadAnimation]);
};

export const knightIsDead = (knight: Knight) => knight[KnightProperties.Health] <= 0;

export const knightStep = (knight: Knight, deltaTime: number) => {
    // const opacityDirection = knightIsDead(knight) ? -0.5 : 1;
    const opacityDirection = 1;
    knight[KnightProperties.Opacity] = Math.max(
        0,
        Math.min(1, knight[KnightProperties.Opacity] + 0.002 * deltaTime * opacityDirection)
    );
    animatableBeginStep(knight[KnightProperties.AnimatableRight]);
    animatableBeginStep(knight[KnightProperties.AnimatableLeft]);

    if (knightIsDead(knight)) {
        animationStep(knight[KnightProperties.DeadAnimation], deltaTime);
        return;
    }

    if (knight[KnightProperties.SupportFootSwap]) {
        knightChangeSupportFoot(knight);
        knight[KnightProperties.SupportFootSwap] = false;
    }

    if (knight[KnightProperties.CurrentAnimation] === knight[KnightProperties.DefendAnimation]) {
        if (animationStep(knight[KnightProperties.CurrentAnimation], deltaTime)) {
            if (knight[KnightProperties.DidDefend] && !knight[KnightProperties.WillAttack]) {
                knightAnimate(knight, knight[KnightProperties.AfterDefend2Animation]);
            } else {
                knightAnimate(knight, knight[KnightProperties.AfterDefendAnimation]);
            }
        }
    } else if (knightIsAnimating(knight)) {
        animationStep(knight[KnightProperties.CurrentAnimation], deltaTime);
    }

    animationResume(knight[KnightProperties.RestAnimation]);
    animationStep(knight[KnightProperties.RestAnimation], deltaTime);
    if (!knightIsAnimating(knight)) {
        knight[KnightProperties.CurrentAnimation] = null;

        if (knight[KnightProperties.WillAttack]) {
            knight[KnightProperties.WillAttack] = false;
            knightAttack(knight);
        }
    }
};

const knightGetWeaponTipVector = vectorCreate();
export const knightGetWeaponTip = (knight: Knight) => {
    weaponGetTipPosition(knight[KnightProperties.Weapon], knightGetWeaponTipVector);
    const weaponTip = knightGetWeaponTipVector[0];
    const armComponentId = knight[KnightProperties.FacingLeft]
        ? modelData.rightArm1ComponentId
        : modelData.leftArm1ComponentId;

    const bounding = knight[KnightProperties.FacingLeft]
        ? knightGetBoundingLeft(knight)
        : knightGetBoundingRight(knight);

    knightGetComponentTransformedOrigin(knight, armComponentId, knightGetWeaponTipVector);
    const arm = knightGetWeaponTipVector[0];

    return bounding + weaponTip - arm;
};

export const knightIsHitting = (knight: Knight, boundingLeft: number, boundingRight: number) => {
    if (!knightIsAttacking(knight)) {
        return false;
    }

    const attackLeft = knightGetWeaponTip(knight);
    return attackLeft <= boundingRight && attackLeft >= boundingLeft;
};

// This was measured
const KNIGHT_HEIGHT = 100;

export const knightGetPosition = (knight: Knight) => knight[KnightProperties.Position];

export const knightIsFacingLeft = (knight: Knight) => knight[KnightProperties.FacingLeft];

const boundingVector = vectorCreate();
export const knightGetBoundingLeft = (knight: Knight) => {
    knightGetComponentTransformedOrigin(
        knight,
        knightIsFacingLeft(knight) ? modelData.boundingRightComponentId : modelData.boundingLeftComponentId,
        boundingVector
    );
    return boundingVector[0];
};
export const knightGetBoundingRight = (knight: Knight) => {
    knightGetComponentTransformedOrigin(
        knight,
        knightIsFacingLeft(knight) ? modelData.boundingLeftComponentId : modelData.boundingRightComponentId,
        boundingVector
    );
    return boundingVector[0];
};

export const knightGetCenter = (knight: Knight) => {
    const left = knightGetBoundingLeft(knight);
    const right = knightGetBoundingRight(knight);
    return (left + right) / 2;
};

export const knightGetAttackPower = (knight: Knight) =>
    2 + 2 * weaponGetAttack(weaponGetId(knight[KnightProperties.Weapon]));

export const knightGetDefense = (knight: Knight) =>
    15 + 2 * weaponGetDefense(weaponGetId(knight[KnightProperties.Weapon]));

export const knightHit = (knight: Knight, power: number) => {
    if (knight[KnightProperties.CurrentAnimation] === knight[KnightProperties.HitAnimation] || knightIsDead(knight)) {
        return;
    }

    if (knightIsDefending(knight)) {
        knight[KnightProperties.DidDefend] = true;
        return;
    }

    if (knight[KnightProperties.SupportFoot]) {
        knightChangeSupportFoot(knight);
    }
    knight[KnightProperties.SupportFootSwap] = false;
    knight[KnightProperties.Attacking] = false;
    knightAnimate(knight, knight[KnightProperties.HitAnimation]);

    if (process.env.NODE_ENV === 'production') {
        knightIncreaseHealth(knight, -power / knightGetDefense(knight));
    } else {
        knightIncreaseHealth(knight, -power / knightGetDefense(knight));
    }
};

export const knightGetHealth = (knight: Knight) => knight[KnightProperties.Health];
export const knightSetHealth = (knight: Knight, value: number) => (knight[KnightProperties.Health] = value);

export const knightIncreaseHealth = (knight: Knight, amount: number) => {
    if (knightIsDead(knight)) {
        return;
    }

    knight[KnightProperties.Health] += amount;
    if (knightIsDead(knight)) {
        knightDie(knight);
    }
};

export const knightGetWeaponId = (knight: Knight) => weaponGetId(knight[KnightProperties.Weapon]);
