import {
    AnimatedProperty,
    animatableCreate,
    animatableDraw,
    animatableGetRootTransform,
    animatableTransform,
    animationElementCreate,
    animationElementGetValue,
    animationElementSetValue,
    boundElementCreate,
} from './animation';
import { Program } from './gl';
import { matrixScale, matrixSetIdentity, matrixTranslate, matrixTranslateVector, Vec2, vectorCreate } from './glm';
import { ModelType, objectCreate, objectGetComponentTransform } from './model';
import * as modelData from '../art/background.svg';
import { VIRTUAL_HEIGHT } from './game';

const enum BackgroundProperties {
    Position,
    Animatable,
    CastleElement,
    Layer1Element,
    Layer2Element,
    LogoXElement,
    LogoScaleElement,
    LetterYElements,
}

export type Background = ReturnType<typeof backgroundCreate>;

let background: Background = null;

export const backgroundCreate = (position: Vec2) => {
    const castleX = animationElementCreate(0);
    const layer1X = animationElementCreate(0);
    const layer2X = animationElementCreate(0);
    const logoX = animationElementCreate(0);
    const logoScale = animationElementCreate(1);
    const letterDY = animationElementCreate(VIRTUAL_HEIGHT * 0.7);
    const letterUY = animationElementCreate(VIRTUAL_HEIGHT * 0.7);
    const letterEY = animationElementCreate(VIRTUAL_HEIGHT * 0.7);
    const letterLY = animationElementCreate(VIRTUAL_HEIGHT * 0.7);
    const letterOY = animationElementCreate(VIRTUAL_HEIGHT * 0.7);

    const background = {
        [BackgroundProperties.Position]: position,
        [BackgroundProperties.Animatable]: animatableCreate(objectCreate(ModelType.Background), [
            boundElementCreate(castleX, modelData.castleComponentId, AnimatedProperty.TranslationX),
            boundElementCreate(layer1X, modelData.mountainLayer1ComponentId, AnimatedProperty.TranslationX),
            boundElementCreate(layer2X, modelData.mountainLayer2ComponentId, AnimatedProperty.TranslationX),
            boundElementCreate(logoX, modelData.logoComponentId, AnimatedProperty.TranslationX),
            boundElementCreate(letterDY, modelData.dComponentId, AnimatedProperty.TranslationY),
            boundElementCreate(letterUY, modelData.uComponentId, AnimatedProperty.TranslationY),
            boundElementCreate(letterEY, modelData.eComponentId, AnimatedProperty.TranslationY),
            boundElementCreate(letterLY, modelData.lComponentId, AnimatedProperty.TranslationY),
            boundElementCreate(letterOY, modelData.oComponentId, AnimatedProperty.TranslationY),
            boundElementCreate(logoScale, modelData.logoComponentId, AnimatedProperty.ScaleX),
            boundElementCreate(logoScale, modelData.logoComponentId, AnimatedProperty.ScaleY),
        ]),
        [BackgroundProperties.CastleElement]: castleX,
        [BackgroundProperties.Layer1Element]: layer1X,
        [BackgroundProperties.Layer2Element]: layer2X,
        [BackgroundProperties.LogoXElement]: logoX,
        [BackgroundProperties.LogoScaleElement]: logoScale,
        [BackgroundProperties.LetterYElements]: [letterDY, letterUY, letterEY, letterLY, letterOY],
    };

    return background;
};

export const backgroundDraw = (
    program: Program,
    currentViewPosition: number,
    currentViewScale: number,
    menu: boolean
) => {
    const matrix = animatableGetRootTransform(background[BackgroundProperties.Animatable]);
    matrixSetIdentity(matrix);
    matrixTranslateVector(matrix, background[BackgroundProperties.Position]);

    animationElementSetValue(background[BackgroundProperties.CastleElement], -currentViewPosition * 0.5);
    animationElementSetValue(background[BackgroundProperties.Layer1Element], -currentViewPosition * 0.6);
    animationElementSetValue(background[BackgroundProperties.Layer2Element], -currentViewPosition * 0.8);
    animationElementSetValue(background[BackgroundProperties.LogoXElement], -currentViewPosition);
    animationElementSetValue(background[BackgroundProperties.LogoScaleElement], 1 / currentViewScale);

    const logoYTarget = menu ? VIRTUAL_HEIGHT * 0.2 : VIRTUAL_HEIGHT * 0.7;

    const logoElements = background[BackgroundProperties.LetterYElements];
    let i = logoElements.length;
    while (i--) {
        const letterY = logoElements[i];
        let letterYValue = animationElementGetValue(letterY);
        letterYValue += (logoYTarget - letterYValue) * (0.03 + i * 0.03);
        animationElementSetValue(letterY, letterYValue);
    }

    animatableTransform(background[BackgroundProperties.Animatable]);
    animatableDraw(background[BackgroundProperties.Animatable], program);
};

export const backgroundInit = () => {
    background = backgroundCreate(vectorCreate(0, -VIRTUAL_HEIGHT * 0.1));
};

export const backgroundGetPosition = (background: Background) => background[BackgroundProperties.Position];
