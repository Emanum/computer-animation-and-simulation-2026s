import * as THREE from "three";

export class FfdVolume {

    /** @type {THREE.Object3D} */
    object = undefined;

    constructor() {
        const material = new THREE.LineBasicMaterial({ color: 0x000000 });
        const geometry = FfdVolume.createCubeOutlineGeometry();
        this.object = new THREE.LineSegments(geometry, material);
    }

    static createCubeOutlineGeometry() {
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            1, -1, -1,
            1, 1, -1,
            -1, 1, -1,
            -1, -1, -1,
            1, -1, 1,
            1, 1, 1,
            -1, 1, 1,
            -1, -1, 1,
        ]);
        geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

        const indices = [0, 1, 1, 2, 2, 3, 3, 0, 0, 4, 1, 5, 2, 6, 3, 7, 4, 5, 5, 6, 6, 7, 7, 4];
        geometry.setIndex(indices);

        return geometry;
    }

}