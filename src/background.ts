import { animatableCreate, animatableDraw, animatableGetRootTransform, animatableTransform } from './animation';
import { Program } from './gl';
import { matrixScale, matrixSetIdentity, matrixTranslate, matrixTranslateVector, Vec2, vectorCreate } from './glm';
import { Models, models, objectCreate, objectGetComponentTransform } from './model';
import * as modelData from '../art/background.svg';
import { VIRTUAL_HEIGHT } from './game';

const enum BackgroundProperties {
    Position,
    Animatable,
}

export type Background = ReturnType<typeof backgroundCreate>;

let background: Background = null;

export const backgroundCreate = (position: Vec2) => {
    const background = {
        [BackgroundProperties.Position]: position,
        [BackgroundProperties.Animatable]: animatableCreate(objectCreate(models[Models.Background]), []),
    };

    return background;
};

const logoComponents = [
    modelData.dComponentId,
    modelData.uComponentId,
    modelData.eComponentId,
    modelData.lComponentId,
    modelData.oComponentId,
];

let logoY = VIRTUAL_HEIGHT * 0.7;
export const backgroundDraw = (program: Program, currentViewPosition: number, currentViewScale, menu: boolean) => {
    const matrix = animatableGetRootTransform(background[BackgroundProperties.Animatable]);
    matrixSetIdentity(matrix);
    matrixTranslateVector(matrix, background[BackgroundProperties.Position]);
    animatableTransform(background[BackgroundProperties.Animatable]);
    const castle = objectGetComponentTransform(
        background[BackgroundProperties.Animatable][0],
        modelData.castleComponentId
    );
    const mountainLayer1 = objectGetComponentTransform(
        background[BackgroundProperties.Animatable][0],
        modelData.mountainLayer1ComponentId
    );
    const mountainLayer2 = objectGetComponentTransform(
        background[BackgroundProperties.Animatable][0],
        modelData.mountainLayer2ComponentId
    );
    matrixTranslate(castle, -currentViewPosition * 0.5, 0);
    matrixTranslate(mountainLayer1, -currentViewPosition * 0.6, 0);
    matrixTranslate(mountainLayer2, -currentViewPosition * 0.8, 0);

    const logoYTarget = menu ? VIRTUAL_HEIGHT * 0.2 : VIRTUAL_HEIGHT * 0.7;
    logoY += (logoYTarget - logoY) * 0.03;
    for (const componentId of logoComponents) {
        const component = objectGetComponentTransform(background[BackgroundProperties.Animatable][0], componentId);
        matrixTranslate(component, -currentViewPosition, 0);
        matrixScale(component, 1 / currentViewScale, 1 / currentViewScale);
        matrixTranslate(component, 0, logoY);
    }

    animatableDraw(background[BackgroundProperties.Animatable], program);
};

export const backgroundInit = () => {
    background = backgroundCreate(vectorCreate(0, -VIRTUAL_HEIGHT * 0.1));
};

export const backgroundGetPosition = (background: Background) => background[BackgroundProperties.Position];
