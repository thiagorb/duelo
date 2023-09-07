import { backgroundInit } from './background';
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH, gameCreate, gameRender, gameStart } from './game';
import { glProgramCreate } from './gl';
import { menuStart } from './menu';
import { modelsInit } from './model';
import { storageGetGold } from './storage';

declare const canvas: HTMLCanvasElement;

const main = async () => {
    const program = glProgramCreate(canvas, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    modelsInit(program);
    backgroundInit();

    menuStart(program);
};

window.onload = main;
