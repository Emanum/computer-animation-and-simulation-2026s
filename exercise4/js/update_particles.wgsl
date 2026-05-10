
/** Different force field types */
// export const ForceFieldType = Object.freeze({
//     DIRECTIONAL: { name: "directional", value: 1, color: color(0xe41a1c) },
//     EXPANSION: { name: "expansion", value: 2, color: color(0x4daf4a) },
//     CONTRACTION: { name: "contraction", value: 3, color: color(0x984ea3) },
// });
/**
 * TSL struct for force fields used for applying forces to particles in shaders.
 */
// export const ForceFieldStruct = struct({
//     fieldType: "int",
//     position: "vec3",
//     radius: "float",
//     force: "vec3",
// }, "ForceFieldStruct");

// export const BoxObstacleStruct = struct({
//     minCorner: "vec3",
//     maxCorner: "vec3",
// }, "BoxObstacleStruct");


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
            var newVelocity = newVelocityNoCollision;
            var newPosition = newPositionNoCollision;

            for (var i = 0; i < numObstacles; i = i + 1) {
                let obs = obstacles[i];
                let minC = obs.minCorner;
                let maxC = obs.maxCorner;

                if (newPosition.x > minC.x && newPosition.x < maxC.x &&
                    newPosition.y > minC.y && newPosition.y < maxC.y &&
                    newPosition.z > minC.z && newPosition.z < maxC.z) {
                    
                    let dx0 = newPosition.x - minC.x;
                    let dx1 = maxC.x - newPosition.x;
                    let dy0 = newPosition.y - minC.y;
                    let dy1 = maxC.y - newPosition.y;
                    let dz0 = newPosition.z - minC.z;
                    let dz1 = maxC.z - newPosition.z;

                    let minDist = min(min(min(dx0, dx1), min(dy0, dy1)), min(dz0, dz1));

                    var normal = vec3f(0.0, 0.0, 0.0);
                    if (minDist == dx0) {
                        normal = vec3f(-1.0, 0.0, 0.0);
                        newPosition.x = minC.x;
                    } else if (minDist == dx1) {
                        normal = vec3f(1.0, 0.0, 0.0);
                        newPosition.x = maxC.x;
                    } else if (minDist == dy0) {
                        normal = vec3f(0.0, -1.0, 0.0);
                        newPosition.y = minC.y;
                    } else if (minDist == dy1) {
                        normal = vec3f(0.0, 1.0, 0.0);
                        newPosition.y = maxC.y;
                    } else if (minDist == dz0) {
                        normal = vec3f(0.0, 0.0, -1.0);
                        newPosition.z = minC.z;
                    } else if (minDist == dz1) {
                        normal = vec3f(0.0, 0.0, 1.0);
                        newPosition.z = maxC.z;
                    }

                    let vDotN = dot(newVelocity, normal);
                    if (vDotN < 0.0) {
                        newVelocity = newVelocity - (1.0 + bounciness) * vDotN * normal;
                    }
                }
            }
            //TASK 3 - end

            positions[particleIndex] = newPosition;
            velocities[particleIndex] = newVelocity;
        }
    }
}
