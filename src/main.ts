import { backgroundInit } from './background';
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH, gameCreate, gameRender, gameStart } from './game';
import { glProgramCreate } from './gl';
import { menuStart } from './menu';
import { modelsInit } from './model';

const main = async () => {
    const canvas = document.querySelector('canvas');
    const program = glProgramCreate(canvas, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    modelsInit(program);
    backgroundInit();

    menuStart(program);
};

window.onload = main;
