import {
    animatableDraw,
    animatableGetRootTransform,
    animatableSetOriginComponent,
    animatableTransform,
    animatableTransformApply,
} from './animation';
import { glClear, glProgramCreate, glSetViewMatrix, glSetViewport } from './gl';
import { matrixCreate, matrixScale, matrixSetIdentity, matrixTranslateVector, vectorCreate } from './glm';
import {
    storageGetEquippedIds,
    storageGetGold,
    storageGetItemIds,
    storageSetEquippedIds,
    storageSetGold,
    storageSetItemIds,
} from './storage';
import {
    EquippedIds,
    EquippedIdsProperties,
    equipCreateAnimatable,
    equipGetAttack,
    equipGetDefense,
    equipGetName,
    equipGetOriginComponentId,
    equipGetType,
} from './equip';
import {
    NearInstance,
    nearBuy,
    nearCancelSale,
    nearCollectSale,
    nearGetAccountId,
    nearGetCompletedSales,
    nearGetPendingSales,
    nearGetRandomSales,
    nearGetSignedIn,
    nearRequestSignIn,
    nearSell,
    nearSignOut,
} from './near';

declare const inv: HTMLElement;
declare const invItems: HTMLElement;
declare const eqItems: HTMLElement;
declare const sellItems: HTMLElement;
declare const mktItems: HTMLElement;
declare const btninv: HTMLElement;
declare const invClose: HTMLElement;
declare const signMsg: HTMLElement;
declare const nearArea: HTMLElement;
declare const logged: HTMLElement;
declare const signOut: HTMLElement;
declare const mainnet: HTMLElement;
declare const testnet: HTMLElement;
declare const gold: HTMLElement;
declare const cnf: HTMLElement;
declare const yes: HTMLElement;
declare const no: HTMLElement;
declare const spinner: HTMLElement;

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
    const current = inv.querySelector('.selected');
    current?.classList.remove('selected');
    if (current !== itemDiv) {
        itemDiv.classList.add('selected');
    }
};

const createItemDiv = (itemId: number, actionsBuilder: (itemActions: HTMLDivElement) => void) => {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('inv-item');

    if (itemId !== undefined) {
        const itemImg = renderItem(itemId);
        itemDiv.style.backgroundImage = `url(${itemImg})`;

        const name = equipGetName(itemId);
        const stats =
            equipGetType(itemId) === EquippedIdsProperties.SwordId
                ? `+${equipGetAttack(itemId)} ATK`
                : `+${equipGetDefense(itemId)} DEF`;

        itemDiv.dataset.name = `${name} (${stats})`;

        const itemActions = document.createElement('div');
        itemActions.classList.add('inv-actions');
        itemDiv.appendChild(itemActions);

        actionsBuilder(itemActions);

        itemDiv.onclick = () => selectItem(itemDiv);
    }
    return itemDiv;
};

export const inventoryStart = async () => {
    const near = await nearGetSignedIn();

    toggleSignIn(near);

    loadInventory(near);
    loadEquippedItems(near);

    if (near) {
        loadUserSales(near);
        loadMarket(near);
    }

    inv.style.display = null;
    setTimeout(() => inv.classList.remove('hidden'));
};

const loadInventory = (near: NearInstance) => {
    invItems.innerHTML = '';
    const itemIds = storageGetItemIds();
    for (let i = 0; i < 10; i++) {
        const itemId = itemIds[i];
        const itemDiv = createItemDiv(itemId, (itemActions: HTMLDivElement) => {
            const equipAction = createItemAction('EQUIP');
            equipAction.onclick = () => {
                const equipped = storageGetEquippedIds();
                const equipSlot = equipGetType(itemId);
                const oldEquipped = equipped[equipSlot];
                const items = storageGetItemIds();
                items.splice(i, 1, ...(oldEquipped ? [oldEquipped] : []));
                storageSetItemIds(items);
                equipped[equipSlot] = itemId;
                storageSetEquippedIds(equipped);
                onEquip?.(equipped);
                loadInventory(near);
                loadEquippedItems(near);
            };
            itemActions.appendChild(equipAction);

            if (near) {
                const sellAction = createItemAction('SELL');
                sellAction.onclick = async () => {
                    const value = prompt('How much do you want to sell this item for?');
                    if (!value || !/^\d+$/.test(value)) {
                        return;
                    }
                    const price = parseInt(value, 10);
                    spinner.style.display = null;
                    const sale = await nearSell(near, itemId, price).catch(() => null);
                    if (sale) {
                        const items = storageGetItemIds();
                        items.splice(i, 1);
                        storageSetItemIds(items);
                        await loadUserSales(near);
                        loadInventory(near);
                    }
                    spinner.style.display = 'none';
                };
                itemActions.appendChild(sellAction);
            }

            const dropAction = createItemAction('DROP');
            dropAction.onclick = () => {
                cnf.style.display = null;
                const close = () => (cnf.style.display = 'none');
                yes.onclick = () => {
                    const items = storageGetItemIds();
                    items.splice(i, 1);
                    storageSetItemIds(items);
                    loadInventory(near);
                    close();
                };
                no.onclick = close;
            };
            itemActions.appendChild(dropAction);
        });

        invItems.appendChild(itemDiv);

        gold.innerText = `GOLD: ${storageGetGold()}`;
    }
};

