import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";


/**
 * Base class for all exercise classes.
 * 
 * Sets up the THREE.js scene, camera, renderer and orbit controls.
 * Adds a grid and lights to the scene.
 * Handles canvas resizing.
 */
export class ExerciseBase {
    /** @type {THREE.Scene} */
    scene = undefined;

    /** @type {THREE.Camera} */
    camera = undefined;

    /** @type {THREE.WebGLRenderer} */
    renderer = undefined;

    /** @type {OrbitControls} */
    orbitControls = undefined;

    /** @type {THREE.Raycaster} */
    raycaster = new THREE.Raycaster();

    constructor() {
        this.initScene();
        this.initRenderer(document.getElementById("container"));
        this.initCamera();
        this.initOrbitControls();

        window.addEventListener("resize", () => this.onWindowResize());
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // init lights
        this.scene.add(new THREE.AmbientLight(0xf0f0f0, 3));
        const light = new THREE.DirectionalLight(0xffffff, 4.5);
        light.position.set(0, 60, 0);
        light.castShadow = true;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 100;
        light.shadow.camera.left = -50;
        light.shadow.camera.right = 50;
        light.shadow.camera.top = 50;
        light.shadow.camera.bottom = -50;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        this.scene.add(light);
        //this.scene.add(new THREE.CameraHelper(light.shadow.camera));

        // init ground plane, just for showing shadow
        const planeGeometry = new THREE.PlaneGeometry(100, 100);
        planeGeometry.rotateX(-Math.PI / 2);
        const planeMaterial = new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.2 });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.y = 0;
        plane.receiveShadow = true;
        this.scene.add(plane);

        // init grid, helps with spatial reference
        const helper = new THREE.GridHelper(100, 100);
        helper.position.y = 0;
        helper.material.opacity = 0.25;
        helper.material.transparent = true;
        this.scene.add(helper);
    }

    /**
     * Inits renderer, which creates a canvas element and adds it as child to specified container.
     * @param {Element} container DOM element to add canvas to
     */
    initRenderer(container) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
        this.camera.position.set(0, 20, 35);
        this.camera.lookAt(0, 0, 0);
        this.scene.add(this.camera);
    }

    initOrbitControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.damping = 0.3;
        this.orbitControls.target = new THREE.Vector3(0, 0, 0);
        this.orbitControls.update();
        this.orbitControls.addEventListener("change", () => this.render());
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.render();
    }

    raycastPointerAgainst(event, objects) {
        const pointer = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        this.raycaster.setFromCamera(pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(objects, false);

        // ignore raycast when pointer is down, we are doing something else already (orbit/transform)
        if (intersects.length > 0) {
            return intersects[0].object;
        }
        return undefined;
    }
}
