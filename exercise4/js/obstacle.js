import * as THREE from "three/webgpu";
import { attributeArray, color, int, struct, uniform } from "three/tsl";


/**
 * Represents a box-shaped obstacle that particles can collide with.
 * Always axis-aligned.
 */
export class BoxObstacle {
    static GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

    /** @type {THREE.Mesh} */
    object = undefined;

    minCorner = new THREE.Vector3();
    maxCorner = new THREE.Vector3();

    constructor() {
        const material = new THREE.MeshBasicNodeMaterial();
        material.colorNode = color(0xff7f00);
        material.transparent = true;
        material.opacity = 0.8;

        this.object = new THREE.Mesh(BoxObstacle.GEOMETRY, material);
        this.object.castShadow = true;
        this.object.receiveShadow = true;
        this.object.userData.object = this;
        this.object.renderOrder = 1;

        this.updateCorners();
    }

    get position() {
        return this.object.position;
    }

    set position(newPosition) {
        this.object.position.copy(newPosition);
        this.updateCorners();
    }

    get scale() {
        return this.object.scale;
    }

    set scale(scale) {
        this.object.scale.copy(scale);
        this.updateCorners();
    }

    /** Updates properties {@link minCorner} and {@link maxCorner} based on {@link position} and {@link scale}. */
    updateCorners() {
        this.minCorner.copy(this.position).addScaledVector(this.scale, -0.5);
        this.maxCorner.copy(this.position).addScaledVector(this.scale, 0.5);
    }

}


/**
 * TSL struct for box obstacles used for particle collisions in shaders.
 */
export const BoxObstacleStruct = struct({
    minCorner: "vec3",
    maxCorner: "vec3",
}, "BoxObstacleStruct");


/**
 * Represents a fixed-size list of box obstacles, which have a GPU representation.
 * 
 * Box obstacles can be added and removed using methods {@link addObstacle} and {@link removeObstacle}.
 * On the GPU, the obstacles are represented as an storage buffer {@link obstaclesBuffer}.
 * This storage buffer contains an array of {@link BoxObstacleStruct}.
 * The current number of obstacles is kept in a uniform {@link numObstaclesUniform}.
 * 
 * Adding or removing obstacles updates the storage buffer and the uniform.
 * When an obstacle object itself is changed, the method {@link updateBuffer} needs to be called to 
 * update the GPU representation.
 */
export class ObstacleManager {
    /** @type {THREE.Scene} */
    scene = undefined;

    /** @type {BoxObstacle[]} */
    obstacles = undefined;

    /** @type {THREE.StorageBufferNode} */
    obstaclesBuffer = undefined;

    /** @type {THREE.UniformNode} */
    numObstaclesUniform = undefined;

    /**
     * Creates a new obstacle manager that can hold up to a specific number of obstacles.
     * 
     * @param {number} maxNumObstacles maximum number of obstacles that can be held.
     * @param {THREE.Scene} scene THREE scene to add objects to
     */
    constructor(maxNumObstacles, scene) {
        this.scene = scene; // needed to add obstacle objects
        this.obstacles = [];

        // uniform structs are not yet supported (https://github.com/mrdoob/three.js/issues/33064)
        // which means uniform arrays of structs are also not yet supported
        // alternatives: storage buffers or separate uniform arrays for each struct member
        this.numObstaclesUniform = uniform(int(0));
        this.obstaclesBuffer = attributeArray(maxNumObstacles, BoxObstacleStruct);
    }

    /** Updates obstacles GPU representation after changing properties (e.g. position or scale). */
    updateBuffer() {
        const attribute = this.obstaclesBuffer.value;
        const buffer = new ArrayBuffer(4 * attribute.itemSize * this.obstacles.length); // size in bytes
        const floatView = new Float32Array(buffer);

        this.obstacles.forEach((obstacle, index) => {
            const startOffset = index * attribute.itemSize;
            floatView.set(obstacle.minCorner.toArray(), startOffset);
            floatView.set(obstacle.maxCorner.toArray(), startOffset + 4);
        });

        this.obstaclesBuffer.value.set(floatView);
        this.obstaclesBuffer.value.needsUpdate = true;
    }

    /**
     * Adds an obstacle. On creation, the its properties are hardcoded, but can be changed later on.
     * Also updates GPU representation.
     * 
     * @returns {BoxObstacle} newly created obstacle object
     * @throws {Error} if buffer capacity is reached
     */
    addObstacle() {
        if (this.obstacles.length >= this.obstaclesBuffer.bufferCount) {
            throw new Error("Failed to add obstacle: Storage buffer capacity reached.");
        }

        const box = new BoxObstacle();
        box.position = new THREE.Vector3(0, 3, 0);
        box.scale = new THREE.Vector3(5, 5, 5);
        this.obstacles.push(box);
        this.scene.add(box.object);

        this.numObstaclesUniform.value = this.obstacles.length;
        this.updateBuffer();

        return box;
    }

    /**
     * Removes obstacle. Also updates GPU representation.
     * 
     * @param {BoxObstacle} toRemove obstacle to remove
     */
    removeObstacle(toRemove) {
        this.obstacles = this.obstacles.filter(obstacle => obstacle !== toRemove);
        this.scene.remove(toRemove.object);

        this.numObstaclesUniform.value = this.obstacles.length;
        this.updateBuffer();
    }
}
