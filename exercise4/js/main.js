import * as THREE from "three/webgpu";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import Stats from "three/addons/libs/stats.module.js";
import {
    Fn, color, instancedArray, instanceIndex,
    uniform, float, int, vec3, hash, shapeCircle
} from "three/tsl";

import { ExerciseBase as Exercise } from "./base.js";
import { ForceFieldType, ForceField, ForceFieldManager } from "./force-field.js";
import { BoxObstacle, ObstacleManager } from "./obstacle.js";
import { updateParticlesWGSL } from "./particle-update.js";

//TODO spawn within transformable cube (position)
//TODO initial velocity adaptable

const MAX_NUM_FORCE_FIELDS = 30;
const MAX_NUM_OBSTACLES = 30;

class ParticleExercise extends Exercise {

    /** @type {GUI} */
    #gui = undefined;

    /** @type {Stats} */
    #stats = undefined;

    /** @type {TransformControls} */
    #transformControls = undefined;

    #onDownPosition = new THREE.Vector2();
    #onUpPosition = new THREE.Vector2();
    #isPointerDown = false;

    #params = {
        type: ForceFieldType.DIRECTIONAL.name,
        editMode: "translate",
        addForceField: () => this.addForceField(),
        addObstacle: () => this.addObstacle(),
        removeSelectedObject: () => this.removeSelectedObject(),
    };

    #lastTimeInSeconds = 0.0;

    #uniforms = {
        gravity: uniform(float(9.81)),
        dragCoeff: uniform(float(0.0)),
        bounciness: uniform(float(0.0)),
        time: uniform(float(0.0)),
        deltaTime: uniform(float(0.0)),
        particleLifeTime: uniform(float(3.0)),
        numParticles: uniform(int(1000)),
        particleSize: uniform(float(0.3)),
        minInitParticlePos: uniform(vec3()),
        maxInitParticlePos: uniform(vec3()),
    };

    /** @type {ForceFieldManager} */
    forceFieldManager = undefined;

    /** @type {ObstacleManager} */
    obstacleManager = undefined;

    /** @type {ForceField | BoxObstacle | undefined} */
    selectedObject = undefined;

    /** @type {THREE.Object3D} */
    particles = undefined;

    /** @type {THREE.ComputeNode} */
    initParticlesCompute = undefined;

    /** @type {THREE.ComputeNode} */
    updateParticlesCompute = undefined;

    constructor() {
        super(true);
    }

    async init() {
        await this.renderer.init();
        this.initTransformControls();
        this.initUi();
        this.initStats();

        this.forceFieldManager = new ForceFieldManager(MAX_NUM_FORCE_FIELDS, this.scene);
        this.obstacleManager = new ObstacleManager(MAX_NUM_OBSTACLES, this.scene);

        this.initParticles();

        this.scene.getObjectByName("Grid").position.y = -10.0;
        this.scene.getObjectByName("ShadowPlane").visible = false;
    }

    initUi() {
        this.#gui = new GUI();

        const meta = this.#gui.addFolder("meta parameters");
        meta.add(this.#uniforms.numParticles, "value", 1, 2_500_000, 1)
            .name("Num. particles")
            .onFinishChange(() => this.reinitParticles());
        meta.add(this.#uniforms.particleLifeTime, "value", 1, 10, 0.1)
            .name("lifetime [s]")
            .onFinishChange(() => this.reinitParticles());  // need to re-init to get initially equal spacing in time
        meta.add(this.#uniforms.particleSize, "value", 0.05, 1, 0.01).name("size [m]");
        meta.close();

        const particles = this.#gui.addFolder("particle parameters");
        particles.add(this.#uniforms.gravity, "value", 0, 15, 0.1).name("gravity [m/s^2]");
        particles.add(this.#uniforms.dragCoeff, "value", 0, 1, 0.001).name("dragCoeff");
        particles.add(this.#uniforms.bounciness, "value", 0, 1, 0.001).name("bounciness");

        const forceFieldFolder = this.#gui.addFolder("force fields");
        forceFieldFolder.add(this.#params, "type", Object.values(ForceFieldType).map(entry => entry.name));
        forceFieldFolder.add(this.#params, "addForceField");

        const obstacleFolder = this.#gui.addFolder("obstacles");
        obstacleFolder.add(this.#params, "addObstacle");

        const selectedObjectFolder = this.#gui.addFolder("selected object");
        selectedObjectFolder.add(this.#params, "editMode", ["translate", "scale"])
            .name("edit mode  [G or S key]")
            .listen()
            .onChange(() => this.updateTransformMode());
        selectedObjectFolder.add(this.#params, "removeSelectedObject").name("remove selected [Del key]");

        this.#gui.open();
    }

    initStats() {
        this.#stats = new Stats();
        this.#stats.domElement.style.position = "absolute";
        this.#stats.domElement.style.top = "0px";
        this.renderer.domElement.offsetParent.appendChild(this.#stats.domElement);
    }

    initTransformControls() {
        this.#transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.#transformControls.size = 0.5;
        this.#transformControls.addEventListener("change", () => this.render());
        this.#transformControls.addEventListener("dragging-changed", (event) => {
            this.orbitControls.enabled = !event.value; // disable orbit controls while transforming objects
        });
        this.#transformControls.addEventListener("objectChange", () => {
            if (this.selectedObject.constructor.name === ForceField.name) {
                // selected forcefield handle
                if (this.#transformControls.object === this.selectedObject.object) {
                    if (this.#transformControls.mode === "scale") {
                        const axis = ["X", "Y", "Z"].findIndex(axis => this.#transformControls.axis.includes(axis));
                        const newScale = Math.max(0.1, this.selectedObject.object.scale.getComponent(axis));
                        this.selectedObject.radius = newScale;
                    }
                    this.selectedObject.updateArrowHandlePositionFromForce();
                } else if (this.#transformControls.object === this.selectedObject.arrowHandle) { // selected force field arrow handle
                    this.selectedObject.updateForceFromArrowHandlePosition();
                }
                this.forceFieldManager.updateBuffer();
            } else if (this.selectedObject.constructor.name === BoxObstacle.name) {
                this.selectedObject.updateCorners();
                this.selectedObject.scale.clampScalar(0.1, Infinity);
                this.obstacleManager.updateBuffer();
            }
        });
        this.scene.add(this.#transformControls.getHelper());

        document.addEventListener("pointerdown", (event) => this.onPointerDown(event));
        document.addEventListener("pointerup", (event) => this.onPointerUp(event));
        document.addEventListener("pointermove", (event) => this.onPointerMove(event));
        document.addEventListener("keyup", (event) => this.onKeyUp(event));
    }

    initParticles() {
        const numParticles = this.#uniforms.numParticles.value;
        this.#uniforms.deltaTime.value = 0.0;
        this.#lastTimeInSeconds = 0.0;

        // per particle attributes
        const positions = instancedArray(numParticles, "vec3"); // also used as instance positions for billboards
        const initialPositions = instancedArray(numParticles, "vec3");
        const velocities = instancedArray(numParticles, "vec3");
        const initialVelocities = instancedArray(numParticles, "vec3");
        const startTimes = instancedArray(numParticles, "float");

        // init particles
        this.initParticlesCompute = Fn(() => {
            const initialPosition = initialPositions.element(instanceIndex);
            initialPosition.x = hash(instanceIndex).mul(3.0);
            initialPosition.y = hash(instanceIndex.mul(numParticles)).mul(2.0).sub(1.0).mul(1.0).add(20.0);
            initialPosition.z = hash(instanceIndex.mul(numParticles).mul(numParticles)).mul(3.0);
            positions.element(instanceIndex).assign(initialPosition);

            const initialVelocity = initialVelocities.element(instanceIndex);
            initialVelocity.x = 3.0;
            initialVelocity.y = 2.0;
            velocities.element(instanceIndex).assign(initialVelocity);

            const startTime = startTimes.element(instanceIndex);
            startTime.assign(float(instanceIndex).mul(float(this.#uniforms.particleLifeTime).div(float(this.#uniforms.numParticles))));
        })().compute(numParticles).setName("Particle Init Position and Velocity");
        this.renderer.compute(this.initParticlesCompute);

        // defines GPU resources that are passed as parameters to the wgsl node below
        // basically tells three.js what bindings to generate and what of those need to be 
        // passed as the parameters to the wgsl node's function
        const params = {
            particleIndex: instanceIndex,
            positions: positions,
            velocities: velocities,
            startTimes: startTimes,
            initialPositions: initialPositions,
            initialVelocities: initialVelocities,
            particleLifeTime: this.#uniforms.particleLifeTime,
            currentTime: this.#uniforms.time,
            deltaTime: this.#uniforms.deltaTime,
            gravity: this.#uniforms.gravity,
            dragCoeff: this.#uniforms.dragCoeff,
            bounciness: this.#uniforms.bounciness,
            numForceFields: this.forceFieldManager.numForceFieldsUniform,
            forceFields: this.forceFieldManager.forceFieldsBuffer,
            numObstacles: this.obstacleManager.numObstaclesUniform,
            obstacles: this.obstacleManager.obstaclesBuffer,
        };
        this.updateParticlesCompute = updateParticlesWGSL(params).compute(numParticles).setName("Particle Update");

        const material = new THREE.SpriteNodeMaterial();
        material.colorNode = color(0, 0, 0.2);
        material.positionNode = positions.toAttribute();
        material.scaleNode = this.#uniforms.particleSize;
        //material.opacityNode = shapeCircle();
        //material.alphaToCoverage = true;
        //material.transparent = true;
        this.particles = new THREE.Sprite(material);
        this.particles.name = "Particles";
        this.particles.count = numParticles;
        this.particles.frustumCulled = false;
        this.scene.add(this.particles);

        this.renderer.setAnimationLoop((time) => this.animationLoopUpdate(time));
    }

    reinitParticles() {
        this.scene.remove(this.particles);
        this.initParticles();
    }

    /**
     * Called on every animation frame, usually 60 times per second.
     * @param {number} timeInMs time elapsed since start, in milliseconds
     */
    animationLoopUpdate(timeInMs) {
        const timeInSeconds = timeInMs / 1000.0;

        this.#uniforms.deltaTime.value = timeInSeconds - this.#lastTimeInSeconds;
        this.#uniforms.time.value = timeInSeconds;

        this.#lastTimeInSeconds = timeInSeconds;

        this.renderer.compute(this.updateParticlesCompute);
        this.render();
        this.#stats.update();
    }

    setSelected(object) {
        // previously selected object was force field, hide arrow and handle
        if (this.selectedObject !== undefined && this.selectedObject.constructor.name === ForceField.name) {
            this.selectedObject.arrow.visible = false;
            this.selectedObject.arrowHandle.visible = false;
        }

        if (object === undefined) {
            this.#transformControls.detach();
        } else {
            this.#transformControls.attach(object.object);
            // newly selected object is force field, show arrow and handle
            if (object.constructor.name === ForceField.name) {
                object.arrow.visible = true;
                object.arrowHandle.visible = true;
            }
        }

        this.selectedObject = object;
        this.#transformControls.mode = this.#params.editMode;
    }

    updateTransformMode() {
        if (this.selectedObject !== undefined && this.#transformControls.object === this.selectedObject.object) { // non-handle selected
            this.#transformControls.mode = this.#params.editMode;
        }
    }

    addForceField() {
        const typeName = this.#params.type;
        const type = Object.values(ForceFieldType).find(entry => entry.name === typeName);
        const newForceField = this.forceFieldManager.addForceField(type);
        this.setSelected(newForceField);
    }

    removeSelectedObject() {
        if (this.selectedObject === undefined) {
            return;
        }

        if (this.selectedObject.constructor.name === ForceField.name) {
            this.forceFieldManager.removeForceField(this.selectedObject);
        } else if (this.selectedObject.constructor.name === BoxObstacle.name) {
            this.obstacleManager.removeObstacle(this.selectedObject);
        } else {
            throw Error("Invalid selected object type.");
        }

        this.setSelected(undefined);
    }

    addObstacle() {
        const newObstacle = this.obstacleManager.addObstacle();
        this.setSelected(newObstacle);
    }

    onPointerDown(event) {
        this.#onDownPosition.x = event.clientX;
        this.#onDownPosition.y = event.clientY;
        this.#isPointerDown = true;
    }

    onPointerUp(event) {
        this.#onUpPosition.x = event.clientX;
        this.#onUpPosition.y = event.clientY;
        this.#isPointerDown = false;

        // if inside gui, dont select or deselect objects
        if (this.#gui.domElement.contains(event.target)) {
            return;
        }

        // was click
        if (this.#onDownPosition.distanceTo(this.#onUpPosition) === 0) {
            // clear current selection
            this.setSelected(undefined);

            // raycast against control points
            const forceFieldObjects = this.forceFieldManager.forceFields.map(forceField => forceField.object);
            const obstacleObjects = this.obstacleManager.obstacles.map(obstacle => obstacle.object);
            const hitableObjects = forceFieldObjects.concat(obstacleObjects);

            const hitObject = this.raycastPointerAgainst(event, hitableObjects);
            if (hitObject) {
                // if hit, select force field or obstacle (or undefined)
                this.setSelected(hitObject.userData.object);
            }
        }
    }
    onPointerMove(event) {
        if (this.#isPointerDown) {
            return;
        }

        if (!this.selectedObject || this.selectedObject.constructor.name !== ForceField.name) {
            return;
        }

        // raycast against handle of selected force field
        const objects = [this.selectedObject.object, this.selectedObject.arrowHandle];
        const hitObjects = this.raycastPointerAgainst(event, objects, true);
        if (hitObjects.length === 0) {
            return;
        }

        // select force field or force arrow handle
        if (hitObjects.map(o => o.object).includes(this.selectedObject.arrowHandle)) {
            this.#transformControls.mode = "translate";
            this.#transformControls.attach(this.selectedObject.arrowHandle);
        } else {
            this.#transformControls.mode = this.#params.editMode;
            this.#transformControls.attach(hitObjects[0].object);
        }
    }

    onKeyUp(event) {
        if (event.code === "Delete") {
            this.removeSelectedObject();
            return;
        }

        if (event.code === "KeyG") {
            this.#params.editMode = "translate";
            this.updateTransformMode();
        } else if (event.code === "KeyS") {
            this.#params.editMode = "scale";
            this.updateTransformMode();
        }
    }

}

async function main() {
    const app = new ParticleExercise();
    await app.init();
}

await main();