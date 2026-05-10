import * as THREE from "three/webgpu";
import { attributeArray, color, int, struct, uniform } from "three/tsl";


/** Different force field types */
export const ForceFieldType = Object.freeze({
    DIRECTIONAL: { name: "directional", value: 1, color: color(0xe41a1c) },
    EXPANSION: { name: "expansion", value: 2, color: color(0x4daf4a) },
    CONTRACTION: { name: "contraction", value: 3, color: color(0x984ea3) },
});


/**
 * Represents a force field that applies a force to particles within its radius.
 * 
 * There are three types of force fields:
 *  - Directional: Pushes particles into a fixed direction with a fixed magnitude
 *  - Expansion: Pushes particles outwards from center, magnitude dependent on distance to center.
 *  - Contraction: Pulls particles inwards to center, magnitude dependent on distance to center.
 * 
 * The type is stored in {@link type} and is one of the values in {@link ForceFieldType}.
 * The force magnitude and direction is stored as vector in {@link force}. For contraction and expansion, only its magnitude matters.
 */
export class ForceField {
    static VIS_SCALE = 0.05;
    static GEOMETRY = new THREE.SphereGeometry(1);
    static ARROW_HANDLE_GEOMETRY = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    static ARROW_HANDLE_MATERIAL = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0.1, 0.3, 0.8), wireframe: true });

    /** @type {THREE.Mesh} */
    object = undefined;

    /** @type {ForceFieldType} */
    type = undefined;

    /** @type {THREE.Vector3} */
    force = new THREE.Vector3();

    /** @type {THREE.ArrowHelper} */
    arrow = undefined;

    /** @type {THREE.Object3D} */
    arrowHandle = undefined;

    /**
     *
     * @param {ForceFieldType} type
     */
    constructor(type) {
        this.type = type;

        const material = new THREE.MeshBasicNodeMaterial();
        material.colorNode = type.color;
        material.transparent = true;
        material.opacity = 0.5;

        this.object = new THREE.Mesh(ForceField.GEOMETRY, material);
        this.object.castShadow = true;
        this.object.receiveShadow = true;
        this.object.userData.object = this;
        this.object.renderOrder = 1;

        this.arrow = new THREE.ArrowHelper(new THREE.Vector3(), new THREE.Vector3(), 0, new THREE.Color(1, 0, 0));
        this.arrow.frustumCulled = false;
        this.arrow.scale.set(ForceField.VIS_SCALE, ForceField.VIS_SCALE, ForceField.VIS_SCALE);
        this.arrow.visible = false;

        this.arrowHandle = new THREE.Mesh(ForceField.ARROW_HANDLE_GEOMETRY, ForceField.ARROW_HANDLE_MATERIAL);
        this.arrowHandle.wireframe = true;
        this.arrowHandle.visible = false;
    }

    get radius() {
        return this.object.scale.x;
    }

    set radius(newRadius) {
        this.object.scale.set(newRadius, newRadius, newRadius);
    }

    get position() {
        return this.object.position;
    }

    set position(newPosition) {
        this.object.position.copy(newPosition);
    }

    updateForceFromArrowHandlePosition() {
        this.force = this.arrowHandle.position.clone().sub(this.object.position).multiplyScalar(1.0 / ForceField.VIS_SCALE);
        this.updateForceArrow();
    }

    updateArrowHandlePositionFromForce() {
        this.arrowHandle.position.copy(this.object.position.clone().addScaledVector(this.force, ForceField.VIS_SCALE));
        this.updateForceArrow();
    }

    updateForceArrow() {
        this.arrow.position.copy(this.object.position);
        this.arrow.setDirection(this.force.clone().normalize());
        this.arrow.setLength(this.force.length());
    }

    setForceArrowVisible(visible) {
        this.arrow.visible = visible;
        this.arrowHandle.visible = visible;
    }
}


/**
 * TSL struct for force fields used for applying forces to particles in shaders.
 */
export const ForceFieldStruct = struct({
    fieldType: "int",
    position: "vec3",
    radius: "float",
    force: "vec3",
}, "ForceFieldStruct");


