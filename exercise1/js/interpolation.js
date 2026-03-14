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

    const sampledPoints = [];
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i].position;
        const p1 = points[i + 1].position;
        const startT = i === 0 ? 0 : interval;

        for (let t = startT; t < 1; t += interval) {
            sampledPoints.push(new THREE.Vector3().lerpVectors(p0, p1, t));
        }
        sampledPoints.push(p1.clone());
    }

    return sampledPoints;
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

    const sampledPoints = [];
    const hermite = (p0, p1, m0, m1, t) => {
        const t2 = t * t;
        const t3 = t2 * t;
        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;
        return new THREE.Vector3()
            .addScaledVector(p0, h00)
            .addScaledVector(m0, h10)
            .addScaledVector(p1, h01)
            .addScaledVector(m1, h11);
    };

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i].position;
        const p1 = points[i + 1].position;
        const m0 = points[i].tangentHermite;
        const m1 = points[i + 1].tangentHermite;
        const startT = i === 0 ? 0 : interval;

        for (let t = startT; t < 1; t += interval) {
            sampledPoints.push(hermite(p0, p1, m0, m1, t));
        }
        sampledPoints.push(p1.clone());
    }

    return sampledPoints;
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

    const sampledPoints = [];
    const bezier = (p0, c1, c2, p1, t) => {
        const u = 1 - t;
        const u2 = u * u;
        const u3 = u2 * u;
        const t2 = t * t;
        const t3 = t2 * t;
        return new THREE.Vector3()
            .addScaledVector(p0, u3)
            .addScaledVector(c1, 3 * u2 * t)
            .addScaledVector(c2, 3 * u * t2)
            .addScaledVector(p1, t3);
    };

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i].position;
        const p1 = points[i + 1].position;
        const c1 = p0.clone().add(points[i].tangentBezierForward);
        const c2 = p1.clone().add(points[i + 1].tangentBezierBackward);
        const startT = i === 0 ? 0 : interval;

        for (let t = startT; t < 1; t += interval) {
            sampledPoints.push(bezier(p0, c1, c2, p1, t));
        }
        sampledPoints.push(p1.clone());
    }

    return sampledPoints;
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

    const sampledPoints = [];
    const catmullRom = (p0, p1, p2, p3, t) => {
        const t2 = t * t;
        const t3 = t2 * t;
        return new THREE.Vector3()
            .addScaledVector(p1, 2)
            .addScaledVector(p2.clone().sub(p0), t)
            .addScaledVector(
                p0.clone().multiplyScalar(2)
                    .addScaledVector(p1, -5)
                    .addScaledVector(p2, 4)
                    .addScaledVector(p3, -1),
                t2
            )
            .addScaledVector(
                p0.clone().multiplyScalar(-1)
                    .addScaledVector(p1, 3)
                    .addScaledVector(p2, -3)
                    .addScaledVector(p3, 1),
                t3
            )
            .multiplyScalar(0.5);
    };

    for (let i = 1; i < points.length - 2; i++) {
        const p0 = points[i - 1].position;
        const p1 = points[i].position;
        const p2 = points[i + 1].position;
        const p3 = points[i + 2].position;
        const startT = i === 1 ? 0 : interval;

        for (let t = startT; t < 1; t += interval) {
            sampledPoints.push(catmullRom(p0, p1, p2, p3, t));
        }
        sampledPoints.push(p2.clone());
    }

    return sampledPoints;
}
//TASK4 - end
