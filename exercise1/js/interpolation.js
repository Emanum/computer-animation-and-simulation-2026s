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
    if (points.length < 2) {
        return [];
    }

    const result = [];

    // Iterate through each segment between consecutive control points
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i].position;
        const p1 = points[i + 1].position;

        // Calculate the distance between the two points
        const distance = p0.distanceTo(p1);

        // Calculate the number of samples needed for this segment
        const numSamples = Math.ceil(distance / interval);

        // Sample along the segment
        for (let j = 0; j < numSamples; j++) {
            const t = j / numSamples;

            // Linear interpolation formula: P(t) = (1-t)*P0 + t*P1
            const point = new THREE.Vector3(
                (1 - t) * p0.x + t * p1.x,
                (1 - t) * p0.y + t * p1.y,
                (1 - t) * p0.z + t * p1.z
            );

            result.push(point);
        }
    }

    // Add the last control point
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
    if (points.length < 2) {
        return [];
    }

    const result = [];

    // Iterate through each segment between consecutive control points
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i].position;
        const p1 = points[i + 1].position;

        // Get tangent vectors (in absolute/world space)
        const m0 = points[i].tangentHermite;
        const m1 = points[i + 1].tangentHermite;

        // Calculate the distance to determine number of samples
        const distance = p0.distanceTo(p1);
        const numSamples = Math.ceil(distance / interval);

        // Sample along the segment
        for (let j = 0; j < numSamples; j++) {
            const t = j / numSamples;
            const t2 = t * t;
            const t3 = t2 * t;

            // Hermite basis functions
            const h00 = 2 * t3 - 3 * t2 + 1;
            const h10 = t3 - 2 * t2 + t;
            const h01 = -2 * t3 + 3 * t2;
            const h11 = t3 - t2;

            // Hermite interpolation formula: P(t) = h00*p0 + h10*m0 + h01*p1 + h11*m1
            const point = new THREE.Vector3(
                h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x,
                h00 * p0.y + h10 * m0.y + h01 * p1.y + h11 * m1.y,
                h00 * p0.z + h10 * m0.z + h01 * p1.z + h11 * m1.z
            );

            result.push(point);
        }
    }

    // Add the last control point
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
    if (points.length < 2) {
        return [];
    }

    const result = [];

    // Iterate through each segment between consecutive control points
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i].position;
        const p1 = points[i + 1].position;

        // Bezier control points: p0, p0 + tangentForward, p1 + tangentBackward, p1
        const c0 = p0;
        const c1 = p0.clone().add(points[i].tangentBezierForward);
        const c2 = p1.clone().add(points[i + 1].tangentBezierBackward);
        const c3 = p1;

        // Calculate the distance to determine number of samples
        const distance = p0.distanceTo(p1);
        const numSamples = Math.ceil(distance / interval);

        // Sample along the segment
        for (let j = 0; j < numSamples; j++) {
            const t = j / numSamples;
            const t2 = t * t;
            const t3 = t2 * t;
            const oneMinusT = 1 - t;
            const oneMinusT2 = oneMinusT * oneMinusT;
            const oneMinusT3 = oneMinusT2 * oneMinusT;

            // Cubic Bezier formula: P(t) = (1-t)³*c0 + 3(1-t)²t*c1 + 3(1-t)t²*c2 + t³*c3
            const point = new THREE.Vector3(
                oneMinusT3 * c0.x + 3 * oneMinusT2 * t * c1.x + 3 * oneMinusT * t2 * c2.x + t3 * c3.x,
                oneMinusT3 * c0.y + 3 * oneMinusT2 * t * c1.y + 3 * oneMinusT * t2 * c2.y + t3 * c3.y,
                oneMinusT3 * c0.z + 3 * oneMinusT2 * t * c1.z + 3 * oneMinusT * t2 * c2.z + t3 * c3.z
            );

            result.push(point);
        }
    }

    // Add the last control point
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
    if (points.length < 4) {
        return [];
    }

    const result = [];

    // Catmull-Rom splines need 4 control points for each segment
    // We skip the first and last segments as per instructions
    for (let i = 1; i < points.length - 2; i++) {
        const p0 = points[i - 1].position;
        const p1 = points[i].position;
        const p2 = points[i + 1].position;
        const p3 = points[i + 2].position;

        // Calculate the distance to determine number of samples
        const distance = p1.distanceTo(p2);
        const numSamples = Math.ceil(distance / interval);

        // Sample along the segment between p1 and p2
        for (let j = 0; j < numSamples; j++) {
            const t = j / numSamples;
            const t2 = t * t;
            const t3 = t2 * t;

            // Catmull-Rom basis matrix coefficients
            // P(t) = 0.5 * [ 1 t t² t³ ] * M * [p0 p1 p2 p3]^T
            // where M is the Catmull-Rom matrix
            const c0 = -t3 + 2 * t2 - t;
            const c1 = 3 * t3 - 5 * t2 + 2;
            const c2 = -3 * t3 + 4 * t2 + t;
            const c3 = t3 - t2;

            const point = new THREE.Vector3(
                0.5 * (c0 * p0.x + c1 * p1.x + c2 * p2.x + c3 * p3.x),
                0.5 * (c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y),
                0.5 * (c0 * p0.z + c1 * p1.z + c2 * p2.z + c3 * p3.z)
            );

            result.push(point);
        }
    }

    // Add the second-to-last control point (the last point of the last interpolated segment)
    if (points.length >= 3) {
        result.push(points[points.length - 2].position.clone());
    }

    return result;
}
//TASK4 - end