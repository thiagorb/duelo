import { EquippedIds } from './equip';

const enum StorageDataProperties {
    NetworkId,
    ItemIds,
    EquippedIds,
    Gold,
}

export type StorageData = ReturnType<typeof storageLoad>;

export const storageKey = 'thiagorb_duelo';

const storageLoad = () => {
    let storageData = {
        [StorageDataProperties.NetworkId]: null as string,
        [StorageDataProperties.ItemIds]: [] as Array<number>,
        [StorageDataProperties.EquippedIds]: {} as EquippedIds,
        [StorageDataProperties.Gold]: 0,
    };

    let parsed = null;
    parsed = JSON.parse(localStorage.getItem(storageKey));

    return parsed || storageData;
};

const storageUpdate = (updater: (storageData: StorageData) => void) => {
    const storageData = storageLoad();
    updater(storageData);
    localStorage.setItem(storageKey, JSON.stringify(storageData));
};

export const storageGetGold = () => {
    return storageLoad()[StorageDataProperties.Gold];
};

export const storageAddGold = (amount: number) => {
    storageUpdate(s => (s[StorageDataProperties.Gold] += amount));
};

export const storageGetNetworkId = () => {
    return storageLoad()[StorageDataProperties.NetworkId];
};

export const storageSetNetworkId = (networkId: string) => {
    storageUpdate(s => (s[StorageDataProperties.NetworkId] = networkId));
};

export const storageGetItemIds = () => {
    return storageLoad()[StorageDataProperties.ItemIds];
};

export const storageSetItemIds = (itemIds: Array<number>) => {
    storageUpdate(s => (s[StorageDataProperties.ItemIds] = itemIds));
};

export const storageGetEquippedIds = () => {
    return storageLoad()[StorageDataProperties.EquippedIds];
};

export const storageSetEquippedIds = (equippedIds: EquippedIds) => {
    storageUpdate(s => (s[StorageDataProperties.EquippedIds] = equippedIds));
};
