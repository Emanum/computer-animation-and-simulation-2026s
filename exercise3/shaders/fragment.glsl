uniform vec3 color;
uniform vec3 lightDir;

in vec3 worldPosition;

void main() {
    vec3 dx = dFdx(worldPosition);
    vec3 dy = dFdy(worldPosition);
    vec3 normal = normalize(cross(dx, dy));

    gl_FragColor = vec4(color * (max(dot(lightDir, normal), 0.0) + 0.2), 1);
}