import {
    animatableBeginStep,
    animatableCreate,
    animatableGetRootTransform,
    animatableSetOriginComponent,
    animatableTransform,
} from './animation';
import { glClear, glDrawRect, glProgramCreate, glSetViewMatrix, glSetViewport } from './gl';
import { matrixCreate, matrixScale, matrixSetIdentity, matrixTranslateVector, vectorCreate } from './glm';
import { objectDraw } from './model';
import { storageGetItemIds, storageSetItemIds } from './storage';
import { weaponCreate, weaponGetObject } from './weapon';
import * as swordModelData from '../art/sword.svg';

declare const inv: HTMLElement;
declare const invItems: HTMLElement;
declare const invItem: HTMLElement;
declare const btninv: HTMLElement;
declare const invClose: HTMLElement;

export const inventoryIsFull = () => {
    return storageGetItemIds().length >= 10;
};

export const inventoryAddItem = (itemId: number) => {
    storageSetItemIds([...storageGetItemIds(), itemId]);
};

export const inventoryStart = () => {
    invItems.innerHTML = '';
    for (const itemId of storageGetItemIds()) {
        const itemDiv = document.createElement('div');
        const itemImg = document.createElement('img');
        itemImg.src = renderItem(itemId);
        itemDiv.classList.add('inv-item');
        itemDiv.appendChild(itemImg);
        invItems.appendChild(itemDiv);
    }

    inv.style.display = null;
    setTimeout(() => inv.classList.remove('hidden'));
};

const renderItem = (() => {
    const WIDTH = 128;
    const HEIGHT = 128;
    const SCALE = 0.05;
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const program = glProgramCreate(canvas, WIDTH, HEIGHT);
    glSetViewport(program, 0, 0, WIDTH, HEIGHT);
    const viewMatrix = matrixCreate();
    matrixSetIdentity(viewMatrix);
    matrixScale(viewMatrix, SCALE, SCALE);
    glSetViewMatrix(program, viewMatrix);

    return (itemId: number) => {
        glClear(program);
        const item = weaponCreate(itemId);
        const object = weaponGetObject(item);
        const animatable = animatableCreate(object, []);
        const matrix = animatableGetRootTransform(animatable);

        matrixSetIdentity(matrix);
        matrixTranslateVector(matrix, vectorCreate(0, 0));

        animatableBeginStep(animatable);
        animatableTransform(animatable);
        animatableSetOriginComponent(animatable, swordModelData.centerComponentId);
        objectDraw(object, program);

        return canvas.toDataURL('image/png');
    };
})();

btninv.onclick = () => {
    inventoryStart();
};

invClose.onclick = () => {
    inv.style.display = 'none';
    inv.classList.add('hidden');
};
