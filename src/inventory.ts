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
    storageAddGold,
    storageGetEquippedIds,
    storageGetGold,
    storageGetItemIds,
    storageSetEquippedIds,
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
    nearGetUserSales,
    nearGetRandomSales,
    nearGetSignedIn,
    nearRequestSignIn,
    nearSell,
    nearSignOut,
} from './near';
import { uiHideElement, uiShowElement } from './ui';

declare const inv: HTMLElement;
declare const invItems: HTMLElement;
declare const eqItems: HTMLElement;
declare const sellItems: HTMLElement;
declare const mktItems: HTMLElement;
declare const btninv: HTMLElement;
declare const menuinv: HTMLElement;
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
declare const touch: HTMLElement;
declare const css: HTMLElement;

const enum InventoryProperties {
    InventoryItems,
    EquippedItems,
    SellItems,
    MarketItems,
    Near,
}

type UserSales = Awaited<ReturnType<typeof nearGetUserSales>>;
type MarketItems = Awaited<ReturnType<typeof nearGetRandomSales>>;

type Inventory = {
    [InventoryProperties.InventoryItems]: Array<number>;
    [InventoryProperties.EquippedItems]: EquippedIds;
    [InventoryProperties.SellItems]: UserSales;
    [InventoryProperties.MarketItems]: MarketItems;
    [InventoryProperties.Near]: NearInstance;
};

export const inventoryIsFull = () => {
    return storageGetItemIds().length >= 10;
};

export const inventoryAddItem = (itemId: number) => {
    const items = inventory[InventoryProperties.InventoryItems];
    if (items.length >= 10) {
        return;
    }

    items.push(itemId);
    inventorySetItems(items);
};

export const inventoryAddGold = (amount: number) => {
    storageAddGold(amount);
    renderGold();
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

const createItemDiv = (
    itemId: number,
    actionsBuilder: (itemActions: HTMLDivElement, itemDiv: HTMLDivElement) => void
) => {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('inv-item');

    if (itemId !== undefined) {
        itemDiv.classList.add(getRenderedItemClass(itemId));

        const name = equipGetName(itemId);
        const stats =
            equipGetType(itemId) === EquippedIdsProperties.SwordId
                ? `+${equipGetAttack(itemId)} ATK`
                : `+${equipGetDefense(itemId)} DEF`;

        itemDiv.dataset.name = `${name} (${stats})`;

        const itemActions = document.createElement('div');
        itemActions.classList.add('inv-actions');
        itemDiv.appendChild(itemActions);

        actionsBuilder(itemActions, itemDiv);

        itemDiv.onclick = () => selectItem(itemDiv);
    }
    return itemDiv;
};

const inventory = {
    [InventoryProperties.InventoryItems]: storageGetItemIds(),
    [InventoryProperties.EquippedItems]: storageGetEquippedIds(),
    [InventoryProperties.SellItems]: [],
    [InventoryProperties.MarketItems]: [],
    [InventoryProperties.Near]: null,
};

export const inventoryStart = async () => {
    const near = await nearGetSignedIn().catch(() => null);
    inventory[InventoryProperties.Near] = near;
    inventory[InventoryProperties.SellItems] = near ? await nearGetUserSales(near) : [];
    inventory[InventoryProperties.MarketItems] = near ? await nearGetRandomSales(near) : [];

    toggleSignIn(near);

    renderInventory();
    renderGold();
    renderEquippedItems();

    if (inventory) {
        renderUserSales();
        renderMarket();
    }

    uiShowElement(inv);
};

const renderInventory = () => {
    invItems.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const itemId = inventory[InventoryProperties.InventoryItems][i];
        const itemDiv = createItemDiv(itemId, (itemActions: HTMLDivElement) => {
            const equipAction = createItemAction('EQUIP');
            equipAction.onclick = () => {
                const equipped = storageGetEquippedIds();
                const equipSlot = equipGetType(itemId);
                const oldEquipped = equipped[equipSlot];
                const items = storageGetItemIds();
                items.splice(i, 1, ...(oldEquipped >= 0 ? [oldEquipped] : []));
                equipped[equipSlot] = itemId;
                inventorySetItems(items);
                inventorySetEquippedItems(equipped);
            };
            itemActions.appendChild(equipAction);

            const near = inventory[InventoryProperties.Near];
            if (near) {
                const sellAction = createItemAction('SELL');
                if (inventory[InventoryProperties.SellItems].length >= 10) {
                    return;
                }

                sellAction.onclick = async () => {
                    const value = prompt('How much do you want to sell this item for?');
                    if (!value || !/^\d+$/.test(value)) {
                        return;
                    }
                    const price = parseInt(value, 10);
                    uiShowElement(spinner);
                    const sale = await nearSell(near, itemId, price).catch(() => null);
                    if (sale) {
                        const items = storageGetItemIds();
                        items.splice(i, 1);
                        inventorySetUserSales();
                        inventorySetItems(items);
                    }
                    uiHideElement(spinner);
                };
                itemActions.appendChild(sellAction);
            }

            const dropAction = createItemAction('DROP');
            dropAction.onclick = () => {
                uiShowElement(cnf);
                const close = () => uiHideElement(cnf);
                yes.onclick = () => {
                    yes.onclick = null;
                    const items = storageGetItemIds();
                    items.splice(i, 1);
                    inventorySetItems(items);
                    close();
                };
                no.onclick = close;
            };
            itemActions.appendChild(dropAction);
        });

        invItems.appendChild(itemDiv);
    }
};

