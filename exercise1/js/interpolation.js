import * as THREE from "three";
import {ControlPoint} from "./control-point.js";

//TASK1 - begin
/**
 * This function receives a list of control points and an interval at which the function should be sampled.
 * Control points is a list of @type{ControlPoint} objects, each of which has a position and tangent vectors.
 *
 * (one dimensional) Example: if there are 3 control points at positions x=0, x=2 and x=3,
 * with an interval of 0.1 the result would be [0, 0.2, 0.4, 0.6, 0.8, 1, ..., 2, 2.1, 2.2,...3]
 *
 * So “density” = how small interval is:
 * smaller interval -> more sampled points (denser curve)
 * larger interval -> fewer sampled points (coarser curve)
 *
 * Interval is relative (parametric), not absolute world-space distance.
 * t = 0 => start of segment
 * t = 1 => end of segment
 * So:
 * interval = 0.1 means “10% steps along EACH segment parameter,”
 *
 * @param {ControlPoint[]} points list of control points
 * @param {number} interval sampling interval
 * @returns {THREE.Vector3[]} sampled points along the curve
 */
export function interpolateLinear(points, interval) {
    if (interval == null || interval <= 0) {
        //avoid divide by 0
        return [];
    }
    //we need at least 2 control points otherwise it makes no sense
    if (points.length < 2) {
        return [];
    }

    let res = [];

    // Each Segment is looped over exactly once, independent of the interval
    // We iterate over each segment (Control point 0->1; 1->2 etc.)
    // points.length - 1 cause the endPoint needs to fit into the range.
    for (let i = 0; i < points.length - 1; i++) {
        let startPoint = points[i].position;
        let endPoint = points[i + 1] ? points[i + 1].position : undefined;

        // Now based on the interval we calculate the number of steps we need to take for this segment.
        // We do NOT use the distance between the start and end point, as interval is relative, not absolute.
        let nOfStepsPerSegment = Math.ceil(1 / interval);

        for (let j = 0; j < nOfStepsPerSegment; j++) {
            let percentageToEnd = 1 / nOfStepsPerSegment * j; // percentage of the way we are along the segment (0.1, 0.2, 0.3 etc.)
            let percentageToStart = 1 - percentageToEnd; // percentage of the way we are along the segment (0.9, 0.8, 0.7 etc.)


            res.push(new THREE.Vector3(
                percentageToStart * startPoint.x + percentageToEnd * endPoint.x,
                percentageToStart * startPoint.y + percentageToEnd * endPoint.y,
                percentageToStart * startPoint.z + percentageToEnd * endPoint.z,
            ));
        }
    }

    // Add the last control point (start is indirectly included by first loop)
    res.push(points[points.length - 1].position.clone());

    return res;
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