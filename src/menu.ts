import { Game, gameCreate, gameRender, gameStart, gameStep } from './game';
import { Program, glIncreaseTime } from './gl';

declare const menuUi: HTMLDivElement;
declare const start: HTMLButtonElement;

export const menuStart = (program: Program, previousGame: Game = null) => {
    menuUi.classList.remove('hidden');

    const game = previousGame || gameCreate(0);
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

    gameRender(gameCreate(0), program);

    start.onclick = () => {
        menuUi.classList.add('hidden');
        gameStart(gameCreate(0), program);
        started = true;
        start.onclick = null;
    };
};
