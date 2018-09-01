export const cameraVert = `#version 300 es
  precision highp float;
  in vec2 position;
  out vec2 uv;
  void main() {
    uv = position;
    
    gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
  }
`

export const cameraFrag = `#version 300 es
  precision highp float;
  uniform sampler2D htbsLogo;
  uniform sampler2D cameraTexture;
  uniform float time;
  uniform float zoom;
  in vec2 uv;
  out vec4 fragColor;

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec3 permute(vec3 x) {
    return mod289(((x*34.0)+1.0)*x);
  }

  float snoise(vec2 v)
    {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  // First corner
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);

  // Other corners
    vec2 i1;
    //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
    //i1.y = 1.0 - i1.x;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    // x0 = x0 - 0.0 + 0.0 * C.xx ;
    // x1 = x0 - i1 + 1.0 * C.xx ;
    // x2 = x0 - 1.0 + 2.0 * C.xx ;
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

  // Permutations
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;

  // Gradients: 41 points uniformly over a line, mapped onto a diamond.
  // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

  // Normalise gradients implicitly by scaling m
  // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

  // Compute final noise value at P
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    float width = 300.0;
    float height = 300.0;
    vec2 zoomUv = vec2(zoom * (uv.x - 0.5) + 0.5, zoom * (uv.y - 0.5 ) + 0.5);
    vec2 newUv = vec2(floor(zoomUv.x * width) / width, floor(zoomUv.y * height) / height); 

    float noiseX = snoise(newUv * 1.8 - 20.0 + time * 0.1) * 0.005;
    float noiseY = snoise(newUv * 2.0 + 30.0 + time * 0.1) * 0.002;
    newUv = vec2(newUv.x + noiseX, newUv.y + noiseY);
    
    float r = texture(cameraTexture, vec2((newUv.x - 0.5) * 0.5 + 0.5 + 0.001 * sin(time), newUv.y - 0.002)).r;
    float g = texture(cameraTexture, vec2((newUv.x - 0.5) * 0.5 + 0.5 - 0.001, newUv.y + 0.001 * cos(time + 2.1))).g;
    float b = texture(cameraTexture, vec2((newUv.x - 0.5) * 0.5 + 0.5, newUv.y)).b;

    // clr.r = clr.r * 1.2;
    // clr.g = clr.g * 1.0;
    // clr.b = clr.b * 0.9;

    float intesityLevels = 15.0;
    vec3 newClr = vec3(floor(r * intesityLevels), floor(g * intesityLevels), floor(b * intesityLevels)) / intesityLevels; 

    float cosFactor = 0.4;
    float sinFactor = 0.4;
    vec2 logoUV = vec2((1.0 - uv.x) * 4.0, uv.y * 8.0) * mat2(cosFactor, sinFactor, -sinFactor, cosFactor);
    vec4 logo = texture(htbsLogo, logoUV);
    if (logo.g == 1.0) {
      logo = vec4(0.0);
    } else {
      logo = vec4(vec3(logo.r) * 0.07, 0.1);
    }

    fragColor = vec4(newClr, 1.0) + logo;
    //fragColor = texture(cameraTexture, uv);
  }
`