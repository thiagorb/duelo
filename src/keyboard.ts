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
        const space = document.querySelector('[data-key="Space"]') as HTMLElement;
        space.addEventListener('touchstart', touchKeyStart);
        space.addEventListener('touchend', touchKeyEnd);
        const arrowUp = document.querySelector('[data-key="ArrowUp"]') as HTMLElement;
        arrowUp.addEventListener('touchstart', touchKeyStart);
        arrowUp.addEventListener('touchend', touchKeyEnd);

        const handleArrowsMove = (e: TouchEvent) => {
            const left = e.touches[0].clientX - arrows.clientLeft < arrows.clientWidth / 2;
            state['ArrowLeft'] = left;
            state['ArrowRight'] = !left;
        };
        const arrows = document.querySelector('[data-key="Arrows"]') as HTMLElement;
        arrows.addEventListener('touchstart', handleArrowsMove);
        arrows.addEventListener('touchmove', handleArrowsMove);
        arrows.addEventListener('touchend', (e: TouchEvent) => {
            state['ArrowLeft'] = false;
            state['ArrowRight'] = false;
        });

        document.ondblclick = e => e.preventDefault();
    };

    if (typeof ontouchstart !== 'undefined') {
        enableTouch();
    } else {
        document.querySelector('#touch').remove();
    }

    return state;
};
