const { XMLParser } = require('fast-xml-parser');
const earcut = require('earcut');
const { COLOR_PRECISION, COORDINATES_PRECISION } = require('../src/config');

module.exports.default = function (source) {
    const options = this.getOptions();
    const parser = new XMLParser({
        ignoreAttributes: false,
        allowBooleanAttributes: true,
        attributeNamePrefix: '',
    });
    const jObj = parser.parse(source);

    const viewBox = jObj.svg.viewBox.split(' ').map(x => parseFloat(x));

    const isNumber = n => /^-?[0-9]+(\.[0-9]+)?/.test(n);

    /**
     * @param {string} v
     * @returns {[number, number] | null}
     */
    const parseCoordinates = v => {
        const numbers = v.split(',');
        if (numbers.length !== 2 || numbers.some(n => !isNumber(n))) {
            return null;
        }
        return numbers.map(x => parseFloat(x));
    };

    const toAbsolute = ([x, y]) => [x, viewBox[3] - y];

    const convertPathD = path => {
        const v = path.d.split(' ');
        const vertices = [];
        let state = 'start';
        let penPosition = [0, viewBox[3]];
        let wasLine = false;
        const toRelative = ([x, y]) => [penPosition[0] + x, penPosition[1] - y];

        const pushLineCoord = (coords) => {
            if (!wasLine) {
                vertices.push(penPosition);
            }
            vertices.push(coords);
            penPosition = coords;
            wasLine = true;
        }

        for (let i = 0; i < v.length; ) {
            const consumePair = () => {
                let pair = parseCoordinates(v[i]);
                if (pair !== null) {
                    i++;
                    return pair;
                }

                if (isNumber(v[i]) && isNumber(v[i + 1])) {
                    pair = [v[i], v[i + 1]].map(n => parseFloat(n));
                    i += 2;
                }

                return pair;
            };

            switch (state) {
                case 'start':
                    switch (v[i]) {
                        case 'M':
                            state = 'after_M';
                            break;
                        case 'm':
                            state = 'after_m';
                            break;
                        case 'L':
                            state = 'after_L';
                            break;
                        case 'l':
                            state = 'after_l';
                            break;
                        case 'H':
                            state = 'after_H';
                            break;
                        case 'h':
                            state = 'after_h';
                            break;
                        case 'V':
                            state = 'after_V';
                            break;
                        case 'v':
                            state = 'after_v';
                            break;
                        case 'z':
                        case 'Z':
                            state = 'end';
                            break;
                        default:
                            throw new Error(`Unrecognized path ${path.id}. Not sure what to do with ${v[i]}.`);
                    }

                    i++;
                    break;

                case 'end':
                    throw new Error(`Unrecognized path ${path.id}. Expected end of string but found ${v[i]}.`);

                case 'after_M': {
                    const pair = consumePair();
                    if (pair === null) {
                        state = 'start';
                        break;
                    }

                    const coords = toAbsolute(pair);
                    penPosition = coords;
                    wasLine = false;
                    state = 'after_L';
                    break;
                }

                case 'after_m': {
                    const pair = consumePair();
                    if (pair === null) {
                        state = 'start';
                        break;
                    }

                    const coords = toRelative(pair);
                    penPosition = coords;
                    wasLine = false;
                    state = 'after_l';
                    break;
                }

                case 'after_L': {
                    const pair = consumePair();
                    if (pair === null) {
                        state = 'start';
                        break;
                    }

                    pushLineCoord(toAbsolute(pair));
                    break;
                }

                case 'after_l': {
                    const pair = consumePair();
                    if (pair === null) {
                        state = 'start';
                        break;
                    }

                    pushLineCoord(toRelative(pair));
                    break;
                }

                case 'after_H': {
                    if (isNumber(v[i])) {
                        const coord = parseFloat(v[i]);
                        const coords = toAbsolute([coord, penPosition[1]]);
                        pushLineCoord(coords);
                        i++;
                    } else {
                        state = 'start';
                    }
                    break;
                }

                case 'after_h': {
                    if (isNumber(v[i])) {
                        const coord = parseFloat(v[i]);
                        const coords = toRelative([coord, 0]);
                        pushLineCoord(coords);
                        i++;
                    } else {
                        state = 'start';
                    }
                    break;
                }

                case 'after_V': {
                    if (isNumber(v[i])) {
                        const coord = parseFloat(v[i]);
                        const coords = toAbsolute([penPosition[0], coord]);
                        pushLineCoord(coords);
                        i++;
                    } else {
                        state = 'start';
                    }
                    break;
                }

                case 'after_v': {
                    if (isNumber(v[i])) {
                        const coord = parseFloat(v[i]);
                        const coords = toRelative([0, coord]);
                        pushLineCoord(coords);
                        i++;
                    } else {
                        state = 'start';
                    }
                    break;
                }
            }
        }

        return buildPathDefinition(path, vertices);
    };

    const convertRect = rect => {
        let x = parseFloat(rect.x);
        let y = parseFloat(rect.y);
        let width = parseFloat(rect.width);
        let height = parseFloat(rect.height);
        const vertices = [
            toAbsolute([x, y]),
            toAbsolute([x + width, y]),
            toAbsolute([x + width, y + height]),
            toAbsolute([x, y + height]),
        ];

        return buildPathDefinition(rect, vertices);
    };

    const paths = [
        ...getNodes(jObj.svg.g?.path).map(p => convertPathD(p)),
        ...getNodes(jObj.svg.g?.rect).map(p => convertRect(p)),
    ];

    const pathIdMap = new Map(paths.map((p, i) => [p.id, i]));

    const parentIdMap = new Array(paths.length);
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        if (path.meta.connectTo) {
            parentIdMap[i] = pathIdMap.get(path.meta.connectTo);
        }
    }

    const materialMap = {};
    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        if (path.meta.material) {
            materialMap[i] = path.meta.material;
        }
    }

    const statements = [];
    const polygons = [];

    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const parentOrigin = parentIdMap[i] !== undefined ? paths[parentIdMap[i]].transformOrigin : [0, 0];

        const relativeOrigin = translateVertexToOrigin(path.transformOrigin, parentOrigin);

        if (path.meta.placeholder) {
            polygons.push([[], [], [0, 0, 0], path.meta.connectTo ? relativeOrigin.map(transformCoordinate) : [0, 0]]);
        } else {
            polygons.push([
                translateVerticesToOrigin(path.vertices, path.transformOrigin).flat().map(transformCoordinate),
                earcut(path.vertices.flat()),
                path.color.map(transformColorComponent),
                path.meta.connectTo ? relativeOrigin.map(transformCoordinate) : [0, 0],
            ]);
        }
        statements.push(`export const ${path.id}ComponentId = ${pathIdMap.get(path.id)};`);
    }

    const model = [polygons, parentIdMap, materialMap];

    statements.push(`export const model = ${JSON.stringify(model, 4)};`);

    return statements.join('\n\n');
};

