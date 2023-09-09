import { Animatable, animatableCreate } from './animation';
import { MaterialType, ModelType, objectCreate, objectSetMaterial } from './model';
import { weaponCreateObject } from './weapon';
import * as knightModelData from '../art/knight.svg';
import * as swordModelData from '../art/sword.svg';
import {
    knightApplyArmorOverrides,
    knightApplyBootsOverrides,
    knightApplyGauntletOverrides,
    knightApplyHelmetOverrides,
} from './knight';
import { ColorRGB } from './gl';

export const enum EquippedIdsProperties {
    WeaponId,
    ArmorId,
    GauntletsId,
    BootsId,
    HelmetId,
}

export type EquippedIds = {
    [EquippedIdsProperties.WeaponId]?: number;
    [EquippedIdsProperties.ArmorId]?: number;
};

const EQUIP_TYPES = 5;
const ITEM_LEVELS = 4;
const ITEM_TYPES = EQUIP_TYPES * ITEM_LEVELS;

export const equipGetType = (itemId: number) => (itemId % EQUIP_TYPES) as EquippedIdsProperties;
export const equipGetLevel = (itemId: number) => (itemId / EQUIP_TYPES) | 0;

export const equipGetItemId = (type: EquippedIdsProperties, level: number = 0) => type + level * EQUIP_TYPES;

export const equipGetRandomId = (): number => (Math.random() * ITEM_TYPES) | 0;

export const equipGetWeaponId = (equippedIds: EquippedIds): number | undefined => {
    return equippedIds[EquippedIdsProperties.WeaponId];
};

export const equipCreateAnimatable = (itemId: number): Animatable => {
    const knight = objectCreate(ModelType.Knight);
    objectSetMaterial(knight, MaterialType.Invisible);
    switch (equipGetType(itemId)) {
        case EquippedIdsProperties.WeaponId:
            return animatableCreate(weaponCreateObject(itemId), []);
        case EquippedIdsProperties.ArmorId: {
            knightApplyArmorOverrides(knight, itemId);
            return animatableCreate(knight, []);
        }
        case EquippedIdsProperties.GauntletsId: {
            knightApplyGauntletOverrides(knight, itemId);
            return animatableCreate(knight, []);
        }
        case EquippedIdsProperties.BootsId: {
            knightApplyBootsOverrides(knight, itemId);
            return animatableCreate(knight, []);
        }
        case EquippedIdsProperties.HelmetId: {
            knightApplyHelmetOverrides(knight, itemId);
            return animatableCreate(knight, []);
        }
    }
};

export const equipGetOriginComponentId = (itemId: number): number => {
    switch (equipGetType(itemId)) {
        case EquippedIdsProperties.WeaponId:
            return swordModelData.centerComponentId;
        case EquippedIdsProperties.ArmorId:
            return knightModelData.bodyComponentId;
        case EquippedIdsProperties.GauntletsId:
            return knightModelData.gauntletsCenterComponentId;
        case EquippedIdsProperties.BootsId:
            return knightModelData.bootsCenterComponentId;
        case EquippedIdsProperties.HelmetId:
            return knightModelData.helmetComponentId;
    }
};

const equipColors: Array<ColorRGB> = [
    [0.75, 0.54, 0.44], // bronze
    [0.4, 0.4, 0.4], // iron
    [0.81, 0.82, 0.84], // steel
    [0.83, 0.69, 0.22], // gold
];

export const equipGetColor = (itemId: number): ColorRGB => {
    const level = equipGetLevel(itemId);
    return equipColors[level];
};
