declare const touch: HTMLElement;

export const keyboardInitialize = <Key extends string>(keys: Key[]): { [K in Key]: boolean } => {
    const state = Object.fromEntries(keys.map(key => [key, false])) as { [K in Key]: boolean };

    addEventListener('keydown', (e: KeyboardEvent) => {
        const code = e.code as Key;
        if (code in state) {
            e.preventDefault();
            e.stopPropagation();
            state[code] = true;
        }
    });

    addEventListener('keyup', (e: KeyboardEvent) => {
        const code = e.code as Key;
        if (code in state) {
            e.preventDefault();
            e.stopPropagation();
            state[code] = false;
        }
    });

    const enableTouch = () => {
        const touchKeyStart = event => (state[(event.currentTarget as HTMLElement).dataset.key] = true);
        const touchKeyEnd = event => (state[(event.target as HTMLElement).dataset.key] = false);
        document.querySelectorAll('[data-key]').forEach(key => {
            key.addEventListener('touchstart', touchKeyStart);
            key.addEventListener('touchend', touchKeyEnd);
        });

        document.ondblclick = e => e.preventDefault();
    };

    if (typeof ontouchstart !== 'undefined') {
        enableTouch();
    } else {
        touch.style.display = 'none';
    }

    return state;
};
