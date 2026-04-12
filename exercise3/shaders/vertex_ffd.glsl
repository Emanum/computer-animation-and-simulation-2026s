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
    
    return p; // just here to avoid compile errors
    
    //TASK4 - end
}

void main(void) {
    vec3 result = transformPoint(position.xyz);
    worldPosition = result; // assume no model transformation
    gl_Position = projectionMatrix * modelViewMatrix * vec4(result, 1);
}
