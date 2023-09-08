import * as swordModelData from '../art/sword.svg';
import * as dummyModelData from '../art/dummy-weapon.svg';
import { ColorRGB } from './gl';
import { Vec2 } from './glm';
import { Object, modelGetWeapons, objectCalculateomponentTransformedOrigin, objectCreate } from './model';

const enum WeaponTypeStatsProperty {
    Range,
    Gap,
}

const enum WeaponType {
    Dummy,
    Sword,
}

const enum WeaponProperties {
    Object,
    Id,
}

export type Weapon = {
    [WeaponProperties.Object]: Object;
    [WeaponProperties.Id]: number;
};

const weaponColors: Array<Float32Array> = [
    new Float32Array([0.4, 0.22, 0]), // wood
    new Float32Array([0.75, 0.54, 0.44]), // bronze
    new Float32Array([0.81, 0.82, 0.84]), // steel
    new Float32Array([0.83, 0.69, 0.22]), // gold
];

export const weaponCreate = (weaponId: number): Weapon => {
    const type = weaponGetType(weaponId);
    const model = modelGetWeapons()[type];
    const metalColor = weaponColors[1 + weaponGetAttack(weaponId)];
    const colorOverrides = {
        [WeaponType.Dummy]: {},
        [WeaponType.Sword]: {
            [swordModelData.metalComponentId]: metalColor,
        },
    }[type];

    return {
        [WeaponProperties.Object]: objectCreate(model, {}, colorOverrides),
        [WeaponProperties.Id]: weaponId,
    };
};

export const weaponGetObject = (weapon: Weapon) => weapon[WeaponProperties.Object];
export const weaponGetId = (weapon: Weapon) => weapon[WeaponProperties.Id];

export const weaponGetAttack = (weaponId: number) => (weaponId === 0 ? 1 : weaponId + 1);
export const weaponGetType = (weaponId: number) => (weaponId === 0 ? WeaponType.Dummy : WeaponType.Sword);
export const weaponGetRandomId = (random: number): number => Math.floor(random * 3);

const weaponGetTipComponentId = (weapon: Weapon) => {
    const weaponId = weaponGetId(weapon);
    switch (weaponId) {
        case 0:
            return dummyModelData.tipComponentId;
        default:
            return swordModelData.tipComponentId;
    }
};

export const weaponGetTipPosition = (weapon: Weapon, position: Vec2) =>
    objectCalculateomponentTransformedOrigin(weaponGetObject(weapon), weaponGetTipComponentId(weapon), position);
