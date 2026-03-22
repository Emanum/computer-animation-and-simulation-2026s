import * as THREE from "three";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import * as math from "mathjs";
import { ExerciseBase as Exercise } from "./base.js";
import { SymbolicMatrix } from "./symbolic-matrix.js";
import { KinematicLinkage } from "./kinematic-linkage.js";

const InverseKinematicsAlgorithm = Object.freeze({
    JACOBIAN_TRANSPOSE: "Jacobian transpose",
    CCD: "CCD",
});

class InverseKinematicExercise extends Exercise {
    static TARGET_OBJECT_GEOMETRY = new THREE.SphereGeometry(1.0);
    static TARGET_OBJECT_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x333333, transparent: true, opacity: 0.5 });

    /** @type {GUI} */
    #gui = undefined;

    /** @type {TransformControls} */
    #transformControls = undefined;

    #onDownPosition = new THREE.Vector2();
    #onUpPosition = new THREE.Vector2();

    /** @type{THREE.Mesg} */
    #targetObject = undefined;

    /** @type{KinematicLinkage} */
    #kinematicLinkage = undefined;

    #params = {
        inverseAlg: InverseKinematicsAlgorithm.JACOBIAN_TRANSPOSE,
        iterations: 1,
        alpha: 0.005,
        continuousUpdate: false,
        runInverseKinematics: () => this.runInverseKinematics(),
    };

    /** @type{Object.<string, number>} */
    #dofValues = {};

    constructor() {
        super();

        this.initTransformControls();
        this.initKinematicLinkage();
        this.initIkTargetObject();
        this.initUi();

        this.render();
    }


    initTransformControls() {
        this.#transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.#transformControls.size = 0.5;
        this.#transformControls.addEventListener("change", () => this.render());
        this.#transformControls.addEventListener("dragging-changed", (event) => {
            this.orbitControls.enabled = !event.value; // disable orbit controls while transforming objects
        });
        this.#transformControls.addEventListener("objectChange", () => {
            if (this.#params.continuousUpdate) {
                this.runInverseKinematics();
            }
        });
        this.scene.add(this.#transformControls.getHelper());

        document.addEventListener("pointerdown", (event) => this.onPointerDown(event));
        document.addEventListener("pointerup", (event) => this.onPointerUp(event));
        document.addEventListener("pointermove", (event) => this.onPointerMove(event));
    }

    initKinematicLinkage() {
        // degrees of freedom, variable names and values
        this.#dofValues = {
            theta1: THREE.MathUtils.degToRad(20),
            theta2: THREE.MathUtils.degToRad(20),
            theta3: THREE.MathUtils.degToRad(20),
            theta4: THREE.MathUtils.degToRad(20),
            theta5: THREE.MathUtils.degToRad(20),
            theta6: THREE.MathUtils.degToRad(45),
        };

        // geometries for link objects
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const coneGeometry = new THREE.ConeGeometry(0.5, 1, 8, 1);
        const sphereGeometry = new THREE.SphereGeometry(1);

        this.#kinematicLinkage = new KinematicLinkage(SymbolicMatrix.createIdentity(4, 4));

        const t1 = SymbolicMatrix.createRotationY("theta1");
        const link1 = createLinkObject(boxGeometry, 0xe41a1c, new THREE.Vector3(0.5, 3, 0.5));
        this.#kinematicLinkage.addLink(t1, "theta1", "Y", link1); // DOF name is needed for symbolic diff, rotation axis is convenient for CCD

        const t2 = SymbolicMatrix.createRotationZ("theta2");
        t2.set(1, 3, 3); // constant translation, can be interpreted as bone length for bone from last joint to this
        const link2 = createLinkObject(boxGeometry, 0x377eb8, new THREE.Vector3(0.5, 3, 0.5));
        this.#kinematicLinkage.addLink(t2, "theta2", "Z", link2);

        const t3 = SymbolicMatrix.createRotationZ("theta3");
        t3.set(1, 3, 3);
        const link3 = createLinkObject(boxGeometry, 0x4daf4a, new THREE.Vector3(0.5, 3, 0.5));
        this.#kinematicLinkage.addLink(t3, "theta3", "Z", link3);

        const t4 = SymbolicMatrix.createRotationZ("theta4");
        t4.set(1, 3, 3);
        const link4 = createLinkObject(boxGeometry, 0x984ea3, new THREE.Vector3(0.5, 3, 0.5));
        this.#kinematicLinkage.addLink(t4, "theta4", "Z", link4);

        const t5 = SymbolicMatrix.createRotationX("theta5");
        t5.set(1, 3, 3);
        const link5 = createLinkObject(coneGeometry, 0xff7f00, new THREE.Vector3(0.5, 3, 0.5));
        this.#kinematicLinkage.addLink(t5, "theta5", "X", link5);

        const t6 = SymbolicMatrix.createRotationY("theta6");
        t6.set(1, 3, 3);
        const endEffector = createLinkObject(sphereGeometry, 0xff0000, new THREE.Vector3(0.2, 0.2, 0.2), false);
        this.#kinematicLinkage.addLink(t6, "theta6", "Y", endEffector);

        this.#kinematicLinkage.init(); // precompute reference frames, end effector function and jacobian symbolically
        this.#kinematicLinkage.forward(this.#dofValues); // set pose of linkage by specifying a value for each degree of freedom

        this.scene.add(this.#kinematicLinkage.rootObject);
    }

    initIkTargetObject() {
        this.#targetObject = new THREE.Mesh(
            InverseKinematicExercise.TARGET_OBJECT_GEOMETRY,
            InverseKinematicExercise.TARGET_OBJECT_MATERIAL
        );
        this.#targetObject.castShadow = true;
        this.#targetObject.receiveShadow = true;
        this.#targetObject.position.set(7, 7, 7);
        this.scene.add(this.#targetObject);
    }

    initUi() {
        this.#gui = new GUI();
        this.#gui.add(this.#params, "inverseAlg", Object.values(InverseKinematicsAlgorithm)).onFinishChange(() => {
            this.runInverseKinematics();
        });
        this.#gui.add(this.#params, "iterations", 1, 50).step(1).onFinishChange(() => {
            this.render();
        });
        this.#gui.add(this.#params, "alpha", 0.0001, 0.1).step(0.0005).onFinishChange(() => {
            this.render();
        });
        this.#gui.add(this.#params, "continuousUpdate").onFinishChange(() => {
            if (this.#params.continuousUpdate) {
                this.runInverseKinematics();
            }
        });
        this.#gui.add(this.#params, "runInverseKinematics");
        const dofFolder = this.#gui.addFolder("Degrees of freedom [angle, rad]").close();
        Object.keys(this.#dofValues).forEach(dofName => dofFolder.add(this.#dofValues, dofName, 0, 2 * Math.PI));
        dofFolder.onChange(event => {
            this.#dofValues[event.property] = event.value;
            this.#kinematicLinkage.forward(this.#dofValues);
        });
        this.#gui.open();
    }

    updateDofDisplay() {
        this.#gui.folders[0].controllers.forEach(controller => controller.updateDisplay());
    }

    onPointerDown(event) {
        this.#onDownPosition.x = event.clientX;
        this.#onDownPosition.y = event.clientY;
    }

    onPointerUp(event) {
        this.#onUpPosition.x = event.clientX;
        this.#onUpPosition.y = event.clientY;

        // was click, deselect target point
        if (this.#onDownPosition.distanceTo(this.#onUpPosition) === 0) {
            this.#transformControls.detach();
            this.render();
        }
    }

    onPointerMove(event) {
        // raycast against target object
        const hitObject = this.raycastPointerAgainst(event, [this.#targetObject]);
        if (hitObject) {
            // attach transform controls to object hit
            this.#transformControls.attach(hitObject);
        }

        this.render();
    }

    runInverseKinematics() {
        const position = this.#targetObject.position.clone();

        // compute new values for DOFs based on selected IK algorithm
        let newValues = undefined;
        if (this.#params.inverseAlg === InverseKinematicsAlgorithm.JACOBIAN_TRANSPOSE) {
            newValues = this.#kinematicLinkage.jacobianTransposeMethod(this.#dofValues, position, this.#params.iterations, this.#params.alpha);
        } else if (this.#params.inverseAlg === InverseKinematicsAlgorithm.CCD) {
            newValues = this.#kinematicLinkage.cyclicCoordinateDescentMethod(this.#dofValues, position, this.#params.iterations);
        } else {
            throw new Error("Unknown IK algorithm name");
        }

        // set pose for linkage with new values
        this.#kinematicLinkage.forward(newValues);

        // update values in object - cannot just reassign object because UI uses reference to old object
        Object.keys(newValues).forEach(dofName => this.#dofValues[dofName] = newValues[dofName]);
        this.updateDofDisplay();

        this.render();
    }

}

/**
 * Convenience method for creating objects representing links in a kinematic linkage.
 * 
 * @param {THREE.BufferGeometry} geometry object geometry
 * @param {THREE.Material} material object material
 * @param {THREE.Vector3} scale scale of the object, y position is set to scale.y/2
 * @returns {THREE.Object3D}
 */
function createLinkObject(geometry, color, scale, adjustPosition = true) {
    const material = new THREE.MeshLambertMaterial({ color: color, transparent: false, opacity: 0.5 });
    material.wireframe = true;
    const obj = new THREE.Mesh(geometry, material);
    if (adjustPosition) {
        obj.position.set(0, scale.y / 2, 0);
    }
    obj.scale.copy(scale);
    obj.castShadow = true;
    return obj;
}


function main() {
    const app = new InverseKinematicExercise(math);
    app.render();
}

main();