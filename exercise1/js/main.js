import * as THREE from "three";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";

import { ExerciseBase as Exercise } from "./base.js";
import { ControlPoint } from "./control-point.js";
import { interpolateLinear, interpolateHermiteSpline, interpolateBezierSpline, interpolateCatmullRom } from "./interpolation.js";

const InterpolationType = Object.freeze({
    LINEAR: "linear",
    HERMITE: "hermite",
    BEZIER: "bezier",
    CATMULL_ROM: "catmull-rom",
});

class InterpolationExercise extends Exercise {
    static MIN_NUM_POINTS = 4;
    static TEST_ANIMATION_GEOMETRY = new THREE.SphereGeometry(1);
    static TEST_ANIMATION_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x049ef4 });

    /** @type {GUI} */
    #gui = undefined;

    /** @type {TransformControls} */
    #transformControls = undefined;

    #onDownPosition = new THREE.Vector2();
    #onUpPosition = new THREE.Vector2();
    #isPointerDown = false;
    #raycaster = new THREE.Raycaster();

    /** @type {ControlPoint[]} */
    #controlPoints = [];

    /** @type {ControlPoint} */
    #selectedControlPoint = undefined;

    /** @type {THREE.Line} */
    #lineObject = undefined;

    #params = {
        interpolation: InterpolationType.LINEAR,
        interval: 0.1,
        addPoint: () => this.addPointAtRandomPosition(),
        removePoint: () => this.removePoint(),
        startAnimation: () => this.startAnimation(),
    };

    constructor() {
        super();

        this.initUi();
        this.initTransformControls();

        this.#lineObject = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
            color: 0xff0000,
            opacity: 0.35,
        }));
        this.#lineObject.castShadow = true;
        this.#lineObject.frustumCulled = false;
        this.scene.add(this.#lineObject);
    }

    initUi() {
        this.#gui = new GUI();
        this.#gui.add(this.#params, "interpolation", Object.values(InterpolationType)).onChange(() => {
            // detach transform controls, if attached object is not a control point handle
            if (this.#transformControls.object !== undefined
                && !(this.#transformControls.object.userData instanceof ControlPoint)) {
                this.#transformControls.detach();
            }

            this.updateHandleVisibility();
            this.updateCurvePositions();
            this.render();
        });
        this.#gui.add(this.#params, "interval", 0.01, 0.5).step(0.01).onFinishChange(() => {
            this.updateCurvePositions();
            this.render();
        });
        this.#gui.add(this.#params, "addPoint");
        this.#gui.add(this.#params, "removePoint");
        this.#gui.add(this.#params, "startAnimation");
        this.#gui.open();
    }

    initTransformControls() {
        this.#transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.#transformControls.size = 0.5;
        this.#transformControls.addEventListener("change", () => this.render());
        this.#transformControls.addEventListener("dragging-changed", (event) => {
            this.orbitControls.enabled = !event.value; // disable orbit controls while transforming objects
        });
        this.#transformControls.addEventListener("objectChange", () => {
            this.updateTangentLines();
            this.updateCurvePositions();
        });
        this.scene.add(this.#transformControls.getHelper());

        document.addEventListener("pointerdown", (event) => this.onPointerDown(event));
        document.addEventListener("pointerup", (event) => this.onPointerUp(event));
        document.addEventListener("pointermove", (event) => this.onPointerMove(event));
    }

    onPointerDown(event) {
        this.#onDownPosition.x = event.clientX;
        this.#onDownPosition.y = event.clientY;
        this.#isPointerDown = true;
    }

    raycastPointerAgainst(event, objects) {
        const pointer = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        this.#raycaster.setFromCamera(pointer, this.camera);
        const intersects = this.#raycaster.intersectObjects(objects, false);

        // ignore raycast when pointer is down, we are doing something else already (orbit/transform)
        if (intersects.length > 0 && !this.#isPointerDown) {
            return intersects[0].object;
        }
        return undefined;
    }

    updateHandleVisibility() {
        this.#controlPoints.forEach(c => {
            if (c === this.#selectedControlPoint) {
                c.setHermiteTangentVisible(this.#params.interpolation === InterpolationType.HERMITE);
                c.setBezierTangentsVisible(this.#params.interpolation === InterpolationType.BEZIER);
            } else {
                c.setHermiteTangentVisible(false);
                c.setBezierTangentsVisible(false);
            }
        });

    }

    onPointerUp(event) {
        this.#onUpPosition.x = event.clientX;
        this.#onUpPosition.y = event.clientY;
        this.#isPointerDown = false;

        // was click
        if (this.#onDownPosition.distanceTo(this.#onUpPosition) === 0) {
            // clear current selection
            this.#selectedControlPoint = undefined;
            this.#transformControls.detach();

            // raycast against control points
            const objects = this.#controlPoints.map(controlPoint => controlPoint.object);
            const hitObject = this.raycastPointerAgainst(event, objects);
            if (hitObject) {
                // if hit, select control points (shows tangent handles) and attach transform controls
                this.#selectedControlPoint = hitObject.userData;
                this.#transformControls.attach(hitObject);
            }

            this.updateHandleVisibility();
            this.render();
        }
    }

    updateTangentLines() {
        this.#controlPoints.forEach(controlPoint => controlPoint.updateTangentLines());
    }

    onPointerMove(event) {
        if (!this.#selectedControlPoint) {
            return;
        }

        // raycast against handles of selected control point
        const objects = this.#selectedControlPoint.getVisibleHandles();
        const hitObject = this.raycastPointerAgainst(event, objects);
        if (hitObject) {
            // attach transform controls to object hit
            this.#transformControls.attach(hitObject);
        }

        this.render();
    }

    addPointAtRandomPosition() {
        const position = new THREE.Vector3(
            Math.random() * 40 - 20,
            Math.random() * 20,
            Math.random() * 40 - 20,
        );
        this.addPoint(position);
    }

    /**
     * Adds a new point.
     * @param {THREE.Vector3 | undefined} position position of the new point, random if not passed
     */
    addPoint(position) {
        const controlPoint = new ControlPoint(position);
        this.scene.add(controlPoint.object);
        this.#controlPoints.push(controlPoint);

        this.updateCurvePositions();
        this.render();
    }

    /**
     * Removes last point. Does nothing if only MIN_NUM_POINTS remain.
     */
    removePoint() {
        if (this.#controlPoints.length <= InterpolationExercise.MIN_NUM_POINTS) {
            return;
        }

        // remove control point object
        const controlPoint = this.#controlPoints.pop();
        if (this.#transformControls.object === controlPoint.object) {
            this.#transformControls.detach();
        }
        this.scene.remove(controlPoint.object);

        this.updateCurvePositions();
        this.render();
    }

    /**
     * Sample positions along curve with interpolation and interval set via UI
     *
     * @returns {THREE.Vector3[]} sampled points
     */
    sampleCurvePositions() {
        if (this.#params.interpolation === InterpolationType.LINEAR) {
            return interpolateLinear(this.#controlPoints, this.#params.interval);
        } else if (this.#params.interpolation === InterpolationType.HERMITE) {
            return interpolateHermiteSpline(this.#controlPoints, this.#params.interval);
        } else if (this.#params.interpolation === InterpolationType.BEZIER) {
            return interpolateBezierSpline(this.#controlPoints, this.#params.interval);
        } else if (this.#params.interpolation === InterpolationType.CATMULL_ROM) {
            return interpolateCatmullRom(this.#controlPoints, this.#params.interval);
        }
        throw Error("Invalid interpolation type.");
    }

    updateCurvePositions() {
        if (this.#controlPoints.length < 2) {
            return;
        }

        const sampledPositions = this.sampleCurvePositions();

        // copy positions into new GPU buffer
        const bufferAttribute = new THREE.BufferAttribute(new Float32Array(sampledPositions.length * 3), 3);
        sampledPositions.forEach((position, index) => {
            bufferAttribute.setXYZ(index, position.x, position.y, position.z);
        });

        this.#lineObject.geometry.setAttribute("position", bufferAttribute);
    }

    startAnimation() {
        const object = new THREE.Mesh(
            InterpolationExercise.TEST_ANIMATION_GEOMETRY,
            InterpolationExercise.TEST_ANIMATION_MATERIAL
        );
        object.castShadow = true;
        this.scene.add(object);

        let animationStartTime = undefined;

        const animationFrame = (currentTime) => {
            // set start time on first frame
            if (animationStartTime === undefined) {
                animationStartTime = currentTime;
                this.onAnimationStart();
            }

            // update and render
            const elapsedTimeInSeconds = (currentTime - animationStartTime) * 0.001;
            const shouldContinue = this.onAnimationUpdate(elapsedTimeInSeconds, object);
            this.render();

            // continue animation if animation update returned true
            if (shouldContinue) {
                requestAnimationFrame(animationFrame);
                return;
            }

            // cleanup and final render when animation ends
            this.scene.remove(object);
            this.render();
        };
        requestAnimationFrame(animationFrame);
    }

    //TASK5 - begin
    /**
     * This method is called when the animation start button is pressed.
     * Use {@link sampleCurvePositions} to obtain interpolated positions along the curve.
     * You will need to store it in a field, since you need to access it in {@link onAnimationUpdate}.
     * You can precompute and store any other information that is required during the animation here.
     */
    onAnimationStart() {
        // Store the sampled curve positions
        this.animationPositions = this.sampleCurvePositions();

        // Calculate cumulative arc length for constant speed animation
        this.animationArcLengths = [0];
        let totalLength = 0;

        for (let i = 1; i < this.animationPositions.length; i++) {
            const segmentLength = this.animationPositions[i - 1].distanceTo(this.animationPositions[i]);
            totalLength += segmentLength;
            this.animationArcLengths.push(totalLength);
        }

        this.animationTotalLength = totalLength;
        this.animationSpeed = 5; // Units per second - adjust for desired speed
    }

    /**
     * This method is called continously for every frame as long as the animation is running.
     * It receives the elapsed time since animation start in seconds as well as a 3D object.
     * Update the position of the object based on the elapsed time and sampled positions.
     * See the documentation of {@link THREE.Object3D} for more details on how to update the position.
     *
     * The return value of this function determines if the animation should continue running.
     * Return true to continue, return false to stop (i.e. if end of curve was reached).
     *
     * @param {number} elapsedTime time passed since animation start in seconds
     * @param {THREE.Object3D} object object to move along the curve
     * @returns {boolean} true if animation should continue, false if it should stop
     */
    onAnimationUpdate(elapsedTime, object) {
        if (!this.animationPositions || this.animationPositions.length === 0) {
            return false;
        }

        // Calculate the target arc length based on constant speed
        const targetArcLength = elapsedTime * this.animationSpeed;

        // Check if we've reached the end
        if (targetArcLength >= this.animationTotalLength) {
            object.position.copy(this.animationPositions[this.animationPositions.length - 1]);
            return false;
        }

        // Find the segment containing the target arc length using binary search
        let left = 0;
        let right = this.animationArcLengths.length - 1;

        while (left < right - 1) {
            const mid = Math.floor((left + right) / 2);
            if (this.animationArcLengths[mid] <= targetArcLength) {
                left = mid;
            } else {
                right = mid;
            }
        }

        // Interpolate between the two points
        const segmentStart = this.animationArcLengths[left];
        const segmentEnd = this.animationArcLengths[right];
        const segmentLength = segmentEnd - segmentStart;

        if (segmentLength > 0) {
            const t = (targetArcLength - segmentStart) / segmentLength;
            const p0 = this.animationPositions[left];
            const p1 = this.animationPositions[right];

            object.position.lerpVectors(p0, p1, t);
        } else {
            object.position.copy(this.animationPositions[left]);
        }

        return true;
    }
    //TASK5 - end
}

function main() {
    const app = new InterpolationExercise();

    const positions = [
        new THREE.Vector3(10, 15, -1),
        new THREE.Vector3(5, 7.5, 0),
        new THREE.Vector3(-5, 7.5, 0),
        new THREE.Vector3(-10, 15, 1)
    ];
    positions.forEach(pos => app.addPoint(pos));

    app.render();
}

main();