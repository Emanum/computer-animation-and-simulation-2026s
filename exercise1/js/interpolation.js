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
    // Your code here
    return [];
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
    // Your code here
    return [];
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
    // Your code here
    return [];
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
    // Your code here
    return [];
}
//TASK4 - end