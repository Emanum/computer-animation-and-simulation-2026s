uniform int deformType;
uniform float k; // between 0 and 1

uniform vec3 minCoord;
uniform vec3 maxCoord;

const float M_PI = 3.141592;

out vec3 worldPosition;

vec4 taper(vec4 pos, float k) {
    //TASK1 - begin
    
    // Transform matrix:
    //     s(z)  0    0
    // T =  0   s(z)  0
    //      0   0     1
    //

    //s(z) =   (max z - z)
    //         -----------
    //       (max z - min z)


    // Base the scaling factor on the Y axis (height) instead of Z
    float s_z = (maxCoord.y - pos.y) / (maxCoord.y - minCoord.y);
    float s = mix(1.0, s_z, k);
    mat4 T = mat4  (s, 0, 0, 0,
                    0, 1, 0, 0, 
                    0, 0, s, 0,
                    0, 0, 0, 1);
    
    vec4 erg = T * pos;
    return erg;
    //TASK1 - end
}

vec4 twist(vec4 pos, float k) {
    //TASK2 - begin
    // We want a rotation around the Y axis, 
    // where the angle of rotation is proportional to the Y coordinate of the vertex.

     // Transform matrix:
    // x' = x * cos(kz) - y * sin(kz)
    // y' = x * sin(kz) + y * cos(kz)
    // z' = z
    // But their Z is our Y. 

    // same as above but with PI cause or rotation around Y axis
    //1.0 seems to be 180 degree rotation,
    //2.0 would be 360 degree rotation for full rotation
    float rotationMultiplier = 1.0;
    float angle = mix(0.0, rotationMultiplier * M_PI, k) * (pos.y - minCoord.y) / (maxCoord.y - minCoord.y);
    float cosAngle = cos(angle);
    float sinAngle = sin(angle);
    //y stays the same -> do not change hight
    //x and z are rotated around the Y axis
    mat4 T = mat4 (cosAngle, 0, -sinAngle, 0,
                    0, 1, 0, 0, 
                    sinAngle, 0, cosAngle, 0,
                    0, 0, 0, 1);

    //This is the same as the base rotation matrix around Y axis
    //          cos(θ)   0   sin(θ)   0  
    // Ry(θ) =    0      1     0      0  
    //         -sin(θ)   0   cos(θ)   0  
    //            0      0     0      1  
                   
    vec4 erg = T * pos;

    return erg; // just here to avoid compile errors

    //TASK2 - end
}

vec4 bend(vec4 pos, float k) {
    float z0 = -1.0; // The z coordinate of the "bend point", i.e. the point to rotate around
    float ymin = (1.0 - k) * maxCoord.y + k * minCoord.y; // = zmin in the book
    float ymax = maxCoord.y; // = zmax in the book
    //TASK3 - begin
    //In Figure 4.18 in the book y′ and z′ show z < zmax in the first row, this should be z < zmin.
    //we have a "3 way" function. 
    //case1 y < ymin -> no change
    //case2 ymin <= y <= ymax -> rotate around Z axis
    //case3 y > ymax ->  rotate around Z axis with the same angle as in case 2 but with the rotation point at ymax instead of ymin.

    // Formular from book in ascii:
    //     [Context]
    // (z_min : z_max) - bend region
    // (y_0, z_min)    - center of bend
    
    // [Variables]
    // R = y_0 - y
    // C_theta = cos(theta)
    // S_theta = sin(theta)
    
    // --------------------------------------------------------------------------------
    // x-coordinate:
    // x' = x
    
    // --------------------------------------------------------------------------------
    // y-coordinate (piecewise):
    //      / y                                             z < z_min
    // y' = | y_0 - (R * C_theta)                           z_min <= z <= z_max
    //      \ y_0 - (R * C_theta) + (z - z_max) * S_theta   z > z_max
    
    // --------------------------------------------------------------------------------
    // z-coordinate (piecewise):
    //      / z                                             z < z_min
    // z' = | z_min + (R * S_theta)                         z_min <= z <= z_max
    //      \ z_min + (R * S_theta) + (z - z_max) * C_theta   z > z_max
    
    // --------------------------------------------------------------------------------
    // Angle theta (piecewise):
    //         / 0                z < z_min
    // theta = | z_max - z_min    z > z_max
    //         \ z - z_min        otherwise (z_min <= z <= z_max)

     // Big if over all cases
     if (pos.y < ymin) {
        return pos; // no change
     }
     else if (pos.y >= ymin && pos.y <= ymax) {
        float R = z0 - pos.z;
        // The formula implies theta = z - z_min (which is pos.y - ymin here).
        // By negating the angle, we invert the bend direction so it bends UP instead of DOWN.
        float theta = -(pos.y - ymin);
        float C_theta = cos(theta);
        float S_theta = sin(theta);
        
        vec4 result = pos;
        result.z = z0 - (R * C_theta);
        result.y = ymin + (R * S_theta);
        return result;
     }
     else if (pos.y > ymax) {
        float R = z0 - pos.z;
        float theta = -(ymax - ymin);
        float C_theta = cos(theta);
        float S_theta = sin(theta);
        
        vec4 result = pos;
        result.z = z0 - (R * C_theta) + (pos.y - ymax) * S_theta;
        result.y = ymin + (R * S_theta) + (pos.y - ymax) * C_theta;
        return result;
     }

    return pos; // just here to avoid compile errors
    
    //TASK3 - end
}

void main() {
    vec4 result;
    if (deformType == 0)
        result = taper(vec4(position, 1), k);
    else if (deformType == 1)
        result = twist(vec4(position, 1), k);
    else if (deformType == 2)
        result = bend(vec4(position, 1), k);

    worldPosition = result.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * result;
}