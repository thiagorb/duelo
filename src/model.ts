import { ColorRGB, glMeshDraw, glMeshCreate, Mesh, Program, glSetModelTransform } from './gl';
import {
    Matrix3,
    matrixCopy,
    matrixCreate,
    matrixMultiply,
    matrixMultiplyVector,
    matrixTranslateVector,
    Vec2,
    vectorCreate,
} from './glm';
import * as manModelData from '../art/man.svg';
import * as swordModelData from '../art/sword.svg';
import * as backgroundModelData from '../art/background.svg';
import { COLOR_PRECISION, COORDINATES_PRECISION } from './config';

export const enum Models {
    Man,
    Sword,
    Background,
}

export let models: ReturnType<typeof modelsInit>;
export const modelsInit = (program: Program) => {
    const m = {
        [Models.Man]: modelCreate(program, manModelData.model),
        [Models.Sword]: modelCreate(program, swordModelData.model),
        [Models.Background]: modelCreate(program, backgroundModelData.model),
    };
    models = m;
    return m;
};

export const enum PolygonProperty {
    Vertices,
    Indices,
    Color,
    TransformOrigin,
}

export type Polygon = {
    [PolygonProperty.Vertices]: Array<number>;
    [PolygonProperty.Indices]: Array<number>;
    [PolygonProperty.Color]: ColorRGB;
    [PolygonProperty.TransformOrigin]: [number, number];
};

export const enum ModelDataProperty {
    Polygons,
    ParentMap,
    MaterialMap,
}

export type ModelData = {
    [ModelDataProperty.Polygons]: Array<Polygon>;
    [ModelDataProperty.ParentMap]: Array<number>;
    [ModelDataProperty.MaterialMap]: { [componentId: number]: number };
};

const enum ModelMeshProperty {
    Mesh,
    TransformOrigin,
}

export type ModelMesh = {
    [ModelMeshProperty.Mesh]: Mesh;
    [ModelMeshProperty.TransformOrigin]: Vec2;
};

const enum ObjectComponentProperty {
    Mesh,
    Matrix,
}

export type ObjectComponent = {
    [ObjectComponentProperty.Mesh]: ModelMesh;
    [ObjectComponentProperty.Matrix]: Matrix3;
};

const enum ModelProperty {
    Meshes,
    ParentMap,
    MaterialMap,
    TransformOrder,
}

export type Model = {
    [ModelProperty.Meshes]: Array<ModelMesh>;
    [ModelProperty.ParentMap]: Array<number>;
    [ModelProperty.MaterialMap]: { [componentId: number]: number };
    [ModelProperty.TransformOrder]: Array<number>;
};

const enum ObjectProperty {
    Components,
    Model,
    Transform,
    Subobjects,
    ColorOverrides,
}

export type Object = {
    [ObjectProperty.Components]: Array<ObjectComponent>;
    [ObjectProperty.Model]: Model;
    [ObjectProperty.Transform]: Matrix3;
    [ObjectProperty.Subobjects]: {
        [componentId: number]: Object;
    };
    [ObjectProperty.ColorOverrides]: {
        [componentId: number]: ColorRGB;
    };
};

export const modelCreate = (program: Program, data: ModelData, loaded: boolean = true): Model => {
    const meshes = data[ModelDataProperty.Polygons].map(polygon => modelMeshFromPolygon(program, polygon, loaded));

    const calculateLevel = (index: number) => {
        let level = 0;
        let current = index;
        while (typeof data[ModelDataProperty.ParentMap][current] === 'number') {
            level++;
            current = data[ModelDataProperty.ParentMap][current];
        }

        return level;
    };

    const transformOrder = data[ModelDataProperty.ParentMap].map((parentId, index) => index);
    transformOrder.sort((a, b) => calculateLevel(a) - calculateLevel(b));

    console.log(data[ModelDataProperty.MaterialMap]);

    return {
        [ModelProperty.Meshes]: meshes,
        [ModelProperty.ParentMap]: data[ModelDataProperty.ParentMap],
        [ModelProperty.MaterialMap]: data[ModelDataProperty.MaterialMap],
        [ModelProperty.TransformOrder]: transformOrder,
    };
};

export const objectCreate = (
    model: Model,
    subobjects: Object[ObjectProperty.Subobjects] = {},
    colorOverrides: Object[ObjectProperty.ColorOverrides] = {}
): Object => {
    const components = model[ModelProperty.Meshes].map(mesh => objectComponentFromMesh(mesh));

    return {
        [ObjectProperty.Components]: components,
        [ObjectProperty.Model]: model,
        [ObjectProperty.Transform]: matrixCreate(),
        [ObjectProperty.Subobjects]: subobjects,
        [ObjectProperty.ColorOverrides]: colorOverrides,
    };
};

