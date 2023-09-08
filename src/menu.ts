import { Game, gameCreate, gameRender, gameStart, gameStep } from './game';
import { Program, glIncreaseTime } from './gl';
import { inventoryStart } from './inventory';

declare const menuUi: HTMLDivElement;
declare const start: HTMLButtonElement;

export const menuStart = (program: Program, previousGame: Game = null) => {
    menuUi.classList.remove('hidden');

    const game = previousGame || gameCreate();
    let started = false;
    let previousTime = 0;
    const loop = (time: number) => {
        const deltaTime = time - previousTime;
        previousTime = time;
        if (previousGame) {
            gameStep(game, deltaTime * 0.8);
        }
        glIncreaseTime(program, deltaTime);
        gameRender(game, program);

        if (!started) {
            requestAnimationFrame(loop);
        }
    };
    requestAnimationFrame((time: number) => loop((previousTime = time)));

    gameRender(gameCreate(), program);

    start.onclick = () => {
        menuUi.classList.add('hidden');
        gameStart(gameCreate(), program);
        started = true;
        start.onclick = null;
    };
};
