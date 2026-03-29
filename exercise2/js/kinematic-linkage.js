import * as math from "mathjs";
import * as THREE from "three";
import { SymbolicMatrix } from "./symbolic-matrix.js";


export class KinematicLinkage {
    static END_EFFECTOR_GEOMETRY = new THREE.SphereGeometry(0.5);
    static END_EFFECTOR_MATERIAL = new THREE.MeshLambertMaterial({ color: 0xdd0000 });

    /** @type{THREE.Object3D} */
    rootObject = undefined;

    /**
     * 3D objects representing coordinate frames oxyz within the scene.
     * @type{THREE.Object3D[]}
     */
    coordinateFrameObjects = [];

    /**
     * Transformations representing joints.
     * @type{SymbolicMatrix[]}
     */
    transformations = [];

    /**
     * Base coordinate frame.
     * @type{SymbolicMatrix}
     */
    oxyz_0 = undefined;

    /**
     * Contains local coordinate frames oxyz for all joints.
     * @type{SymbolicMatrix[]}
     */
    localCoordinateFrames = undefined;

    /** 
     * Stores a 3D symbolic column vector representing the end effector position.
     * @type{SymbolicMatrix}
     */
    endEffectorPos = undefined;

    /**
     * Jacobian of {@link endEffectorPos}.
     * @type{SymbolicMatrix}
     */
    jacobian = undefined;

    /** 
     * Names of the degrees-of-freedom of the linkage. We assume, each transformation has exactly one degree of freedom.
     * @type{string[]}
     */
    dofNames = [];

    /**
     * Names of the rotation axis. Convenient for the CCD implementation. Same size as {@link dofNames}.
     * @type{string[]}
     */
    rotationAxes = [];

    /**
     * Constructs a new kinematic linkage with a specified base coordinate frame.
     * @param {SymbolicMatrix} oxyz_0 base coordinate frame
     */
    constructor(oxyz_0) {
        this.oxyz_0 = oxyz_0;
        this.rootObject = new THREE.Object3D();
        this.rootObject.matrixAutoUpdate = false;

        const baseResults = oxyz_0.evaluate({}, "arrayFlat");
        this.rootObject.matrix.set(...baseResults);

        this.#addAxisHelper();
    }

    /**
     * Adds a joint (transformation represented by symbolic matrix) and a link (represented by 3d object)
     * to this linkage.
     * We assume exactly one degree of freedom (variable) in the transformation. The name of this variable,
     * while occuring in the entries of the matrix, must also be passed here.
     * Rotation axis is specified additionally, so that we dont need to extract it from the matrix later (for CCD).
     * Technically, this is redundant (and yes, for CCD, it would more be convenient to use quaternions here).
     * 
     * @param {SymbolicMatrix} transformation transformation for the joint, we assume exactly one variable
     * @param {string} dofName name of the dof (variable) in transformation
     * @param {string} rotationAxis either "X", "Y" or "Z"
     * @param {THREE.Object3D} object representation of the link in the 3d scene
     */
    addLink(transformation, dofName, rotationAxis, object) {
        this.transformations.push(transformation);
        this.dofNames.push(dofName);
        this.rotationAxes.push(rotationAxis);
        this.#addAxisHelper();
        this.coordinateFrameObjects[this.coordinateFrameObjects.length - 1].add(object);
    }

