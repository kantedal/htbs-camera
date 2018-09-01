import React from 'react'
import { Camera, GLView, Permissions, Asset } from 'expo'
import AssetUtils from 'expo-asset-utils'

import { StyleSheet, Text, TouchableOpacity, View, Image, CameraRoll, ImageStore, Animated, Easing, RecyclerViewBackedScrollViewComponent, Alert } from 'react-native'
import { cameraVert, cameraFrag } from './cameraShaders';
import PublishToFeedModal from './PublishToFeedModal'
import { StoryFeed } from './StoryScreen';

const Dropbox = require('dropbox').Dropbox

const dbx = new Dropbox({
  accessToken: 'F9G1jrnCvJ0AAAAAAAAE-NQBkQDS1HiGPGDIAhc-wW0hgJ37HQ7hbSpqmQTQAwDF',
  fetch: fetch
})

class GLCameraScreen extends React.Component {
  private glView: any
  private gl: any
  private camera: any
  private texture: any
  private _rafID: any
  private _time: number = 0
  private _logo: any

  state = {
    zoom: 1,
    type: Camera.Constants.Type.back,
    publishModalOpen: false,
    imgUri: null,
    storyFeed: false,
    spinAnim: new Animated.Value(0),
    explosionAnim: new Animated.Value(0),
    analyzingPerson: false,
  }

  componentWillUnmount() {
    cancelAnimationFrame(this._rafID)
  }

  flipUi = () => {
    return new Promise((resolve, reject) => {
      Animated.timing(
        // Animate over time
        this.state.spinAnim, // The animated value to drive
        {
          toValue: 1, // Animate to opacity: 1 (opaque)
          duration: 1000, // Make it take a while
          easing: Easing.back(1),
          useNativeDriver: true
        }
      ).start((animation) => {
        if (animation.finished) {
          resolve()
        }
      }) // Starts the animation
    }).then(() => this.setState({
      spinAnim: new Animated.Value(0)
    }))
  };

  cameraExplosion = () => {
    return new Promise((resolve, reject) => {
      Animated.timing(
        // Animate over time
        this.state.explosionAnim, // The animated value to drive
        {
          toValue: 1, // Animate to opacity: 1 (opaque)
          duration: 600, // Make it take a while
          easing: Easing.elastic(4),
          useNativeDriver: true
        }
      ).start((animation) => {
        if (animation.finished) {
          Animated.timing(
            // Animate over time
            this.state.explosionAnim, // The animated value to drive
            {
              toValue: 0, // Animate to opacity: 1 (opaque)
              duration: 400, // Make it take a while
              useNativeDriver: true
            }
          ).start((animation) => {
            resolve()
          })
        }
      }); // Starts the animation
    })
  };

