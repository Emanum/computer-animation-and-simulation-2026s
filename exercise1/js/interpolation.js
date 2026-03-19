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
        let p0 = points[i];
        let p1 = points[i + 1];
        let nOfStepsPerSegment = Math.ceil(1 / interval);

        for (let j = 0; j < nOfStepsPerSegment; j++) {
            let t = 1 / nOfStepsPerSegment * j;

            //wikipedia
            //On the unit interval from 0 to 1, given a starting point p0 at t = 0 and an ending point p1 at t = 1, with starting tangent m0 at t = 0 and ending tangent m1 at t = 1, the polynomial is defined as
            //p(t) = (2t^3 - 3t^2 + 1)p0 + (t^3 - 2t^2 + t)m0 + (-2t^3 + 3t^2)p1 + (t^3 - t^2)m1, where t is in [0, 1].
            // This cubic Hermite form guarantees that the curve passes through p0 and p1 and matches the endpoint tangents m0 and m1.

            let x = (2 * t ** 3 - 3 * t ** 2 + 1) * p0.position.x + (t ** 3 - 2 * t ** 2 + t) * p0.tangentHermite.x + (-2 * t ** 3 + 3 * t ** 2) * p1.position.x + (t ** 3 - t ** 2) * p1.tangentHermite.x;
            let y = (2 * t ** 3 - 3 * t ** 2 + 1) * p0.position.y + (t ** 3 - 2 * t ** 2 + t) * p0.tangentHermite.y + (-2 * t ** 3 + 3 * t ** 2) * p1.position.y + (t ** 3 - t ** 2) * p1.tangentHermite.y;
            let z = (2 * t ** 3 - 3 * t ** 2 + 1) * p0.position.z + (t ** 3 - 2 * t ** 2 + t) * p0.tangentHermite.z + (-2 * t ** 3 + 3 * t ** 2) * p1.position.z + (t ** 3 - t ** 2) * p1.tangentHermite.z;

            res.push(new THREE.Vector3(
                x,
                y,
                z
            ));
        }
    }

    // Add the last control point (start is indirectly included by first loop)
    res.push(points[points.length - 1].position.clone());

    return res;
}

//TASK2 - end

//TASK3 - begin
/**
 * Implement Bezier interpolation. The @type{ControlPoint} class has properties
 * {@link ControlPoint#tangentBezierBackward} and {@link ControlPoint#tangentBezierForward}.
 *
 * @param {ControlPoint[]} points control points
 * @param {number} interval sampling interval
 * @returns {THREE.Vector3[]} sampled points along the curve
 */
