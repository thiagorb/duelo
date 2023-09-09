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
import * as dummyWeaponModelData from '../art/dummy-weapon.svg';
import * as goldModelData from '../art/gold.svg';
import * as backgroundModelData from '../art/background.svg';
import { COLOR_PRECISION, COORDINATES_PRECISION } from './config';

export const enum ModelType {
    Man,
    Sword,
    DummyWeapon,
    Gold,
    Background,
}

const modelStorage = new WeakMap<Program, Map<ModelType, Array<Mesh>>>();

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
    TransformOrigin,
    Color,
}

export type ModelMesh = {
    [ModelMeshProperty.TransformOrigin]: Vec2;
    [ModelMeshProperty.Color]: Float32Array;
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

type Model = {
    [ModelProperty.Meshes]: Array<ModelMesh>;
    [ModelProperty.ParentMap]: Array<number>;
    [ModelProperty.MaterialMap]: { [componentId: number]: number };
    [ModelProperty.TransformOrder]: Array<number>;
};

const enum ObjectProperty {
    Components,
    ModelType,
    Transform,
    Subobjects,
    ColorOverrides,
}

export type Object = {
    [ObjectProperty.Components]: Array<ObjectComponent>;
    [ObjectProperty.ModelType]: ModelType;
    [ObjectProperty.Transform]: Matrix3;
    [ObjectProperty.Subobjects]: {
        [componentId: number]: Object;
    };
    [ObjectProperty.ColorOverrides]: {
        [componentId: number]: Float32Array;
    };
};

const modelMeshFromPolygon = (polygon: Polygon): ModelMesh => {
    const transformCoordinate = (c: number) => c / COORDINATES_PRECISION;
    const transformColor = (c: number) => c / COLOR_PRECISION;

    return {
        [ModelMeshProperty.TransformOrigin]: vectorCreate(
            ...(polygon[PolygonProperty.TransformOrigin].map(transformCoordinate) || [0, 0])
        ),
        [ModelMeshProperty.Color]: new Float32Array(polygon[PolygonProperty.Color].map(transformColor)),
    };
};

export const modelCreate = (data: ModelData): Model => {
    const meshes = data[ModelDataProperty.Polygons].map(polygon => modelMeshFromPolygon(polygon));

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

    return {
        [ModelProperty.Meshes]: meshes,
        [ModelProperty.ParentMap]: data[ModelDataProperty.ParentMap],
        [ModelProperty.MaterialMap]: data[ModelDataProperty.MaterialMap],
        [ModelProperty.TransformOrder]: transformOrder,
    };
};

const modelsData: Map<ModelType, ModelData> = new Map([
    [ModelType.Man, manModelData.model],
    [ModelType.Sword, swordModelData.model],
    [ModelType.DummyWeapon, dummyWeaponModelData.model],
    [ModelType.Gold, goldModelData.model],
    [ModelType.Background, backgroundModelData.model],
]);
const models = new Map([...modelsData.entries()].map(([modelType, modelData]) => [modelType, modelCreate(modelData)]));

export const objectCreate = (
    modelType: ModelType,
    subobjects: Object[ObjectProperty.Subobjects] = {},
    colorOverrides: Object[ObjectProperty.ColorOverrides] = {}
): Object => {
    const components = models.get(modelType)[ModelProperty.Meshes].map(mesh => objectComponentFromMesh(mesh));

    return {
        [ObjectProperty.Components]: components,
        [ObjectProperty.ModelType]: modelType,
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

    const model = models.get(object[ObjectProperty.ModelType]);
    const parentId = model[ModelProperty.ParentMap][componentId];
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
        const model = models.get(subobject[ObjectProperty.ModelType]);
        for (const subComponentId of model[ModelProperty.TransformOrder]) {
            objectTransformApplyComponent(subobject, subComponentId, transform);
        }
    }
};

export const objectApplyTransforms = (object: Object) => {
    const model = models.get(object[ObjectProperty.ModelType]);
    for (const componentId of model[ModelProperty.TransformOrder]) {
        objectTransformComponent(object, componentId);
    }
};

export const objectDraw = (object: Object, program: Program) => {
    const componentsLength = object[ObjectProperty.Components].length;
    const meshes = meshesLoad(program, object[ObjectProperty.ModelType]);
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
        const modelMesh = component[ObjectComponentProperty.Mesh];
        const color = modelMesh[ModelMeshProperty.Color] || object[ObjectProperty.ColorOverrides][componentId];
        const model = models.get(object[ObjectProperty.ModelType]);
        const material = model[ModelProperty.MaterialMap][componentId] || 0;
        glMeshDraw(program, meshes[componentId], color, material);
    }
};

const meshesLoad = (program: Program, modelType: ModelType) => {
    if (!modelStorage.has(program)) {
        modelStorage.set(program, new Map());
    }

    const programModels = modelStorage.get(program);
    if (!programModels.has(modelType)) {
        const modelData = modelsData.get(modelType);
        programModels.set(
            modelType,
            modelData[ModelDataProperty.Polygons].map(polygon => {
                const transformCoordinate = (c: number) => c / COORDINATES_PRECISION;
                return glMeshCreate(
                    program,
                    polygon[PolygonProperty.Vertices].map(transformCoordinate),
                    polygon[PolygonProperty.Indices]
                );
            })
        );
    }

    return programModels.get(modelType);
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

export const objectGetComponentTransformOrder = (object: Object) => {
    const model = models.get(object[ObjectProperty.ModelType]);
    return model[ModelProperty.TransformOrder];
};
export const modelGetWeapons = () => [ModelType.DummyWeapon, ModelType.Sword];
