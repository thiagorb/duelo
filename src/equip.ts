const enum EquippedIdsProperties {
    WeaponId,
}

export type EquippedIds = {
    [EquippedIdsProperties.WeaponId]?: number;
};

export const equipGetWeaponId = (equippedIds: EquippedIds): number | undefined => {
    return equippedIds[EquippedIdsProperties.WeaponId];
};
