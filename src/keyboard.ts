declare const touch: HTMLElement;

const enum KeyboardProperties {
    State,
    Sequence,
    Timeout,
}

type Keyboard<Key extends string> = {
    [KeyboardProperties.State]: { [K in Key]: boolean };
    [KeyboardProperties.Sequence]: { [K in Key]: number };
    [KeyboardProperties.Timeout]: { [K in Key]: NodeJS.Timeout };
};

export const keyboardInitialize = <Key extends string>(keys: Key[]): Keyboard<Key> => {
    const state = Object.fromEntries(keys.map(key => [key, false])) as { [K in Key]: boolean };
    const sequence = Object.fromEntries(keys.map(key => [key, 0])) as { [K in Key]: number };
    const timeouts = Object.fromEntries(keys.map(key => [key, null])) as { [K in Key]: NodeJS.Timeout };
    const clearSequence = Object.fromEntries(keys.map(key => [key, () => (sequence[key] = 0)])) as {
        [K in Key]: () => number;
    };

    const keyDown = (e: Event, code: Key) => {
        if (!state[code]) {
            state[code] = true;
            sequence[code]++;
            if (sequence[code] === 2) {
                console.log('double tap');
            }
        }
    };

    const keyUp = (e: Event, key: Key) => {
        state[key] = false;
        if (timeouts[key]) {
            clearTimeout(timeouts[key]);
        }
        timeouts[key] = setTimeout(clearSequence[key], 200);
    };

    addEventListener('keydown', (e: KeyboardEvent) => keyDown(e, e.code as Key));
    addEventListener('keyup', (e: KeyboardEvent) => keyUp(e, e.code as Key));

    const enableTouch = () => {
        const touchKeyStart = event => keyDown(event, (event.target as HTMLElement).dataset.key as Key);
        const touchKeyEnd = event => keyUp(event, (event.target as HTMLElement).dataset.key as Key);
        document.querySelectorAll('[data-key]').forEach(key => {
            key.addEventListener('touchstart', touchKeyStart);
            key.addEventListener('touchend', touchKeyEnd);
        });

        document.ondblclick = e => e.preventDefault();
    };

    if (typeof ontouchstart !== 'undefined') {
        enableTouch();
    } else {
        touch.classList.add('no-touch');
    }

    return {
        [KeyboardProperties.State]: state,
        [KeyboardProperties.Sequence]: sequence,
        [KeyboardProperties.Timeout]: timeouts,
    };
};

export const keyboardGetState = <Key extends string>(keyboard: Keyboard<Key>, key: Key): number => {
    return keyboard[KeyboardProperties.State][key] ? keyboard[KeyboardProperties.Sequence][key] || 1 : 0;
};
