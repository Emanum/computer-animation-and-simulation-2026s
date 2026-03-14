import * as THREE from "three";

/**
 * Represents a curve control points. Contains getters for position and tangent vectors.
 * 
 * @property {THREE.Vector3} position - see {@link ControlPoint#position}
 * @property {THREE.Vector3} tangentHermite - see {@link ControlPoint#tangentHermite}
 * @property {THREE.Vector3} tangentBezierFwd - see {@link ControlPoint#tangentBezierForward}
 * @property {THREE.Vector3} tangentBezierBwd - see {@link ControlPoint#tangentBezierBackward}
 */
export class ControlPoint {
    static CONTROL_POINT_GEOMETRY = new THREE.SphereGeometry(0.75);
    static CONTROL_POINT_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x333333, transparent: true, opacity: 0.5 });
    static TANGENT_POINT_GEOMETRY = new THREE.BoxGeometry(0.5, 0.5, 0.5);

    /** @type {THREE.Mesh} */
    object = undefined;

    #tangentHandleHermite = undefined;
    #tangentLineHermite = undefined;
    #tangentHandleBezierFwd = undefined;
    #tangentLineBezierFwd = undefined;
    #tangentHandleBezierBwd = undefined;
    #tangentLineBezierBwd = undefined;

    constructor(position) {
        this.object = new THREE.Mesh(ControlPoint.CONTROL_POINT_GEOMETRY, ControlPoint.CONTROL_POINT_MATERIAL);
        this.object.castShadow = true;
        this.object.receiveShadow = true;
        this.object.userData = this;
        this.object.position.copy(position);

        [this.#tangentHandleHermite, this.#tangentLineHermite] = this.#addTangentHandleAndLine(new THREE.Vector3(-200/50, 0, 0), 0x1b9e77);
        [this.#tangentHandleBezierFwd, this.#tangentLineBezierFwd] = this.#addTangentHandleAndLine(new THREE.Vector3(-100/50, 0, 0), 0xd95f02);
        [this.#tangentHandleBezierBwd, this.#tangentLineBezierBwd] = this.#addTangentHandleAndLine(new THREE.Vector3(100/50, 0, 0), 0x7570b3);

        this.setHermiteTangentVisible(false);
        this.setBezierTangentsVisible(false);
    }

    #addTangentHandleAndLine(handlePosition, color) {
        const handle = new THREE.Mesh(
            ControlPoint.TANGENT_POINT_GEOMETRY,
            new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: 0.75, wireframe: true },
        ));
        this.object.add(handle);
        handle.position.add(handlePosition);
        const line = ControlPoint.#createLineObject(new THREE.Vector3(), handle.position, color);
        this.object.add(line);
        return [handle, line];
    }

    updateTangentLines() {
        ControlPoint.#updateLineEndPosition(this.#tangentLineHermite, this.#tangentHandleHermite.position);
        ControlPoint.#updateLineEndPosition(this.#tangentLineBezierFwd, this.#tangentHandleBezierFwd.position);
        ControlPoint.#updateLineEndPosition(this.#tangentLineBezierBwd, this.#tangentHandleBezierBwd.position);
    }

    setHermiteTangentVisible(visible) {
        this.#tangentHandleHermite.visible = visible;
        this.#tangentLineHermite.visible = visible;
    }

    setBezierTangentsVisible(visible) {
        this.#tangentHandleBezierFwd.visible = visible;
        this.#tangentHandleBezierBwd.visible = visible;
        this.#tangentLineBezierFwd.visible = visible;
        this.#tangentLineBezierBwd.visible = visible;
    }

    getVisibleHandles() {
        return [this.object, this.#tangentHandleHermite, this.#tangentHandleBezierBwd, this.#tangentHandleBezierFwd]
            .filter(o => o.visible);
    }

    /** @returns {THREE.Vector3} position of control point */
    get position() {
        return this.object.position;
    }

    /** @returns {THREE.Vector3} tangent for hermite interpolation */
    get tangentHermite() {
        return this.#tangentHandleHermite.position.clone();
    }

    /** @returns {THREE.Vector3} forward tangent for cubic bezier interpolation */
    get tangentBezierForward() {
        return this.#tangentHandleBezierFwd.position.clone();
    }

    /** @returns {THREE.Vector3} backward tengent for cubic bezier interpolation */
    get tangentBezierBackward() {
        return this.#tangentHandleBezierBwd.position.clone();
    }

    /**
     * Creates line object with points pos1 and pos2.
     * @param {THREE.Vector3} pos1 
     * @param {THREE.Vector3} pos2
     * @param {THREE.Color} color 
     * @returns {THREE.Line}
     */
    static #createLineObject(pos1, pos2, color) {
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([pos1, pos2]),
            new THREE.LineBasicMaterial({ color: color }),
        );
        line.frustumCulled = false;
        return line;
    }

    /**
     * Sets second point of line to position.
     * @param {THREE.Line} line 
     * @param {THREE.Vector3} position 
     */
    static #updateLineEndPosition(line, position) {
        const positionAttribute = line.geometry.getAttribute("position");
        positionAttribute.setXYZ(1, position.x, position.y, position.z);
        positionAttribute.needsUpdate = true;
    }
}