const transformColorComponent = c => Math.round(c * COLOR_PRECISION);
const transformCoordinate = c => Math.round(c * COORDINATES_PRECISION);

const getNodes = nodes => {
    if (!nodes) {
        return [];
    }

    return Array.isArray(nodes) ? nodes : [nodes];
};

const translateVertexToOrigin = (vertex, origin) => {
    return vertex.map((c, i) => c - origin[i]);
};

const translateVerticesToOrigin = (vertices, origin) => {
    return vertices.map(v => translateVertexToOrigin(v, origin));
};

const buildPathDefinition = (svgNode, vertices) => {
    return {
        id: isValidIdentifier(svgNode.id) ? svgNode.id : `random${Math.floor(Math.random() * 1000000)}`,
        meta: JSON.parse(svgNode.desc?.['#text'] ?? '{}'),
        vertices,
        color: parseFillColor(svgNode.style),
        transformOrigin: computeTransformOrigin(vertices, extractInkscapeTransformCenter(svgNode)),
    };
};

const isValidIdentifier = id => /^[a-z0-9_]+$/i.test(id);

const extractInkscapeTransformCenter = path => {
    if (path['inkscape:transform-center-x'] === undefined || path['inkscape:transform-center-y'] === undefined) {
        return undefined;
    }

    return [parseFloat(path['inkscape:transform-center-x']), parseFloat(path['inkscape:transform-center-y'])];
};

const parseFillColor = style => {
    const regex = /fill:([^;]+);/;
    const match = style.match(regex);
    if (match) {
        const hex = match[1];
        const rgb = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (rgb) {
            return [parseInt(rgb[1], 16) / 255, parseInt(rgb[2], 16) / 255, parseInt(rgb[3], 16) / 255];
        }
    }

    return [Math.random(), Math.random(), Math.random()];
};

const computeTransformOrigin = (vertices, inkscapeTransformCenter) => {
    const [minX, minY, maxX, maxY] = computeBoundingBox(vertices);
    const dx = (maxX - minX) / 2;
    const dy = (maxY - minY) / 2;

    if (!inkscapeTransformCenter) {
        return [dx, dy];
    }

    return [minX + dx + inkscapeTransformCenter[0], minY + dy + inkscapeTransformCenter[1]];
};

const computeBoundingBox = vertices => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const v of vertices) {
        minX = Math.min(minX, v[0]);
        minY = Math.min(minY, v[1]);
        maxX = Math.max(maxX, v[0]);
        maxY = Math.max(maxY, v[1]);
    }
    return [minX, minY, maxX, maxY];
};

const expected = [
    [
        [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
        ], // vertices
        [
            [
                [0, 0],
                [0, 1],
                [1, 1],
                [1, 0],
                [0, 0],
            ], // vertices
            [], // subpolygons,
            [], // transform origin (optional)
        ], // subpolygons
    ],
];
