import * as swordModelData from '../art/sword.svg';
import { equipGetColor, equipGetLevel } from './equip';
import { ModelType, Object, objectCreate, objectSetColorOverride } from './model';

export const weaponCreateObject = (itemId: number): Object => {
    const object = objectCreate(ModelType.Sword);
    objectSetColorOverride(object, swordModelData.metalComponentId, equipGetColor(itemId));
    return object;
};

export const weaponGetAttack = (itemId: number) => equipGetLevel(itemId) + 1;