const objectComponentFromMesh = (mesh: ModelMesh): ObjectComponent => {
    return {
        [ObjectComponentProperty.Mesh]: mesh,
        [ObjectComponentProperty.Matrix]: matrixCreate(),
    };
};

export const objectTransformComponent = (object: Object, componentId: number) => {
    const component = object[ObjectProperty.Components][componentId];
    const subobject = object[ObjectProperty.Subobjects][componentId];
    const matrix = subobject ? objectGetRootTransform(subobject) : component[ObjectComponentProperty.Matrix];

    const parentId = object[ObjectProperty.Model][ModelProperty.ParentMap][componentId];
    if (typeof parentId === 'number') {
        matrixCopy(matrix, object[ObjectProperty.Components][parentId][ObjectComponentProperty.Matrix]);
    } else {
        matrixCopy(matrix, object[ObjectProperty.Transform]);
    }
    matrixTranslateVector(matrix, component[ObjectComponentProperty.Mesh][ModelMeshProperty.TransformOrigin]);

    if (subobject) {
        objectApplyTransforms(subobject);
    }
};

export const objectTransformApplyComponent = (object: Object, componentId: number, transform: Matrix3) => {
    const component = object[ObjectProperty.Components][componentId];
    const subobject = object[ObjectProperty.Subobjects][componentId];
    const matrix = subobject ? objectGetRootTransform(subobject) : component[ObjectComponentProperty.Matrix];

    matrixMultiply(matrix, matrix, transform);
    if (subobject) {
        for (const subComponentId of subobject[ObjectProperty.Model][ModelProperty.TransformOrder]) {
            objectTransformApplyComponent(subobject, subComponentId, transform);
        }
    }
};

export const objectApplyTransforms = (object: Object) => {
    for (const componentId of object[ObjectProperty.Model][ModelProperty.TransformOrder]) {
        objectTransformComponent(object, componentId);
    }
};

export const objectDraw = (object: Object, program: Program) => {
    const componentsLength = object[ObjectProperty.Components].length;
    for (let componentId = 0; componentId < componentsLength; componentId++) {
        const subobject = object[ObjectProperty.Subobjects][componentId];
        if (subobject !== undefined) {
            if (subobject !== null) {
                matrixCopy(objectGetRootTransform(subobject), objectGetComponentTransform(object, componentId));
                objectDraw(subobject, program);
            }
            continue;
        }

        const component = object[ObjectProperty.Components][componentId];
        glSetModelTransform(program, component[ObjectComponentProperty.Matrix]);
        const colorOverride = object[ObjectProperty.ColorOverrides][componentId];
        const material = object[ObjectProperty.Model][ModelProperty.MaterialMap][componentId] || 0;
        glMeshDraw(program, component[ObjectComponentProperty.Mesh][ModelMeshProperty.Mesh], colorOverride, material);
    }
};

const modelMeshFromPolygon = (program: Program, polygon: Polygon, loaded: boolean): ModelMesh => {
    const transformCoordinate = (c: number) => c / (loaded ? COORDINATES_PRECISION : 1);
    const transformColor = (c: number) => c / (loaded ? COLOR_PRECISION : 1);

    return {
        [ModelMeshProperty.Mesh]: glMeshCreate(
            program,
            polygon[PolygonProperty.Vertices].map(transformCoordinate),
            polygon[PolygonProperty.Indices],
            polygon[PolygonProperty.Color].map(transformColor) as ColorRGB
        ),
        [ModelMeshProperty.TransformOrigin]: vectorCreate(
            ...(polygon[PolygonProperty.TransformOrigin].map(transformCoordinate) || [0, 0])
        ),
    };
};

export const objectGetComponentTransform = (object: Object, componentId: number) =>
    object[ObjectProperty.Components][componentId][ObjectComponentProperty.Matrix];

export const objectCalculateomponentTransformedOrigin = (object: Object, componentId: number, result: Vec2) => {
    const componentTransform = objectGetComponentTransform(object, componentId);
    result[0] = 0;
    result[1] = 0;
    matrixMultiplyVector(result, componentTransform);
    return result;
};

export const objectGetRootTransform = (object: Object) => object[ObjectProperty.Transform];

export const objectGetComponentTransformOrder = (object: Object) =>
    object[ObjectProperty.Model][ModelProperty.TransformOrder];

export const modelGetWeapons = () => [models[Models.Sword]];
