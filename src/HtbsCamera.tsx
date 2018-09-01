import React from 'react'
import { Camera, GLView, Permissions, Asset } from 'expo'
import { StyleSheet, Text, TouchableOpacity, View, Image, CameraRoll, ImageStore } from 'react-native'

const vertShaderSource = `#version 300 es
  precision highp float;
  in vec2 position;
  out vec2 uv;
  void main() {
    uv = position;
    
    gl_Position = vec4(1.0 - 2.0 * position, 0, 1);
  }
`

const fragShaderSource = `#version 300 es
  precision highp float;
  uniform sampler2D cameraTexture;
  uniform sampler2D htbsLogo;
  uniform float time;
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
    vec2 newUv = vec2(floor(uv.x * width) / width, floor(uv.y * height) / height); 

    float noiseX = snoise(newUv * 1.8 - 20.0 + time * 0.1) * 0.005;
    float noiseY = snoise(newUv * 2.0 + 30.0 + time * 0.1) * 0.002;
    newUv = vec2(newUv.x + noiseX, newUv.y + noiseY);

    float r = texture(cameraTexture, vec2((newUv.x - 0.5) * 0.5 + 0.5 + 0.001 * sin(time), newUv.y - 0.002)).r;
    float g = texture(cameraTexture, vec2((newUv.x - 0.5) * 0.5 + 0.5 - 0.001, newUv.y + 0.001 * cos(time + 2.1))).g;
    float b = texture(cameraTexture, vec2((newUv.x - 0.5) * 0.5 + 0.5, newUv.y)).b;
    // clr.r = clr.r * 1.2;
    // clr.g = clr.g * 1.0;
    // clr.b = clr.b * 0.9;

    vec3 newClr = vec3(floor(r * 10.0), floor(g * 10.0), floor(b * 10.0)) / 10.0; 

    vec4 logo = texture(htbsLogo, uv);
    fragColor = vec4(newClr, 1.0); // + logo;
  }
`

class GLCameraScreen extends React.Component {
  private glView: any
  private gl: any
  private camera: any
  private texture: any
  private _rafID: any
  private _time: number = 0.0
  private _logo: any

  state = { zoom: 0, type: Camera.Constants.Type.back }

  componentWillUnmount() {
    cancelAnimationFrame(this._rafID)
  }

  async createCameraTexture() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA)

    if (!status) {
      console.log('Denied camera permissions!')
      return
    }

    return this.glView.createCameraTextureAsync(this.camera)
  }

  onContextCreate = async gl => {
    this.gl = gl
    // Create texture asynchronously
    const cameraTexture = (this.texture = await this.createCameraTexture())

    // Compile vertex and fragment shaders
    const vertShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertShader, vertShaderSource)
    gl.compileShader(vertShader)

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragShader, fragShaderSource)
    gl.compileShader(fragShader)

    // Link, use program, save and enable attributes
    const program = gl.createProgram()
    gl.attachShader(program, vertShader)
    gl.attachShader(program, fragShader)
    gl.linkProgram(program)
    gl.validateProgram(program)

    gl.useProgram(program)

    const timeLoc = gl.getUniformLocation(program, 'time')

    const positionAttrib = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(positionAttrib)

    // Create, bind, fill buffer
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    const verts = new Float32Array([-2, 0, 0, -2, 2, 2])
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW)

    // Bind 'position' attribute
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0)

    // Set 'cameraTexture' uniform
    gl.uniform1i(gl.getUniformLocation(program, 'cameraTexture'), 0)
    gl.uniform1i(gl.getUniformLocation(program, 'htbsLogo'), 1)
    // gl.uniform1i(gl.getUniformLocation(program, 'cameraTexture'), 0)

    this._logo = Asset.fromModule(require('./htbs.png'))
    await this._logo.downloadAsync()

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)

    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._logo)

    // Activate unit 0
    gl.activeTexture(gl.TEXTURE0)

    // Render loop
    const loop = () => {
      this._rafID = requestAnimationFrame(loop)

      gl.clearColor(0, 0, 1, 1)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      gl.bindTexture(gl.TEXTURE_2D, cameraTexture)
      // gl.bindTexture(gl.TEXTURE_2D, this._logo)
      gl.uniform1f(timeLoc, this._time)

      // Draw!
      gl.drawArrays(gl.TRIANGLES, 0, verts.length / 2)

      gl.endFrameEXP()

      this._time += 0.1
    }
    loop()
  }

  toggleFacing = () => {
    this.setState({
      type: this.state.type === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back,
    })
  }

  zoomOut = () => this.setState({ zoom: this.state.zoom - 0.1 < 0 ? 0 : this.state.zoom - 0.1 })
  zoomIn = () => this.setState({ zoom: this.state.zoom + 0.1 > 1 ? 1 : this.state.zoom + 0.1 })

  takePicture = async () => {
    const test: any = GLView
    const image = await test.takeSnapshotAsync(this.gl, { compress: 0 })
    const saveResult = await CameraRoll.saveToCameraRoll(image.uri, 'photo')

    // ImageStore.getBase64ForTag(image.uri, (data) => {
    //   console.log('hej')
    //   console.log(data)
    // }, e => console.warn('getBase64ForTag: ', e))

    this.setState({ cameraRollUri: saveResult })
  }

  ref(refName: string) {
    return ref => {
      this[refName] = ref
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <Camera
          style={{ width: 0, height: 0 }}
          ratio='16:9'
          type={this.state.type}
          zoom={this.state.zoom}
          ref={this.ref('camera')}
        />

        <GLView
          style={{
            position: 'absolute',
            top: 0,
            width: '100%',
            height: '100%',
          }}
          onContextCreate={this.onContextCreate}
          ref={this.ref('glView')}
        />

        <Image
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          source={{ uri: 'https://i.imgur.com/qTfJq6h.png' }}
        />

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.button} onPress={this.takePicture} />
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  buttons: {
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  button: {
    height: 50,
    width: 50,
    // backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default GLCameraScreen
