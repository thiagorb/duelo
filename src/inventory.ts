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
import { storageGetEquippedIds, storageGetItemIds, storageSetEquippedIds, storageSetItemIds } from './storage';
import { weaponCreate, weaponGetObject } from './weapon';
import * as swordModelData from '../art/sword.svg';
import { EquippedIds } from './equip';

declare const inv: HTMLElement;
declare const invItems: HTMLElement;
declare const eqItems: HTMLElement;
declare const btninv: HTMLElement;
declare const invClose: HTMLElement;

export const inventoryIsFull = () => {
    return storageGetItemIds().length >= 10;
};

export const inventoryAddItem = (itemId: number) => {
    storageSetItemIds([...storageGetItemIds(), itemId]);
};

const createItemAction = (action: string) => {
    const itemAction = document.createElement('div');
    itemAction.classList.add('inv-action');
    itemAction.innerText = action;
    return itemAction;
};

const selectItem = (itemDiv: HTMLDivElement) => {
    invItems.querySelector('.selected')?.classList.remove('selected');
    itemDiv.classList.add('selected');
};

const createItemDiv = (itemId: number, actionsBuilder: (itemActions: HTMLDivElement) => void) => {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('inv-item');

    if (itemId !== undefined) {
        const itemImg = renderItem(itemId);
        itemDiv.style.backgroundImage = `url(${itemImg})`;
        itemDiv.dataset.name = 'STEEL SWORD (ATT +3)';

        const itemActions = document.createElement('div');
        itemActions.classList.add('inv-actions');
        itemDiv.appendChild(itemActions);

        actionsBuilder(itemActions);

        itemDiv.onclick = () => selectItem(itemDiv);
    }
    return itemDiv;
};

export const inventoryStart = () => {
    invItems.innerHTML = '';
    eqItems.innerHTML = '';

    const itemIds = storageGetItemIds();
    for (let i = 0; i < 10; i++) {
        const itemId = itemIds[i];
        const itemDiv = createItemDiv(itemId, (itemActions: HTMLDivElement) => {
            const equipAction = createItemAction('EQUIP');
            equipAction.onclick = () => {
                const items = storageGetItemIds();
                items.splice(i, 1);
                storageSetItemIds(items);
                const equipped = storageGetEquippedIds();
                equipped[0] = itemId;
                storageSetEquippedIds(equipped);
                onEquip?.(equipped);
                inventoryStart();
            };
            itemActions.appendChild(equipAction);
        });

        invItems.appendChild(itemDiv);
    }

    const equippedIds = storageGetEquippedIds();
    for (let i = 0; i < 10; i++) {
        const itemId = equippedIds[i];
        const itemDiv = createItemDiv(itemId, (itemActions: HTMLDivElement) => {
            const unequipAction = createItemAction('UNEQUIP');
            unequipAction.onclick = () => {
                if (inventoryIsFull()) {
                    return;
                }

                const items = storageGetItemIds();
                items.push(itemId);
                storageSetItemIds(items);
                const equipped = storageGetEquippedIds();
                equipped[0] = undefined;
                storageSetEquippedIds(equipped);
                onEquip?.(equipped);
                inventoryStart();
            };
            itemActions.appendChild(unequipAction);
        });

        eqItems.appendChild(itemDiv);
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

let onEquip = null;
export const inventorySetOnEquip = (callback: (equipped: EquippedIds) => void) => {
    onEquip = callback;
};
