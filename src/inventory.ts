import { storageGetItemIds, storageSetItemIds } from './storage';

export const inventoryIsFull = () => {
    return storageGetItemIds().length >= 10;
};

export const inventoryAddItem = (itemId: number) => {
    storageSetItemIds([...storageGetItemIds(), itemId]);
};
