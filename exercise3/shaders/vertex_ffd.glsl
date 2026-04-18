//The control points describe the corners of a cube.
uniform vec3 controlPointsOrig[8];  //This array holds the corners of the cube and does not change (it is always (-1,-1,-1), (-1,1,-1)....)
uniform vec3 controlPoints[8];      //This array holds the current position of the control points and will change every frame

//All positions are absolute, no need for any model->world transformations
out vec3 worldPosition; //The modified output vertice you must set

vec3 transformPoint(vec3 p)
{
    //TASK4 - begin
    //Assume that the source cube always is -1..1 on each axis
    //Have a look at controlPointsOrig and controlPoints

    vec3 result = vec3(0.0);

    for (int i = 0; i < 8; ++i) {
        vec3 cpOrig = controlPointsOrig[i];

        // Side length is 2, so distance 0 -> dependency 1, distance 2 -> dependency 0.
        //cube goes from -1 to 1 -> so side length is 2 
        // dep = 1 means v lies on c --> so when the distance is 0
        // dep = 0 means v lies on opposite side --> so when the distance is 2
        // so we need to 'invert' it by 1 - distance and /2 cause side length 2
        // then normalize to 0->1 by clamping


        vec3 depPerAxis = clamp(vec3(1.0) - abs(p - cpOrig) / 2.0, 0.0, 1.0);
        float dep = depPerAxis.x * depPerAxis.y * depPerAxis.z;

        result += dep * controlPoints[i];
    }

    return result;
    
    //TASK4 - end
}

void main(void) {
    vec3 result = transformPoint(position.xyz);
    worldPosition = result; // assume no model transformation
    gl_Position = projectionMatrix * modelViewMatrix * vec4(result, 1);
}
