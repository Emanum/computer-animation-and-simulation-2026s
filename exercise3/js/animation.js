import * as THREE from "three";

export class Animation {

    /** @type {THREE.Vector3[][]} */
    points = [];

    /** @type {number} */
    durations = [];

    currentTime = 0.0;

    currentSegmentIndex = 0;

    /**
     *
     * @param {number} duration
     * @param {THREE.Vector3[]} points
     */
    addKeyFrame(duration, points) {
        // ignore first duration
        if (this.points.length !== 0) {
            this.durations.push(duration);

            // assure always same number of points per key frame
            if (points.length !== this.points[0].length) {
                throw new Error("Number of points per key frame must be same for all key frames.");
            }
        }
        this.points.push(points);
    }

    step(time) {
        if (this.currentTime + time > this.durations[this.currentSegmentIndex]) {
            // reset time and advance key frame
            this.currentTime = (this.currentTime + time) % this.durations[this.currentSegmentIndex];
            this.currentSegmentIndex += 1;

            // reached last key frame, animation should end
            if (this.currentSegmentIndex == this.durations.length) {
                return { continue: false };
            }
        } else {
            this.currentTime += time;
        }

        // compute interpolated points
        const t = this.currentTime / this.durations[this.currentSegmentIndex];
        const resultPoints = new Array(this.points[0].length).fill(undefined);
        for (let i = 0; i < this.points[0].length; i++) {
            const beginPoint = this.points[this.currentSegmentIndex][i];
            const endPoint = this.points[this.currentSegmentIndex + 1][i];
            const beginToEnd = endPoint.clone().sub(beginPoint);
            resultPoints[i] = beginPoint.clone().addScaledVector(beginToEnd, t);
        }
        return { continue: true, points: resultPoints };
    }

    reset() {
        this.currentSegmentIndex = 0;
        this.currentTime = 0.0;
    }
}
/**
 *
 * @returns {Animation}
 */

export function createExampleAnimation() {
    const filterFromTo = (minIndex, maxIndexExclusive) => {
        return (_, index) => index >= minIndex && index < maxIndexExclusive;
    };
    const clonePoints = (points) => points.map(p => p.clone());

    const animation = new Animation();
    const origPoints = [
        new THREE.Vector3(1, -1, -1), new THREE.Vector3(1, 1, -1),
        new THREE.Vector3(-1, 1, -1), new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(1, -1, 1), new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(-1, 1, 1), new THREE.Vector3(-1, -1, 1)
    ];
    let points = clonePoints(origPoints);
    animation.addKeyFrame(0, clonePoints(points));

    points.forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 4));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.forEach(p => p.multiply(new THREE.Vector3(1, 1.5, 1)));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.filter(filterFromTo(0, 4)).forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.filter(filterFromTo(2, 6)).forEach(p => p.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 3));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.filter(filterFromTo(2, 6)).forEach(p => p.multiply(new THREE.Vector3(0.5, 2, 2)));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.filter(filterFromTo(0, 2)).forEach(p => p.add(new THREE.Vector3(0, 0.3, 0)));
    points.filter(filterFromTo(6, 8)).forEach(p => p.add(new THREE.Vector3(0, 0.3, 0)));
    animation.addKeyFrame(0.5, clonePoints(points));

    points = clonePoints(origPoints);
    animation.addKeyFrame(0.5, clonePoints(points));

    points.forEach(p => p.multiply(new THREE.Vector3(2, 0.7, 0.7)));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.filter(filterFromTo(2, 4)).forEach(p => p.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 3));
    points.filter(filterFromTo(6, 8)).forEach(p => p.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 3));
    points.filter(filterFromTo(0, 2)).forEach(p => p.applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 3));
    points.filter(filterFromTo(4, 6)).forEach(p => p.applyAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 3));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.filter(filterFromTo(2, 4)).forEach(p => p.applyAxisAngle(new THREE.Vector3(1, 0, 0), -2 * Math.PI / 3));
    points.filter(filterFromTo(6, 8)).forEach(p => p.applyAxisAngle(new THREE.Vector3(1, 0, 0), -2 * Math.PI / 3));
    points.filter(filterFromTo(0, 2)).forEach(p => p.applyAxisAngle(new THREE.Vector3(1, 0, 0), 2 * Math.PI / 3));
    points.filter(filterFromTo(4, 6)).forEach(p => p.applyAxisAngle(new THREE.Vector3(1, 0, 0), 2 * Math.PI / 3));
    animation.addKeyFrame(0.5, clonePoints(points));

    points = clonePoints(origPoints);
    animation.addKeyFrame(0.5, clonePoints(points));

    points.forEach(p => p.multiply(new THREE.Vector3(0.7, 2, 0.5)));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.filter(filterFromTo(1, 3)).forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 3));
    points.filter(filterFromTo(5, 7)).forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 3));
    points.filter(filterFromTo(0, 1)).forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 3));
    points.filter(filterFromTo(3, 5)).forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 3));
    points.filter(filterFromTo(7, 8)).forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 3));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.filter(filterFromTo(1, 3)).forEach(p => p.add(new THREE.Vector3(-2, 0, 0)));
    points.filter(filterFromTo(5, 7)).forEach(p => p.add(new THREE.Vector3(-2, 0, 0)));
    points.filter(filterFromTo(0, 1)).forEach(p => p.add(new THREE.Vector3(2, 0, 0)));
    points.filter(filterFromTo(3, 5)).forEach(p => p.add(new THREE.Vector3(2, 0, 0)));
    points.filter(filterFromTo(7, 8)).forEach(p => p.add(new THREE.Vector3(2, 0, 0)));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.filter(filterFromTo(1, 3)).forEach(p => p.add(new THREE.Vector3(0, -1, 0)));
    points.filter(filterFromTo(5, 7)).forEach(p => p.add(new THREE.Vector3(0, 1, 0)));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.filter(filterFromTo(1, 3)).forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), -2 * Math.PI / 3));
    points.filter(filterFromTo(5, 7)).forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), -2 * Math.PI / 3));
    points.filter(filterFromTo(0, 1)).forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), 2 * Math.PI / 3));
    points.filter(filterFromTo(3, 5)).forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), 2 * Math.PI / 3));
    points.filter(filterFromTo(7, 8)).forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), 2 * Math.PI / 3));
    animation.addKeyFrame(0.5, clonePoints(points));

    points.filter(filterFromTo(1, 3)).forEach(p => p.add(new THREE.Vector3(5, 0, 0)));
    points.filter(filterFromTo(5, 7)).forEach(p => p.add(new THREE.Vector3(5, 0, 0)));
    points.filter(filterFromTo(0, 1)).forEach(p => p.add(new THREE.Vector3(-5, 0, 0)));
    points.filter(filterFromTo(3, 5)).forEach(p => p.add(new THREE.Vector3(-5, 0, 0)));
    points.filter(filterFromTo(7, 8)).forEach(p => p.add(new THREE.Vector3(-5, 0, 0)));
    animation.addKeyFrame(0.5, clonePoints(points));

    points = clonePoints(origPoints);
    animation.addKeyFrame(0.5, clonePoints(points));
    return animation;
}
