import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { ExerciseBase as Exercise } from "./base.js";
import { MODELS, SHADERS } from "./resources.js";
import { FfdVolume } from "./volume.js";
import { Animation, createExampleAnimation } from "./animation.js";

/** Different possible types of global deformations, exposed via UI. */
const DeformationType = Object.freeze({
    TAPER: "taper",
    TWIST: "twist",
    BEND: "bend",
    CUSTOM: "custom",
});

/** Different geometries - expected to have vertices between -1 and 1 */
const GeometryType = Object.freeze({
    BOX: "box",
    CYLINDER: "cylinder",
    CYLINDER_HIGH_RES: "cylinder_high_res",
    TEAPOT: "teapot",
    POYOYO16: "poyoyo16",
});


class DeformationExercise extends Exercise {

    /** @type {GUI} */
    #gui = undefined;

    #params = {
        deformationType: DeformationType.TAPER,
        geometryType: GeometryType.BOX,
        k: 0.0,
        wireframe: false,
        animationSpeed: 1.0,
        animationLoop: true,
        startAnimation: () => this.startAnimation(),
        stopAnimation: () => this.stopAnimation(),
    };

    #globalDeformUniforms = {
        deformType: { value: 0 },
        k: { value: 0.0 },
        color: { value: new THREE.Vector3(1.0, 0.5, 0.25) },
        lightDir: { value: new THREE.Vector3(2.0, 10, 4).normalize() },
        minCoord: { value: new THREE.Vector3() },
        maxCoord: { value: new THREE.Vector3() },
    };

    #ffdUniforms = {
        color: { value: new THREE.Vector3(1.0, 0.5, 0.25) },
        lightDir: { value: new THREE.Vector3(2.0, 10, 4).normalize() },
        controlPointsOrig: {
            value: [
                new THREE.Vector3(1, -1, -1), new THREE.Vector3(1, 1, -1),
                new THREE.Vector3(-1, 1, -1), new THREE.Vector3(-1, -1, -1),
                new THREE.Vector3(1, -1, 1), new THREE.Vector3(1, 1, 1),
                new THREE.Vector3(-1, 1, 1), new THREE.Vector3(-1, -1, 1)
            ]
        },
        controlPoints: { value: new Array(8).fill(new THREE.Vector3()) },
    };

    /** @type {Object.<string, THREE.BufferGeometry>} */
    #geometries = {};

    /** @type {THREE.Material} */
    #globalDeformMaterial = undefined;

    /** @type {THREE.Material} */
    #ffdMaterial = undefined;

    /** @type {THREE.Mesh} */
    #deformObject = undefined;

    /** @type {Animation} */
    #animation = undefined;

    /** @type {FfdVolume} */
    #volume = undefined;

    #isAnimationRunning = false;
    #stopRequested = false;

    constructor() {
        super();

        this.initUi();
        this.initGeometries();
        this.initMaterials();
        this.initDeformObject();

        this.#volume = new FfdVolume();
        this.#volume.object.visible = false;
        this.scene.add(this.#volume.object);
        this.#animation = createExampleAnimation();

        this.camera.position.set(0, 2, 3);
        this.scene.getObjectByName("Grid").position.y = -0.5;
    }

    initUi() {
        this.#gui = new GUI();
        this.#gui.add(this.#params, "geometryType", Object.values(GeometryType)).onChange(() => {
            this.updateGlobalDeformationUniforms();
            this.render();
        });

        const globalDeformations = this.#gui.addFolder("Global deformation");
        globalDeformations.add(this.#params, "deformationType", Object.values(DeformationType)).onChange(() => {
            this.updateGlobalDeformationUniforms();
            this.render();
        });
        globalDeformations.add(this.#params, "k", 0.0, 1.0).onChange(() => {
            this.updateGlobalDeformationUniforms();
            this.render();
        });

        const freeFormDeformation = this.#gui.addFolder("Free-form deformation (FFD)");
        freeFormDeformation.add(this.#params, "animationSpeed", 0.1, 2);
        freeFormDeformation.add(this.#params, "animationLoop");
        freeFormDeformation.add(this.#params, "startAnimation");
        freeFormDeformation.add(this.#params, "stopAnimation");
        this.#gui.open();
    }

    initGeometries() {
        this.#geometries[GeometryType.BOX] = new THREE.BoxGeometry(1, 1, 1, 20, 20, 20);
        this.#geometries[GeometryType.CYLINDER] = new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 1);
        this.#geometries[GeometryType.CYLINDER_HIGH_RES] = new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 32);
        this.#geometries[GeometryType.TEAPOT] = MODELS.teapot.children[0].geometry;
        this.#geometries[GeometryType.POYOYO16] = BufferGeometryUtils.mergeGeometries(MODELS.poyoyo16.children.map(child => child.geometry));

        Object.values(this.#geometries).forEach(geometry => geometry.computeBoundingBox());
        Object.keys(this.#geometries).forEach(key => console.log(key, this.#geometries[key].boundingBox));
    }

    initMaterials() {
        this.#globalDeformMaterial = new THREE.ShaderMaterial({
            uniforms: this.#globalDeformUniforms,
            vertexShader: SHADERS.vertex,
            fragmentShader: SHADERS.fragment,
        });

        this.#ffdMaterial = new THREE.ShaderMaterial({
            uniforms: this.#ffdUniforms,
            vertexShader: SHADERS.vertex_ffd,
            fragmentShader: SHADERS.fragment,
        });

    }

    initDeformObject() {
        this.#deformObject = new THREE.Mesh(this.#geometries[this.#params.geometryType], this.#globalDeformMaterial);
        this.scene.add(this.#deformObject);
        this.updateGlobalDeformationUniforms();
    }

    updateGlobalDeformationUniforms() {
        const deformationType = this.#params.deformationType;
        if (deformationType == DeformationType.TAPER) this.#globalDeformUniforms.deformType.value = 0;
        else if (deformationType == DeformationType.TWIST) this.#globalDeformUniforms.deformType.value = 1;
        else if (deformationType == DeformationType.BEND) this.#globalDeformUniforms.deformType.value = 2;
        else if (deformationType == DeformationType.CUSTOM) this.#globalDeformUniforms.deformType.value = 3;

        const geometry = this.#geometries[this.#params.geometryType];
        this.#deformObject.geometry = geometry;
        this.#globalDeformUniforms.minCoord.value.copy(geometry.boundingBox.min);
        this.#globalDeformUniforms.maxCoord.value.copy(geometry.boundingBox.max);

        this.#globalDeformUniforms.k.value = this.#params.k;
    }

    /** Starts animation. */
    startAnimation() {
        if (this.#isAnimationRunning) {
            return;
        }

        this.#isAnimationRunning = true;
        let lastFrameTime = undefined;

        const animationFrame = (currentTime) => {
            // set start time on first frame
            if (lastFrameTime === undefined) {
                lastFrameTime = currentTime;
                this.onAnimationStart();
            }

            // get elapsed time and call on update
            const secondsSinceLastFrame = (currentTime - lastFrameTime) * 0.001;
            lastFrameTime = currentTime;
            const scaledTimeStep = this.#params.animationSpeed * secondsSinceLastFrame;
            const shouldContinue = this.onAnimationUpdate(scaledTimeStep);

            // start over
            if (!shouldContinue && !this.#stopRequested && this.#params.animationLoop) {
                lastFrameTime = undefined;
                requestAnimationFrame(animationFrame);
                return;
            }

            // stop animation
            if (!shouldContinue || this.#stopRequested) {
                this.#stopRequested = false;
                this.onAnimationStop();
                return;
            }

            requestAnimationFrame(animationFrame);
        };
        requestAnimationFrame(animationFrame);
    }

    /**
     * Callback on animation start.
     * Shows FFD volume wireframe, disables global deformation controls.
     */
    onAnimationStart() {
        // disable global deformation controls and start button
        this.#gui.children[1].children.forEach(controller => controller.disable());
        this.#gui.children[2].children.filter(controller => controller.property === "startAnimation")[0].disable();

        this.#deformObject.material = this.#ffdMaterial;
        this.#volume.object.visible = true;

        this.#animation.reset();
    }

    /**
     * Callback on animation update.
     * @param {number} timeStep animation time step in seconds
     * @returns {bool} true if animation should continue, false otherwise
     */
    onAnimationUpdate(timeStep) {
        const { continue: shouldContinue, points: points } = this.#animation.step(timeStep);

        if (!shouldContinue) {
            return false;
        }

        // update control points and render
        this.#volume.object.geometry.setFromPoints(points);
        this.#ffdUniforms.controlPoints.value = points;
        this.render();
        return true;
    }

    /**
     * Callback when animation is stopped (either when ended and non looping or after stop is clicked).
     * Hides FFD volume, enables global deformation controls.
     */
    onAnimationStop() {
        this.#isAnimationRunning = false;
        this.#deformObject.material = this.#globalDeformMaterial;
        this.#volume.object.visible = false;
        this.render();

        // enable global deformation controls
        this.#gui.children[1].children.forEach(controller => controller.enable());
        this.#gui.children[2].children.filter(controller => controller.property === "startAnimation")[0].enable();
    }

    /** Schedules animation stop. */
    stopAnimation() {
        if (this.#isAnimationRunning) {
            this.#stopRequested = true;
        }
    }

}

function main() {
    const app = new DeformationExercise();
    app.render();
}

main();