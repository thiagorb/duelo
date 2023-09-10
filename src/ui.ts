const enum UpdaterProperties {
    LastUpdatedValue,
    UpdateFunction,
}

type Updater = {
    [UpdaterProperties.LastUpdatedValue]: number;
    [UpdaterProperties.UpdateFunction]: (n: number) => void;
};

export const uiUpdaterCreate = (updateFunction: Updater[UpdaterProperties.UpdateFunction]): Updater => ({
    [UpdaterProperties.LastUpdatedValue]: 0,
    [UpdaterProperties.UpdateFunction]: updateFunction,
});

export const uiUpdaterSet = (updater: Updater, displayValue: number) => {
    if (displayValue !== updater[UpdaterProperties.LastUpdatedValue]) {
        updater[UpdaterProperties.LastUpdatedValue] = displayValue;
        updater[UpdaterProperties.UpdateFunction](displayValue);
    }
};

declare const barPlayer: HTMLElement;
declare const barEnemy: HTMLElement;

export const uiPlayerHealthUpdater = uiUpdaterCreate((n: number) => updateHealth(barPlayer, n));
export const uiOpponentUpdater = uiUpdaterCreate((n: number) => updateHealth(barEnemy, n));

const updateHealth = (healthBar: HTMLElement, n: number) =>
    healthBar.style.setProperty('--progress', Math.max(0, Math.min(1, n)) as any as string);

export const uiHideElement = (element: HTMLElement) => {
    element.classList.add('hidden');
    setTimeout(() => (element.style.display = 'none'), 500);
};

export const uiShowElement = (element: HTMLElement) => {
    element.style.display = null;
    setTimeout(() => element.classList.remove('hidden'));
};
