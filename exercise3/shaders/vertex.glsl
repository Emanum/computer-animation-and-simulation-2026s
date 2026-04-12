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

    return pos; // just here to avoid compile errors

    //TASK2 - end
}

vec4 bend(vec4 pos, float k) {
    float z0 = -1.0; // The z coordinate of the "bend point", i.e. the point to rotate around
    float ymin = (1.0 - k) * maxCoord.y + k * minCoord.y; // = zmin in the book
    float ymax = maxCoord.y; // = zmax in the book
    //TASK3 - begin

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