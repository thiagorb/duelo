const enum StorageDataProperties {
    NetworkId,
    ItemIds,
    Gold,
}

export type StorageData = ReturnType<typeof storageLoad>;

export const storageKey = 'thiagorb_duelo';

const storageLoad = () => {
    let storageData = {
        [StorageDataProperties.NetworkId]: null as string,
        [StorageDataProperties.ItemIds]: [] as Array<number>,
        [StorageDataProperties.Gold]: 0,
    };

    try {
        const parsed = JSON.parse(localStorage.getItem(storageKey));
        if (process.env.NODE_ENV === 'production' || validateData(parsed)) {
            storageData = parsed;
        }
    } catch (e) {}

    return storageData;
};

const validateData = (parsed: any) => {
    if (typeof parsed !== 'object') {
        return false;
    }

    if (typeof parsed[StorageDataProperties.Gold] !== 'number') {
        return false;
    }

    if (
        !Array.isArray(parsed[StorageDataProperties.ItemIds]) ||
        parsed[StorageDataProperties.ItemIds].some(weaponId => typeof weaponId !== 'number')
    ) {
        return false;
    }

    return true;
};

const storageUpdate = (updater: (storageData: StorageData) => void) => {
    const storageData = storageLoad();
    updater(storageData);
    localStorage.setItem(storageKey, JSON.stringify(storageData));
};

export const storageGetGold = () => {
    return storageLoad()[StorageDataProperties.Gold];
};

export const storageSetGold = (gold: number) => {
    storageUpdate(s => (s[StorageDataProperties.Gold] = gold));
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
