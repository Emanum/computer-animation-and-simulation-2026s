import { Object3D } from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

/**
 * 
 * @param {string} url a url that is relative to this file 
 * @returns {Promise<string>}
 */
async function fetchTextFile(url) {
    const response = await fetch(import.meta.resolve(url));
    return await response.text();
}

/**
 * 
 * @param {string} url a url that is relative to this file 
 * @returns {Promise<Object3D>}
 */
async function fetchObjModel(url) {
    const objLoader = new OBJLoader();
    return await objLoader.loadAsync(import.meta.resolve(url));
}

export const SHADERS = {
    vertex: await fetchTextFile("../shaders/vertex.glsl"),
    vertex_ffd: await fetchTextFile("../shaders/vertex_ffd.glsl"),
    fragment: await fetchTextFile("../shaders/fragment.glsl"),
};

export const MODELS = {
    teapot: await fetchObjModel("../models/teapot.obj"),
    poyoyo16: await fetchObjModel("../models/poyoyo16.obj"),
};