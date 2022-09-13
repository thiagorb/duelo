import { backgroundInit } from './background';
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH, gameCreate, gameStart } from './game';
import { glProgramCreate } from './gl';
import { modelsInit } from './model';

const main = async () => {
    const canvas = document.querySelector('canvas');
    const program = glProgramCreate(canvas, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    modelsInit(program);
    backgroundInit();

    gameStart(gameCreate(0), program);
};

window.onload = main;