/**
 * Represents a fixed-size list of force fields, which have a GPU representation.
 * 
 * Force fields can be added and removed using methods {@link addForceField} and {@link removeForceField}.
 * On the GPU, the force fields are represented as an storage buffer {@link forceFieldsBuffer}.
 * This storage buffer contains an array of {@link ForceFieldStruct}.
 * The current number of force fields is kept in a uniform {@link numForceFields}.
 * 
 * Adding or removing force fields updates the storage buffer and the uniform.
 * When an force field object itself is changed, the method {@link updateBuffer} needs to be called to 
 * update the GPU representation.
 */
export class ForceFieldManager {
    /** @type {THREE.Scene} */
    scene = undefined;

    /** @type {ForceField[]} */
    forceFields = undefined;

    /** @type {THREE.StorageBufferNode} */
    forceFieldsBuffer = undefined;

    /** @type {THREE.UniformNode} */
    numForceFieldsUniform = undefined;

    /**
     * Creates a new force field manager that can hold up to a specific number of force fields.
     * 
     * @param {number} maxNumForceFields maximum number of obstacles that can be held.
     * @param {THREE.Scene} scene THREE scene to add objects to
     */
    constructor(maxNumForceFields, scene) {
        this.scene = scene; // needed to add force field objects
        this.forceFields = [];

        // uniform structs are not yet supported (https://github.com/mrdoob/three.js/issues/33064)
        // which means uniform arrays of structs are also not yet supported
        // alternatives: storage buffers or separate uniform arrays for each struct member
        this.numForceFieldsUniform = uniform(int(0));
        this.forceFieldsBuffer = attributeArray(maxNumForceFields, ForceFieldStruct);
    }

    /** Updates force fields GPU representation after changing properties (e.g. position, scale or force). */
    updateBuffer() {
        const attribute = this.forceFieldsBuffer.value;
        const buffer = new ArrayBuffer(4 * attribute.itemSize * this.forceFields.length); // size in bytes
        const intView = new Int32Array(buffer);
        const floatView = new Float32Array(buffer);

        this.forceFields.forEach((forceField, index) => {
            const startOffset = index * attribute.itemSize;
            intView.set([forceField.type.value], startOffset); // int member (4 bytes) in struct is padded to 16 bytes (for some reason)
            floatView.set(forceField.position.toArray(), startOffset + 4);
            floatView.set([forceField.radius], startOffset + 7);
            floatView.set(forceField.force.toArray(), startOffset + 8);
        });

        this.forceFieldsBuffer.value.set(floatView);
        this.forceFieldsBuffer.value.needsUpdate = true;
    }

    /**
     * Adds a force field with a specific type. On creation, the other properties are hardcoded, but can be changed later on.
     * Also updates GPU representation.
     * 
     * @param {ForceFieldType} type type of the force field
     * @returns {ForceField} newly created force field object
     * @throws {Error} if buffer capacity is reached
     */
    addForceField(type) {
        if (this.forceFields.length >= this.forceFieldsBuffer.bufferCount) {
            throw new Error("Failed to add force field: Storage buffer capacity reached.");
        }

        const forceField = new ForceField(type);
        forceField.position = new THREE.Vector3(0, 3, 0);
        forceField.radius = 4;
        forceField.force = new THREE.Vector3(100, 0, 0);
        forceField.updateArrowHandlePositionFromForce();
        this.forceFields.push(forceField);
        this.scene.add(forceField.object);
        this.scene.add(forceField.arrow);
        this.scene.add(forceField.arrowHandle);

        this.numForceFieldsUniform.value = this.forceFields.length;
        this.updateBuffer();

        return forceField;
    }

    /**
     * Removes force field. Also updates GPU representation.
     * 
     * @param {ForceField} toRemove force field to remove
     */
    removeForceField(toRemove) {
        this.forceFields = this.forceFields.filter(forceField => forceField !== toRemove);
        this.scene.remove(toRemove.object);
        this.scene.remove(toRemove.arrow);
        this.scene.remove(toRemove.arrowHandle);

        this.numForceFieldsUniform.value = this.forceFields.length;
        this.updateBuffer();
    }
}