  async createCameraTexture() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA)
    const cameraRoll = await Permissions.askAsync(Permissions.CAMERA_ROLL)

    if (!status) {
      console.log('Denied camera permissions!')
      return
    }

    return this.glView.createCameraTextureAsync(this.camera)
  }

  async createTextureFromAsset(asset) {
    var gl
    var tex
    var texData
    var img

    gl = this.gl
    tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]))

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

    texData = {
      width: 1,
      height: 1,
      texture: tex,
    }

    texData.width = asset.width
    texData.height = asset.height

    gl.bindTexture(gl.TEXTURE_2D, texData.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset)

    return (texData)
  }

  onContextCreate = async gl => {
    this.gl = gl
    // Create texture asynchronously
    const cameraTexture = (this.texture = await this.createCameraTexture())

    // Compile vertex and fragment shaders
    const vertShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertShader, cameraVert)
    gl.compileShader(vertShader)

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragShader, cameraFrag)
    gl.compileShader(fragShader)

    // Link, use program, save and enable attributes
    const program = gl.createProgram()
    gl.attachShader(program, vertShader)
    gl.attachShader(program, fragShader)
    gl.linkProgram(program)
    gl.validateProgram(program)

    gl.useProgram(program)

    const timeLoc = gl.getUniformLocation(program, 'time')
    const zoomLoc = gl.getUniformLocation(program, 'zoom')

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

    const texData = await this.createTextureFromAsset(this._logo)

    // Activate unit 0
    gl.activeTexture(gl.TEXTURE0)
    // gl.activeTexture(gl.TEXTURE1)

    // Render loop
    const loop = () => {
      this._rafID = requestAnimationFrame(loop)

      gl.clearColor(0, 0, 1, 1)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      // gl.bindTexture(gl.TEXTURE_2D, texData.texture)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, cameraTexture)

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, texData.texture)
      // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset)
      // gl.bindTexture(gl.TEXTURE_2D, this._logo)
      // gl.bindTexture(gl.TEXTURE_2D, this._logo)
      gl.uniform1f(timeLoc, this._time)
      gl.uniform1f(zoomLoc, this.state.zoom)

      // Draw!
      gl.drawArrays(gl.TRIANGLES, 0, verts.length / 2)

      gl.endFrameEXP()

      this._time += 0.1
    }
    loop()
  }

  toggleFacing = () => {
    this.flipUi().then(() => {
      this.setState({
        type: this.state.type === Camera.Constants.Type.back
          ? Camera.Constants.Type.front
          : Camera.Constants.Type.back,
      })
    }).catch(() => { })
  }

  zoomOut = () => this.setState({ zoom: this.state.zoom + 0.1 })
  zoomIn = () => this.setState({ zoom: this.state.zoom - 0.1 })

  private uploadPhotoToStoryFeed = async (uri, text) => {
    if (text !== '' && text != null) {
      const base64 = await AssetUtils.base64forImageUriAsync(uri)
      const filename = Date.now() + '.phext'
      dbx.filesUpload({ path: '/' + filename, contents: `${text}###${base64.data}` })
    }
  }

  takePicture = async () => {
    this.cameraExplosion().catch(() => { })
    const test: any = GLView
    const image = await test.takeSnapshotAsync(this.gl, { compress: 0 })
    const saveResult = await CameraRoll.saveToCameraRoll(image.uri, 'photo')
    // this.uploadPhotoToStoryFeed(image.uri, 'Sug en fet')

    this.setState({ publishModalOpen: true, imgUri: image.uri })
  }

  cancelPublish = () => {
    this.setState({ publishModalOpen: false, imgUri: null })
    setTimeout(() => this.getCustomers(), 2000)
  }

  publish = (text: string) => {
    this.uploadPhotoToStoryFeed(this.state.imgUri, text)
    this.setState({ publishModalOpen: false })
    setTimeout(() => this.getCustomers(), 2000)
  }

  ref(refName: string) { return ref => this[refName] = ref }

  render() {
    return !this.state.storyFeed ? (
      <Animated.View style={{
        display: 'flex',
        flex: 1,
        transform: [{
          rotateX: this.state.spinAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
          })
        }]
      }}
      >
        <View style={styles.container}>
          <Camera
            style={{ width: 0, height: 0 }}
            ratio='16:9'
            type={this.state.type}
            // zoom={this.state.zoom}
            ref={this.ref('camera')}
          />

          <GLView
            style={{ position: 'absolute', top: 0, width: '100%', height: '100%', }}
            onContextCreate={this.onContextCreate}
            ref={this.ref('glView')}
          />

          <PublishToFeedModal open={this.state.publishModalOpen} cancel={this.cancelPublish} publish={this.publish} />

          <Animated.View
            pointerEvents='none'
            style={{
              position: 'absolute',
              height: 200,
              width: 200,
              zIndex: 10,
              bottom: 0,
              left: '50%',
              opacity: this.state.explosionAnim,
              transform: [
                { translateX: -100 },
              ]
            }}
          >
            <Image
              style={{ width: '100%', height: '100%' }}
              source={{ uri: 'https://vignette.wikia.nocookie.net/yandere-simulator/images/e/e9/COOL_EXPLOSION.gif/revision/latest?cb=20160419224508' }}
            />
          </Animated.View>

          <Image
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            source={{ uri: 'https://i.imgur.com/qTfJq6h.png' }}
          />

          <PublishToFeedModal open={this.state.publishModalOpen} cancel={this.cancelPublish} publish={this.publish} />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={this.takePicture} />
          </View>

          <TouchableOpacity style={{ width: 60, height: 60, position: 'absolute', right: 0, top: '12%' }} onPress={this.zoomIn} />
          <TouchableOpacity style={{ width: 60, height: 60, position: 'absolute', right: '17%', top: '12%' }} onPress={this.zoomOut} />
          <TouchableOpacity style={{ position: 'absolute', top: 26, left: 3 }} onPressOut={() => this.setState({ ...this.state, storyFeed: true })}>
            <Text style={{ color: 'white' }}>{'HTBS\nStoryFeed'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ width: 60, height: 60, position: 'absolute', left: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }} onPress={this.toggleFacing}>
            <Text style={{ color: '#fff', fontSize: 20 }}>Flip camera</Text>
          </TouchableOpacity>
        </View>
      </Animated.View >
    ) : <StoryFeed onExitStoryFeed={() => this.setState({ ...this.state, storyFeed: false })} />
  }

  private getCustomers() {
    const poll = Math.random()
    console.log(poll)
    if (poll < 0.4) {
      Alert.alert(
        'Thank you for using HTBS caemra! GET PREMIUM',
        'To remove watermarks, get even better features, support, and accelerated business-as-a-platform cloud based evolution solution advice, consider buying Premium! ',
        [
          { text: 'Ask me later', onPress: () => console.log('Ask me later pressed') },
          { text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
          { text: 'Scalable Cancel', onPress: () => console.log('OK Pressed'), style: 'cancel' }
        ],
        { cancelable: false }
      );
    }
  }

  private analyzePerson = () => {
    if (this.state.analyzingPerson) {
      return
    }

    this.setState({ analyzingPerson: true })

    const poll = Math.random()
    let trueBusinessAssociate = false
    if (poll < 0.5) {
      trueBusinessAssociate = true
    }

    const businessAssociateCallback = () => {
      setTimeout(() => {
        this.setState({ businessAssociateText: '', analyzingPerson: false })
      }, 3000)
    }

    this.setState({ showBusinessAssociateLoading: true })
    setTimeout(() => {
      this.setState({ showBusinessAssociateLoading: false })

      if (trueBusinessAssociate) {
        this.setState({ businessAssociateText: 'True businees logic associate!' }, businessAssociateCallback)
      } else {
        this.setState({ businessAssociateText: 'Not a logical business associate' }, businessAssociateCallback)
      }
    }, 3000)
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