export function interpolateBezierSpline(points, interval) {
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
        const p0 = points[i];
        const p1 = points[i + 1];

        //For one cubic Bezier segment, the curve is defined by exactly 4 Bezier control vectors:
        // B0: start anchor
        // B1: start handle (controls leaving direction)
        // B2: end handle (controls arriving direction)
        // B3: end anchor
        const b0 = p0.position.clone();
        const b1 = p0.position.clone().add(p0.tangentBezierForward);
        const b2 = p1.position.clone().add(p1.tangentBezierBackward);
        const b3 = p1.position.clone();
        let nOfStepsPerSegment = Math.ceil(1 / interval);

        for (let j = 0; j < nOfStepsPerSegment; j++) {
            let t = 1 / nOfStepsPerSegment * j;

            //wikipedia  Kubische Bézierkurven ( n = 3 ) {\displaystyle (n=3)}:
            //https://de.wikipedia.org/wiki/B%C3%A9zierkurve
            //[ P(t) = (1-t)^3 B0 + 3(1-t)^2 t B1 + 3(1-t)t^2 B2 + t^3 B3 ]
            let x = (1 - t) ** 3 * b0.x + 3 * (1 - t) ** 2 * t * b1.x + 3 * (1 - t) * t ** 2 * b2.x + t ** 3 * b3.x;
            let y = (1 - t) ** 3 * b0.y + 3 * (1 - t) ** 2 * t * b1.y + 3 * (1 - t) * t ** 2 * b2.y + t ** 3 * b3.y;
            let z = (1 - t) ** 3 * b0.z + 3 * (1 - t) ** 2 * t * b1.z + 3 * (1 - t) * t ** 2 * b2.z + t ** 3 * b3.z;

            res.push(new THREE.Vector3(
                x,
                y,
                z
            ));

            //more optimal version according to Codex
            // const u = 1 - t;
            //
            // const w0 = u * u * u;
            // const w1 = 3 * u * u * t;
            // const w2 = 3 * u * t * t;
            // const w3 = t * t * t;
            //
            // const point = new THREE.Vector3()
            //     .addScaledVector(b0, w0)
            //     .addScaledVector(b1, w1)
            //     .addScaledVector(b2, w2)
            //     .addScaledVector(b3, w3);
            // res.push(point);
        }
    }

    // Add the last control point (start is indirectly included by first loop)
    res.push(points[points.length - 1].position.clone());

    return res;
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
    if (interval == null || interval <= 0) {
        //avoid divide by 0
        return [];
    }
    //we need at least 2 control points otherwise it makes no sense
    if (points.length < 2) {
        return [];
    }
    let res = [];

    // Catmull rom requires 4 points. So also n-1 and n+2 then we reuse first or last point
    for (let i = 0; i <= points.length - 2; i++) {
        const p0 = i === 0 ? points[i] : points[i - 1];
        const p1 = points[i    ];//segment start
        const p2 = points[i + 1];//segment end
        const p3 = i === points.length - 2 ? points[i + 1] : points[i + 2];


        //The core idea is: Catmull-Rom is a cubic Hermite spline with automatically chosen endpoint tangents
        // m1 = 0.5 * (P2 - P0)
        // m2 = 0.5 * (P3 - P1)

        const m1 = p2.position.clone().sub(p0.position).multiplyScalar(0.5);
        const m2 = p3.position.clone().sub(p1.position).multiplyScalar(0.5);

        let nOfStepsPerSegment = Math.ceil(1 / interval);

        for (let j = 0; j < nOfStepsPerSegment; j++) {
            let t = 1 / nOfStepsPerSegment * j;

            //Now we can use the base hermit formula again but with m1 and m2 instead of the tangentHermite
            // Hermite basis
            const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
            const h10 = t ** 3 - 2 * t ** 2 + t;
            const h01 = -2 * t ** 3 + 3 * t ** 2;
            const h11 = t ** 3 - t ** 2;

            let x = h00 * p1.position.x + h10 * m1.x + h01 * p2.position.x + h11 * m2.x;
            let y = h00 * p1.position.y + h10 * m1.y + h01 * p2.position.y + h11 * m2.y;
            let z = h00 * p1.position.z + h10 * m1.z + h01 * p2.position.z + h11 * m2.z;

            // OR
            //wikipedia https://de.wikipedia.org/wiki/Kubisch_Hermitescher_Spline#Catmull-Rom-Spline
            // C(t) = 0.5 * (2*P1 + (-P0 + P2)*t + (2*P0 - 5*P1 + 4*P2 - P3)*t^2 + (-P0 + 3*P1 - 3*P2 + P3)*t^3)
            // let x = 0.5 * (2 * p1.position.x + (-p0.position.x + p2.position.x) * t + (2 * p0.position.x - 5 * p1.position.x + 4 * p2.position.x - p3.position.x) * t ** 2 + (-p0.position.x + 3 * p1.position.x - 3 * p2.position.x + p3.position.x) * t ** 3);
            // let y = 0.5 * (2 * p1.position.y + (-p0.position.y + p2.position.y) * t + (2 * p0.position.y - 5 * p1.position.y + 4 * p2.position.y - p3.position.y) * t ** 2 + (-p0.position.y + 3 * p1.position.y - 3 * p2.position.y + p3.position.y) * t ** 3);
            // let z = 0.5 * (2 * p1.position.z + (-p0.position.z + p2.position.z) * t + (2 * p0.position.z - 5 * p1.position.z + 4 * p2.position.z - p3.position.z) * t ** 2 + (-p0.position.z + 3 * p1.position.z - 3 * p2.position.z + p3.position.z) * t ** 3);


            res.push(new THREE.Vector3(
                x,
                y,
                z
            ));
        }
    }

    return res;
}

//TASK4 - end