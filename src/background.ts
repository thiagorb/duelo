import { animatableCreate, animatableDraw, animatableGetRootTransform, animatableTransform } from './animation';
import { Program, glSetGlobalOpacity } from './gl';
import { matrixSetIdentity, matrixTranslateVector, Vec2, vectorCreate } from './glm';
import { Models, models, objectCreate } from './model';

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

export const backgroundDraw = (program: Program) => {
    // glSetGlobalOpacity(program, 0.3);
    const matrix = animatableGetRootTransform(background[BackgroundProperties.Animatable]);
    matrixSetIdentity(matrix);
    matrixTranslateVector(matrix, background[BackgroundProperties.Position]);
    animatableTransform(background[BackgroundProperties.Animatable]);
    animatableDraw(background[BackgroundProperties.Animatable], program);
};

export const backgroundInit = () => {
    background = backgroundCreate(vectorCreate(0, -30));
};

export const backgroundGetPosition = (background: Background) => background[BackgroundProperties.Position];
