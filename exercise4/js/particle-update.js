import { wgslFn } from "three/tsl"
import { ForceFieldStruct } from "./force-field.js";
import { BoxObstacleStruct } from "./obstacle.js";

// bug in THREE.js: parenthesis in comments in function declaration break wgslFn nodes
// seemingly, when parsing the function signature, they stop at the first closing paranthesis i.e. ')' character
// workaround: just use [] lol
//TODO: open issue at THREE.js repo

export const updateParticlesWGSL = wgslFn(/* wgsl */`
fn updateParticles(
    particleIndex: u32, // index of particle to update

    // per particle attributes
    positions: ptr<storage, array<vec3f>, read_write>,         // position per particle
    velocities: ptr<storage, array<vec3f>, read_write>,        // velocity per particle
    startTimes: ptr<storage, array<f32>, read_write>,          // time of spawn for current life per particle
    initialPositions: ptr<storage, array<vec3f>, read_write>,  // initial position per particle for resetting after lifetime
    initialVelocities: ptr<storage, array<vec3f>, read_write>, // initial velocity per particle for resetting after lifetime

    // parameters
    particleLifeTime: f32, // how long each particle lives [in s]
    currentTime: f32,      // current time [in s]
    deltaTime: f32,        // time diff since last update [in s], used for simulation step
    gravity: f32,          // gravitational acceleration [y component of gravity force]
    dragCoeff: f32,        // coefficient for quadratric drag force
    bounciness: f32,       // coefficient for velocity after collision

    // force fields
    numForceFields: i32, // number of active force fields, only first numForceFields entries relevant
    forceFields: ptr<storage, array<ForceFieldStruct>, read_write>,

    // obstacles
    numObstacles: i32, // number of active obstacles, only first numObstacles entries relevant
    obstacles: ptr<storage, array<BoxObstacleStruct>, read_write>,
) -> void {
    // constants representing force field types
    const DIRECTIONAL = 1;
    const EXPANSION = 2;
    const CONTRACTION = 3;

    let position = positions[particleIndex];
    let velocity = velocities[particleIndex];
    let startTime = startTimes[particleIndex];

    if (currentTime > startTime) {
        let age = currentTime - startTime;
        if (age > particleLifeTime) {
            positions[particleIndex] = initialPositions[particleIndex];
            velocities[particleIndex] = initialVelocities[particleIndex];
            startTimes[particleIndex] += particleLifeTime;
        } else {
            const mass = 1.0; // in kg for one particle
            var totalForce = vec3f(0, 0, 0);

            //TASK 1 - begin
            //TODO Add gravity force (use the parameter "gravity" for the vertical component).
            totalForce += vec3f(0, - gravity * mass, 0);
            //TODO Add drag force (use the paramter "dragCoeff").
            //|velocity|2 × DragCoefficient and its direction is opposite to the direction of velocity.
            let dragForce = dragCoeff * length(velocity) * length(velocity) * (-normalize(velocity));
            totalForce += dragForce;

            //TASK 1 - end

            //TASK 2 - begin
            //TODO Add force field forces, use parameters "numForceFields" and "forceFields"
            for (var i = 0; i < numForceFields; i = i + 1) {
                let forceField = forceFields[i];
                let toParticle = position - forceField.position;
                let distance = length(toParticle);
                if (distance < forceField.radius) {
                    if (forceField.fieldType == DIRECTIONAL) {
                        totalForce += forceField.force;
                    } else if (forceField.fieldType == EXPANSION) {
                        totalForce += normalize(toParticle) * length(forceField.force);
                    } else if (forceField.fieldType == CONTRACTION) {
                        totalForce += (-normalize(toParticle)) * length(forceField.force);
                    }
                }
            }
            // See ForceFieldStruct in force-field.js for available struct fields.
            // For the type, you can compare against the above defined constants DIRECTIONAL, EXPANSION and CONTRACTION.
            // For expansion and contraction, use only the magnitude of forceField.force, you can ignore its direction.
            //TASK 2 - end

            // Compute acceleration using Newton's second law (F = m * a <=> a = F / m)
            // Compute velocity and position from acceleration using numeric integration (Semi-implicit Euler method)
            let acceleration = totalForce / mass;
            let newVelocityNoCollision = velocity + acceleration * deltaTime;
            let newPositionNoCollision = position + newVelocityNoCollision * deltaTime;

            //TASK 3 - begin
            //TODO Handle collision with obstacles, use parameters "numObstacles", "obstacles" and "bounciness".
            // See BoxObstacleStruct in obstacle.js for available struct fields.
            // Compute new velocity and new position accordingly.
            // You can also add new functions, but you need to define them as a separate wgslFn (see below for example).
            var newVelocity = exampleFunction(newVelocityNoCollision);
            var newPosition = position + newVelocity * deltaTime;
            //TASK 3 - end

            positions[particleIndex] = newPosition;
            velocities[particleIndex] = newVelocity;
        }
    }
}
`, [
    ForceFieldStruct(),
    BoxObstacleStruct(),
    wgslFn(/*wgsl*/`
fn exampleFunction(vector: vec3f) -> vec3f {
    return vector;
}
`)
]
);



