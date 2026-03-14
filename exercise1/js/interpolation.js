import * as THREE from "three";
import { ControlPoint } from "./control-point.js";

//TASK1 - begin
/**
 * This function receives a list of control points and an interval at which the function should be sampled.
 * Control points is a list of @type{ControlPoint} objects, each of which has a position and tangent vectors.
 * 
 * (one dimensional) Example: if there are 3 control points at positions x=0, x=2 and x=3,
 * with an interval of 0.1 the result would be [0, 0.2, 0.4, 0.6, 0.8, 1, ..., 2, 2.1, 2.2,...3]
 * 
 * @param {ControlPoint[]} points list of control points
 * @param {number} interval sampling interval
 * @returns {THREE.Vector3[]} sampled points along the curve
 */
export function interpolateLinear(points, interval) {
    if (points.length < 2) return [];
    const result = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i].position;
        const p1 = points[i + 1].position;
        for (let t = 0; t < 1; t += interval) {
            result.push(new THREE.Vector3().lerpVectors(p0, p1, t));
        }
    }
    result.push(points[points.length - 1].position.clone());
    return result;
}
//TASK1 - end

//TASK2 - begin
/**
 * Same as in TASK1 except this time, the interpolation should be based on a cubic hermite spline.
 * See the lecture book on how to calculate the spline (or use whatever resources you prefer).
 * 
 * The hermite spline needs a tangent which is already part of the @type{ControlPoint} class 
 * as property {@link ControlPoint#tangentHermite}.
 * 
 * This problem can be solved with around 15-20 lines of code.
 * 
 * @param {ControlPoint[]} points control points
 * @param {number} interval sampling interval
 * @returns {THREE.Vector3[]} sampled points along the curve
 */
export function interpolateHermiteSpline(points, interval) {
    if (points.length < 2) return [];
    const result = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i].position;
        const p1 = points[i + 1].position;
        const m0 = points[i].tangentHermite;
        const m1 = points[i + 1].tangentHermite;

        for (let t = 0; t < 1; t += interval) {
            const t2 = t * t;
            const t3 = t2 * t;
            const h00 = 2*t3 - 3*t2 + 1;
            const h10 = t3 - 2*t2 + t;
            const h01 = -2*t3 + 3*t2;
            const h11 = t3 - t2;

            result.push(new THREE.Vector3()
                .addScaledVector(p0, h00)
                .addScaledVector(m0, h10)
                .addScaledVector(p1, h01)
                .addScaledVector(m1, h11));
        }
    }
    result.push(points[points.length - 1].position.clone());
    return result;
}
//TASK2 - end

//TASK3 - begin
/**
 * Implement Bezier interpolation. The @type{ControlPoint} class has properties
 * {@link ControlPoint#tangentBezierForward} and {@link ControlPoint#tangentBezierForward}.
 * 
 * @param {ControlPoint[]} points control points
 * @param {number} interval sampling interval
 * @returns {THREE.Vector3[]} sampled points along the curve
 */
export function interpolateBezierSpline(points, interval) {
    if (points.length < 2) return [];
    const result = [];
    for (let i = 0; i < points.length - 1; i++) {
        // P0 and P3 are the endpoint positions
        const P0 = points[i].position;
        const P3 = points[i + 1].position;
        // P1 and P2 are world-space control points derived from the local tangent handles
        const P1 = P0.clone().add(points[i].tangentBezierForward);
        const P2 = P3.clone().add(points[i + 1].tangentBezierBackward);

        for (let t = 0; t < 1; t += interval) {
            const mt = 1 - t;
            result.push(new THREE.Vector3()
                .addScaledVector(P0, mt * mt * mt)
                .addScaledVector(P1, 3 * mt * mt * t)
                .addScaledVector(P2, 3 * mt * t * t)
                .addScaledVector(P3, t * t * t));
        }
    }
    result.push(points[points.length - 1].position.clone());
    return result;
}
//TASK3 - end

//TASK4 - begin
/**
 * Finally implement Catmull-Rom spline interpolation.
 *
 * @param {ControlPoint[]} points control points
 * @param {number} interval sampling interval
 * @returns {THREE.Vector3[]} sampled points along the curve
 */
export function interpolateCatmullRom(points, interval) {
    if (points.length < 4) return [];
    const result = [];
    // Segments run from index 1 to index n-2; first and last sections are ignored
    for (let i = 1; i < points.length - 2; i++) {
        const pPrev = points[i - 1].position;
        const p0 = points[i].position;
        const p1 = points[i + 1].position;
        const pNext = points[i + 2].position;

        // Catmull-Rom tangents: m_i = (p_{i+1} - p_{i-1}) / 2
        const m0 = p1.clone().sub(pPrev).multiplyScalar(0.5);
        const m1 = pNext.clone().sub(p0).multiplyScalar(0.5);

        for (let t = 0; t < 1; t += interval) {
            const t2 = t * t;
            const t3 = t2 * t;
            const h00 = 2*t3 - 3*t2 + 1;
            const h10 = t3 - 2*t2 + t;
            const h01 = -2*t3 + 3*t2;
            const h11 = t3 - t2;

            result.push(new THREE.Vector3()
                .addScaledVector(p0, h00)
                .addScaledVector(m0, h10)
                .addScaledVector(p1, h01)
                .addScaledVector(m1, h11));
        }
    }
    // Add the last point of the last processed segment.
    // Note: per the task description, the first and last segments are intentionally skipped
    // for Catmull-Rom, so the curve spans from points[1] to points[n-2].
    result.push(points[points.length - 2].position.clone());
    return result;
}
//TASK4 - end