import { Camera, Permissions } from 'expo'
import { GLSL, Node, Shaders } from 'gl-react'
import * as GLView from 'gl-react-expo'
import * as React from 'react'
import { Component } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'

const gui = require('./gui.png')

interface State {
  cameraType: string // TODO Camera.Constants.Type,
  hasPermissionToCamera: boolean | undefined
}

const shaders = Shaders.create({
  Saturate: {
    frag: GLSL`
      precision highp float;
      varying vec2 uv;
      uniform sampler2D t;
      uniform float contrast, saturation, brightness;
      const vec3 L = vec3(0.2125, 0.7154, 0.0721);
      void main() {
        vec4 c = texture2D(t, uv);
          vec3 brt = c.rgb * brightness;
          gl_FragColor = vec4(mix(
          vec3(0.5),
          mix(vec3(dot(brt, L)), brt, saturation),
          contrast), c.a);
      }
    `
  }
})

export class CameraScreen extends Component<{}, State> {
  constructor(props: {}, context?: any) {
    super(props, context)

    this.state = {
      cameraType: 'back', // Camera.Constants.Type.back, TODO
      hasPermissionToCamera: undefined
    }
  }

  public async componentWillMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA)

    this.setState({
      hasPermissionToCamera: status === 'granted'
    })
  }

  public render() {
    if (this.state.hasPermissionToCamera === undefined) {
      return <Text>Getting permission to access the camera.</Text>
    }

    if (this.state.hasPermissionToCamera === false) {
      return <Text>No access to the camera.</Text>
    }

    return (
      <View style={{ flex: 1 }}>
        <Camera
          style={{ flex: 1 }}
          type={this.state.cameraType}
        >
          <View style={{ backgroundColor: 'transparent', flex: 1, flexDirection: 'row' }}>
            <Image
              style={{ width: '100%', height: '100%', position: 'absolute' }}
              source={{ uri: 'https://i.imgur.com/qTfJq6h.png' }}
            />
            <TouchableOpacity
              onPress={() => this.toggleCameraType()}
              style={{
                alignItems: 'center',
                alignSelf: 'flex-end',
                flex: 0.1
              }}
            >
              <Text
                style={{
                  color: 'white',
                  fontSize: 18,
                  marginBottom: 10
                }}
              >
                {' '}Flip{' '}
              </Text>
            </TouchableOpacity>
          </View>
        </Camera>
        {/* <GLView.Surface style={{ width: 100, height: 100 }}>
          <Node shader={shaders.Saturate} uniforms={{ contrast: 1, saturation: 2, brightness: 1, t: { uri: 'https://i.imgur.com/uTP9Xfr.jpg' } }} />
        </GLView.Surface> */}
      </View>
    )
  }

  private toggleCameraType() {
    this.setState({
      // TODO
      // cameraType: this.state.cameraType === Camera.Constants.Type.back
      //   ? Camera.Constants.Type.front
      //   : Camera.Constants.Type.back
      cameraType: this.state.cameraType === 'back'
        ? 'front'
        : 'back'
    })
  }
}