    #addAxisHelper() {
        const coordinateFrameObject = new THREE.AxesHelper(1); // axes helper is just an object with colored lines per axis
        coordinateFrameObject.matrixAutoUpdate = false;
        this.coordinateFrameObjects.push(coordinateFrameObject);
        this.rootObject.add(coordinateFrameObject);
    }

    /**
     * Called after adding links to initialize (symbolic) coordinate frames,
     * (symbolic) effector position and (symbolic) jacobian.
     * These depend on the link configuration only, so we can precompute them once at the start
     * and then just evalute as symbolic expressions later.
     */
    init() {
        this.initCoordinateFrames();
        this.initJacobian();
    }

    //TASK1 - begin
    /*
     * Forward kinematics is split into two steps.
     *  1. Compute coordinate frames oxyz_i symbolically - can be done once at beginning, after joints/links are specified.
     *     The result are matrices, where the entries are expressions containing our degree of freedom variables.
     *
     *  2. Set pose by evaluating coordinate frame with specified values
     *     Values are substituted for the variables (DOFs) and the expressions are evaluated. Result are real (numeric) matrices.
     */
    /**
     * Compute coordinate frames symbolically.
     * Here you want to use the base coordinate frame {@link oxyz_0}
     * and the transformations {@link transformations} to compute the coordinate frame
     * for each joint and and store them in the list {@link localCoordinateFrames}.
     * 
     * You can use {@link SymbolicMatrix.multiplyMatrices} to symbolically multiply two (symbolic) matrices.
     * See slides and matlab example for more details.
     */
    initCoordinateFrames() {
        //     Start a list of symbolic frames with the base frame ({}^{W}T_0).
        //     Iterate through transformations in chain order.
        //     For each joint, compute next frame by symbolic multiplication of previous world frame and current joint transform.
        //     Store all resulting symbolic frames in localCoordinateFrames.
        // oxyz_0 is the base transform (world to base)
        this.localCoordinateFrames = [];
        this.localCoordinateFrames.push(this.oxyz_0);
        let j = 1;
        for (let i = 0; i < this.transformations.length; i++) {
            const prevFrame = this.localCoordinateFrames[j - 1];
            this.localCoordinateFrames[j] = SymbolicMatrix.multiplyMatrices(prevFrame, this.transformations[i]);
            j++;
        }
        // Your code here
        // this.localCoordinateFrames = [this.oxyz_0];
    }

    /**
     * Sets pose of linkage by evaluating each coordinate frame with given DOF values and updating their respective object.
     * 
     * Evaluate the symbolic coordinate frames you stored in {@link localCoordinateFrames} and
     * update each corresponding object representing the coordinate frame within the scene, contained in {@link coordinateFrameObjects}.
     * 
     * You can use {@link SymbolicMatrix.evaluate} to substitute values and evaluate the expressions in a symbolic matrix.
     * 
     * @param {Object.<string, number>} degreesOfFreedom values for all degree-of-freedom variables
     */
    forward(degreesOfFreedom) {
        for (let i = 0; i < this.localCoordinateFrames.length; i++) {
            let resolvedMat4= this.localCoordinateFrames[i].evaluate(degreesOfFreedom, "arrayFlat");
            this.coordinateFrameObjects[i].matrix.set(...resolvedMat4);
        }
    }
    //TASK1 - end

    //TASK2 - begin
    /**
     * Compute the function for the end effector position of the kinematic linkage (symbolically).
     * Then compute its Jacobian. You may use {@link SymbolicMatrix.computeJacobian}.
     * Save both, the end effector position function and the Jacobian in the fields
     * {@link endEffectorPos} and {@link jacobian} respectively.
     * 
     * The names of the DOF variables are contained in the field {@link dofNames}.
     * These are the variables you need to differentiate the end effector position function by to get the Jacobian.
     * 
     * For more details see slides.
     */
    initJacobian() {
        // Your code here
        this.endEffectorPos = SymbolicMatrix.createZeros(3, 1);
        this.jacobian = SymbolicMatrix.createZeros(3, this.dofNames.length);
    }

    /**
     * Implement the Jacobian transpose method.
     * 
     * The Jacobian tranpose method minimizes the squared distance of the end effector position to
     * some target position (called error) using gradient descent.
     * 
     * We start with some DOF values "theta_0" and in each iterator, we update these values
     * such that the error becomes smaller:
     * 
     *     theta_{k+1} = theta_k + Δtheta
     * 
     * In each iteration, you will need to compute values Δtheta that are added to each DOF value.
     * These values are given by 
     * 
     *     Δtheta = alpha * J^T * (e* - f(theta_k))
     * 
     * where alpha is the step length
     *       J^T is the tranpose of the Jacobian, with shape numDOFs x 3
     *       e* is the target position, with shape 3 x 1
     *       f(theta_k) is the end effector position evaluated with the current values for theta (with shape 3 x 1)
     * 
     * For more details about the theory, see slides.
     * 
     * Return an object containing the DOF variable names as keys and its values as values.
     * 
     * Implementation hints:
     * - You can get the tranpose of a symbolic matrix using {@link SymbolicMatrix.getTranspose}.
     * - Since the tranpose of the Jacobian is a matrix with shape numDOFs x 3, we need general matrix multiplication to compute Δtheta.
     *   Unfortunately, THREE.js only supports 2x2, 3x3 and 4x4 matrix multiplication. Instead, we use math.js.
     *   You can get the results of {@link SymbolicMatrix.evaluate} directly as math.matrix when passing "mathjsMatrix" as type.
     * - See https://mathjs.org/docs/datatypes/matrices.html for details on how to use math.js to perform matrix computations.
     * 
     * @param {Object.<string, number>} dofValues initial DOF values
     * @param {THREE.Vector3} targetPos a 3d column vector containing the target position
     * @param {number} numIterations number of iterations of gradient descent
     * @param {number} alpha step length
     * @returns {Object.<string, number>} new DOF values after gradient descent
     */
    jacobianTransposeMethod(dofValues, targetPos, numIterations = 30, alpha = 0.001) {
        const target = math.matrix([[targetPos.x], [targetPos.y], [targetPos.z]]);
        let outputValues = structuredClone(dofValues);
        //Your code here
        return outputValues;
    }
    //TASK2 - end

    //TASK3 - begin
     /**
     * Implement the Cyclic Coordinate Descent (CCD).
     * 
     * The general idea of CCD for IK is simple.
     * For each joint, we align the direction to the end effector with the direction to the target position, starting from the tip.
     * Then we repeat for number of iterations or until we converge. Each iteration adapts all joints once.
     *
     * There are various ways to implement this in 3D. If there are constraints, it gets a little bit more complex.
     * However, for this task, we assume our joints are only rotations around the local x, y or z axis.
     * With this assumption, the problem can be reduced to 2D. It works like this:
     * 
     * For each joint:
     *   - Compute direction from joint to end effector and to target position
     *   - Transform directions to local space of joint (extract joint rotation, invert = transpose, multiply with directions)
     *   - Project directions to plane perpendicular to rotation axis - now we are in 2D!
     *   - Compute angle between directions in 2D
     *   - Correct DOF value by this angle
     * 
     * Using a maximum for the angle adjustment usually leads to slightly better results (motion more balenced between joints),
     * for example, adjusting at most by 10° at time - experiment with this!
     * 
     * Return an object containing the DOF variable names as keys and its values as values.
     * 
     * Implementation hints:
     * - We don't need general matrix multiplication here, so you may use THREE.js' matrix/vector classes or math.js, whatever you prefer.
     * - Instead of extracting the rotation axis for each joint from the corresponding transformation matrix, use {@link rotationAxes}.
     *   For each joint, it stores a string indicating its rotation axis ("X", "Y" or "Z").
     *   This is redundant and solely done for convenience. Storing the rotation in quaternions would be better for CCD
     *   (but makes Jacobian transpose more complex, so we stick to matrices).
     * - Our approach with the 2D projection is one way to solve CCD in 3D. Feel free to implement it another way.
     * - You can you use {@link THREE.ArrowHelper} for (visual) debugging. For convenience, we also provide {@link addDebugArrow}.
     * 
     * @param {Object.<string, number>} dofValues initial DOF values
     * @param {THREE.Vector3} targetPos a 3d column vector containing the target position
     * @param {number} numIterations number of iterations
     * @returns {Object.<string, number>} new DOF values
     */
    cyclicCoordinateDescentMethod(dofValues, targetPos, numIterations = 5) {
        let outputValues = structuredClone(dofValues);
        // Your code here
        return outputValues;
    }
    //TASK3 - end

    addDebugArrow(origin, dir, color) {
        const arrow = new THREE.ArrowHelper(dir.clone().normalize(), origin, dir.length(), color);
        this.rootObject.add(arrow);
    }
}
