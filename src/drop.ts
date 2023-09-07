import {
    Animatable,
    animatableBeginStep,
    animatableCreate,
    animatableGetRootTransform,
    animatableTransform,
} from './animation';
import { Program } from './gl';
import { Vec2, matrixSetIdentity, matrixTranslateVector, vectorCreate } from './glm';
import { Object, objectDraw } from './model';
import { Weapon, weaponCreate, weaponGetObject } from './weapon';

const enum DropProperties {
    ItemId,
    Item,
    Position,
    Animatable,
    DirectionLeft,
    TimePassed,
}

export type Drop = {
    [DropProperties.ItemId]: number;
    [DropProperties.Item]: Object;
    [DropProperties.Position]: Vec2;
    [DropProperties.Animatable]: Animatable;
    [DropProperties.DirectionLeft]: boolean;
    [DropProperties.TimePassed]: number;
};

export const dropCreate = (itemId: number, x: number, directionLeft: boolean): Drop => {
    const item = weaponCreate(itemId);
    const object = weaponGetObject(item);
    return {
        [DropProperties.ItemId]: itemId,
        [DropProperties.Item]: object,
        [DropProperties.Position]: vectorCreate(x, 0),
        [DropProperties.Animatable]: animatableCreate(object, []),
        [DropProperties.DirectionLeft]: directionLeft,
        [DropProperties.TimePassed]: 0,
    };
};

export const dropDraw = (drop: Drop, program: Program) => {
    const matrix = animatableGetRootTransform(drop[DropProperties.Animatable]);
    matrixSetIdentity(matrix);
    matrixTranslateVector(matrix, drop[DropProperties.Position]);
    animatableTransform(drop[DropProperties.Animatable]);

    objectDraw(drop[DropProperties.Item], program);
};

const animationDuration = 500;
export const dropStep = (drop: Drop, timePassed: number) => {
    animatableBeginStep(drop[DropProperties.Animatable]);

    if (drop[DropProperties.TimePassed] > animationDuration) {
        return;
    }
    const curveHeight = 50;
    drop[DropProperties.TimePassed] += timePassed;
    drop[DropProperties.Position][1] =
        -50 + curveHeight - Math.pow((drop[DropProperties.TimePassed] * 2) / animationDuration - 1, 2) * curveHeight;
    drop[DropProperties.Position][0] +=
        ((drop[DropProperties.DirectionLeft] ? -1 : 1) * 100 * timePassed) / animationDuration;
};

export const dropIsPickable = (drop: Drop, x: number) =>
    drop[DropProperties.TimePassed] > animationDuration && Math.abs(x - drop[DropProperties.Position][0]) < 10;

export const dropGetItemId = (drop: Drop) => drop[DropProperties.ItemId];