const loadEquippedItems = (near: NearInstance) => {
    eqItems.innerHTML = '';
    const equippedIds = storageGetEquippedIds();
    for (let i = 0; i < 5; i++) {
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
                equipped[equipGetType(itemId)] = undefined;
                storageSetEquippedIds(equipped);
                onEquip?.(equipped);
                loadInventory(near);
                loadEquippedItems(near);
            };
            itemActions.appendChild(unequipAction);
        });

        eqItems.appendChild(itemDiv);
    }
};

const loadUserSales = async (near: NearInstance) => {
    sellItems.innerHTML = '';
    const [pendingSales, completedSales] = (
        await Promise.all([nearGetPendingSales(near), nearGetCompletedSales(near)])
    ).map(o => Object.entries(o));
    for (let i = 0; i < 5; i++) {
        const [saleId, sale] = pendingSales[i] || [];
        const itemDiv = createItemDiv(sale?.itemId, (itemActions: HTMLDivElement) => {
            const cancelAction = createItemAction('CANCEL');
            cancelAction.onclick = async () => {
                spinner.style.display = null;
                const sale = await nearCancelSale(near, saleId).catch(() => null);
                if (sale) {
                    const items = storageGetItemIds();
                    items.push(sale.itemId);
                    storageSetItemIds(items);
                    await loadUserSales(near);
                    loadInventory(near);
                }
                spinner.style.display = 'none';
            };
            itemActions.appendChild(cancelAction);
        });

        sellItems.appendChild(itemDiv);
    }

    for (let i = 0; i < 5; i++) {
        const [saleId, sale] = completedSales[i] || [];
        const itemDiv = createItemDiv(sale?.itemId, (itemActions: HTMLDivElement) => {
            const collectAction = createItemAction('COLLECT');
            collectAction.onclick = async () => {
                spinner.style.display = null;
                const sale = await nearCollectSale(near, saleId).catch(() => null);
                if (sale) {
                    storageSetGold(storageGetGold() + sale.price);
                    await loadUserSales(near);
                    loadInventory(near);
                }
                spinner.style.display = 'none';
            };
            itemActions.appendChild(collectAction);
        });

        sellItems.appendChild(itemDiv);
    }
};

const loadMarket = async (near: NearInstance) => {
    mktItems.innerHTML = '';
    const randomSales = Object.entries(await nearGetRandomSales(near));
    for (let i = 0; i < 10; i++) {
        const [saleId, sale] = randomSales[i] || [];
        const itemDiv = createItemDiv(sale?.itemId, (itemActions: HTMLDivElement) => {
            const buyAction = createItemAction('BUY');
            buyAction.onclick = async () => {
                if (inventoryIsFull() || storageGetGold() < sale.price) {
                    return;
                }

                spinner.style.display = null;
                const bought = await nearBuy(near, saleId).catch(() => null);
                if (bought) {
                    const items = storageGetItemIds();
                    items.push(bought.itemId);
                    storageSetItemIds(items);
                    loadInventory(near);
                    itemDiv.replaceWith(createItemDiv(undefined, () => {}));
                }

                spinner.style.display = 'none';
            };
            itemActions.appendChild(buyAction);
        });

        mktItems.appendChild(itemDiv);
    }
};

const toggleElement = (element: HTMLElement, show: boolean) => {
    element.style.display = show ? null : 'none';
};

const toggleSignIn = async (near: NearInstance) => {
    toggleElement(signMsg, near === null);
    toggleElement(mainnet, near === null);
    toggleElement(testnet, near === null);
    toggleElement(nearArea, near !== null);
    if (near) {
        logged.innerText = `LOGGED IN TO NEAR AS ${nearGetAccountId(near)}`;
    }
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

        const animatable = equipCreateAnimatable(itemId);
        const originComponentId = equipGetOriginComponentId(itemId);
        const matrix = animatableGetRootTransform(animatable);
        matrixSetIdentity(matrix);
        animatableTransform(animatable);
        animatableSetOriginComponent(animatable, originComponentId);
        matrixSetIdentity(matrix);
        matrixTranslateVector(matrix, vectorCreate(0, 0));
        animatableTransformApply(animatable, matrix);
        animatableDraw(animatable, program);

        return canvas.toDataURL('image/png');
    };
})();

export const inventoryInit = () => {
    mainnet.onclick = testnet.onclick = (event: MouseEvent) => {
        nearRequestSignIn((event.target as HTMLDivElement).id);
    };

    signOut.onclick = async () => {
        await nearSignOut();
        toggleSignIn(null);
    };

    btninv.onclick = () => {
        inventoryStart();
    };

    invClose.onclick = () => {
        inv.style.display = 'none';
        inv.classList.add('hidden');
    };
};

let onEquip = null;
export const inventorySetOnEquip = (callback: (equipped: EquippedIds) => void) => {
    onEquip = callback;
};