const renderGold = () => {
    gold.innerText = `GOLD: ${storageGetGold()}`;
};

const inventorySetItems = (items: Array<number>) => {
    storageSetItemIds(items);
    inventory[InventoryProperties.InventoryItems] = items;
    renderInventory();
};

const inventorySetEquippedItems = (equipped: EquippedIds) => {
    onEquip?.(equipped);
    storageSetEquippedIds(equipped);
    inventory[InventoryProperties.EquippedItems] = equipped;
    renderEquippedItems();
};

const inventorySetUserSales = async () => {
    inventory[InventoryProperties.SellItems] = await nearGetUserSales(inventory[InventoryProperties.Near]);
    renderUserSales();
};

const renderEquippedItems = () => {
    eqItems.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const itemId = inventory[InventoryProperties.EquippedItems][i];
        const itemDiv = createItemDiv(itemId, (itemActions: HTMLDivElement) => {
            const unequipAction = createItemAction('UNEQUIP');
            unequipAction.onclick = () => {
                if (inventoryIsFull()) {
                    return;
                }

                const items = storageGetItemIds();
                items.push(itemId);
                const equipped = storageGetEquippedIds();
                equipped[equipGetType(itemId)] = undefined;
                inventorySetItems(items);
                inventorySetEquippedItems(equipped);
            };
            itemActions.appendChild(unequipAction);
        });

        eqItems.appendChild(itemDiv);
    }
};

const renderUserSales = () => {
    sellItems.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const userSale = inventory[InventoryProperties.SellItems][i];
        const itemDiv = createItemDiv(userSale?.sale.itemId, (itemActions: HTMLDivElement, itemDiv: HTMLDivElement) => {
            if (!userSale) {
                return;
            }

            const sale = userSale.sale;
            const near = inventory[InventoryProperties.Near];
            if (userSale.completed) {
                const collectAction = createItemAction('COLLECT');
                itemDiv.dataset.price = `$ ${sale.price}`;
                collectAction.onclick = async () => {
                    uiShowElement(spinner);
                    const sale = await nearCollectSale(near, userSale.id).catch(() => null);
                    if (sale) {
                        inventoryAddGold(sale.price);
                        inventorySetUserSales();
                    }
                    uiHideElement(spinner);
                };
                itemActions.appendChild(collectAction);
                const sold = document.createElement('div');
                sold.classList.add('inv-sold');
                sold.innerText = 'SOLD!';
                itemDiv.appendChild(sold);
            } else {
                itemDiv.dataset.price = `$ ${sale.price}`;
                const cancelAction = createItemAction('CANCEL');
                cancelAction.onclick = async () => {
                    uiShowElement(spinner);
                    const sale = await nearCancelSale(near, userSale.id).catch(() => null);
                    if (sale) {
                        const items = storageGetItemIds();
                        items.push(sale.itemId);
                        inventorySetUserSales();
                        inventorySetItems(items);
                    }
                    uiHideElement(spinner);
                };
                itemActions.appendChild(cancelAction);
            }
        });

        sellItems.appendChild(itemDiv);
    }
};

const renderMarket = () => {
    mktItems.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const saleEntry = inventory[InventoryProperties.MarketItems][i];
        const itemDiv = createItemDiv(saleEntry?.sale.itemId, (itemActions: HTMLDivElement, itemDiv) => {
            if (!saleEntry) {
                return;
            }
            const sale = saleEntry.sale;
            const buyAction = createItemAction('BUY');
            itemDiv.dataset.price = `$ ${sale.price}`;
            buyAction.onclick = async () => {
                if (inventoryIsFull() || storageGetGold() < sale.price) {
                    return;
                }

                const near = inventory[InventoryProperties.Near];

                uiShowElement(spinner);
                const bought = await nearBuy(near, saleEntry.id).catch(() => null);
                if (bought) {
                    const items = storageGetItemIds();
                    items.push(bought.itemId);
                    inventoryAddGold(-bought.price);
                    inventorySetItems(items);
                    itemDiv.replaceWith(createItemDiv(undefined, () => {}));
                }

                uiHideElement(spinner);
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

const getRenderedItemClass = (() => {
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
    const renderedIds = {};

    return (itemId: number) => {
        if (!renderedIds[itemId]) {
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

            const img = canvas.toDataURL('image/png');
            css.innerHTML += `.img-${itemId} { background-image: url(${img}); }`;
            renderedIds[itemId] = true;
        }
        return `img-${itemId}`;
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
        uiHideElement(touch);

        invClose.onclick = () => {
            uiHideElement(inv);
            uiShowElement(touch);
        };
    };

    menuinv.onclick = () => {
        inventoryStart();

        invClose.onclick = () => {
            uiHideElement(inv);
        };
    };
};

let onEquip = null;
export const inventorySetOnEquip = (callback: (equipped: EquippedIds) => void) => {
    onEquip = callback;
};
