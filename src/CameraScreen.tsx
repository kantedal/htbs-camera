import { Camera, FileSystem, Permissions } from 'expo'
import { GLSL, Node, Shaders } from 'gl-react'
import * as GLView from 'gl-react-expo'
import * as React from 'react'
import { Component } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

const Dropbox = require('dropbox').Dropbox

const dbx = new Dropbox({
  accessToken:
    'F9G1jrnCvJ0AAAAAAAAE-NQBkQDS1HiGPGDIAhc-wW0hgJ37HQ7hbSpqmQTQAwDF',
  fetch: fetch
})

interface State {
  analyzingPerson: boolean
  businessAssociateText: string
  cameraType: string; // TODO Camera.Constants.Type,
  hasPermissionToCamera: boolean | undefined;
  path: string;
  flashActive: boolean;
  spinDegree: any;
  showBusinessAssociateLoading: boolean
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
});

export class CameraScreen extends Component<{}, State> {
  private _timer: any;
  private _camera: any;

  constructor(props: {}, context?: any) {
    super(props, context);

    this.state = {
      analyzingPerson: false,
      businessAssociateText: '',
      cameraType: "back",
      flashActive: false,
      hasPermissionToCamera: undefined,
      path: null,
      spinDegree: new Animated.Value(0),
      showBusinessAssociateLoading: false
    };
  }

  private flipUi = () => {
    return Animated.timing(
      // Animate over time
      this.state.spinDegree, // The animated value to drive
      {
        toValue: 1, // Animate to opacity: 1 (opaque)
        duration: 1000, // Make it take a while
        easing: Easing.back(1)
      }
    ).start(); // Starts the animation
  };

  private onLayout = event => this.start();

  private refreshPic = async () => {
    if (this._camera) {
      try {
        const photo = await this._camera.takePictureAsync({ quality: 0.05, base64: false, exif: false })
        console.log(photo.uri)
        this.setState({ path: photo.uri })
      } catch (e) {
        console.log(e)
      }
    }

    requestAnimationFrame(this.refreshPic)
  }
  private uploadPhotoToStoryFeed = async (photo, text) => {
    const filename = Date.now() + '.jpg'
    console.log(photo.base64.substring(0, 100))
    dbx.filesUpload({
      path: "/" + filename,
      //contents: JSON.stringify(photo)
      //contents: "data:image/jpeg;base64," + photo.base64
      contents: `${text}###${photo.base64}`
    })
  }
  private takePicture = async () => await this._camera.takePictureAsync({ base64: true, quality: 0.1 })

  private async start() {
    setTimeout(() => this.refreshPic(), 100)
  }

  public async componentWillMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA)
    FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'photos').catch(e => {
      console.log(e, 'Directory exists');
    });
    this.setState({
      hasPermissionToCamera: status === "granted"
    });
  }

  public render() {
    if (this.state.hasPermissionToCamera === undefined) {
      return <Text>Getting permission to access the camera.</Text>;
    }

    if (this.state.hasPermissionToCamera === false) {
      return <Text>No access to the camera.</Text>;
    }
    console.log(this.state.spinDegree);

    const { FlashMode } = Camera.Constants;

    return (
      <Animated.View
        style={{
          flex: 1,
          transform: [
            {
              rotateX: this.state.spinDegree.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "360deg"]
              })
            }
          ]
        }}
      >
        <Camera
          style={{ flex: 1 }}
          type={this.state.cameraType}
          ref={cam => this._camera = cam}
          onFacesDetected={() => this.analyzePerson()}
          flashMode={this.state.flashActive ? FlashMode.on : FlashMode.off}
        // captureQuality={Camera.Constants.CaptureQuality['720p']}
        // aspect={Camera.Constants.Aspect.fill}
        >
          <View
            style={{
              backgroundColor: "transparent",
              flex: 1,
              flexDirection: "row"
            }}
          >
            <Image
              style={{ width: "100%", height: "100%", position: "absolute" }}
              source={{ uri: "https://i.imgur.com/qTfJq6h.png" }}
            />
            <View style={{ position: 'absolute', bottom: 0, width: '100%', height: 65, justifyContent: 'center', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={async () => this.uploadPhotoToStoryFeed(await this.takePicture(), "Test")}
                style={{ width: 160, height: 65, position: 'absolute' }}
              />
            </View>
            <TouchableOpacity
              onPress={() => this.toggleCameraType()}
              style={{
                alignItems: "center",
                alignSelf: "flex-end",
                flex: 0.1
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  marginBottom: 10
                }}
              >
                Flip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => this.toggleCameraFlash()}
              style={{
                alignItems: "center",
                alignSelf: "flex-end",
                flex: 0.2
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  marginBottom: 10
                  // width: '40%'
                }}
              >
                {" "}
                {this.state.flashActive ? "Flash on" : "Flash off"}{" "}
              </Text>
            </TouchableOpacity>
            <View>
              {this.state.showBusinessAssociateLoading ?
                <ActivityIndicator
                  size="large"
                  color="#0000ff"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: '50%'
                  }}
                /> : null}
              <Text
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: '50%',
                  color: 'white',
                  fontSize: 14
                }}
              >
                {' '}{this.state.businessAssociateText.length > 0 ? this.state.businessAssociateText : null}{' '}
              </Text>
            </View>
          </View>
        </Camera>
        {/* <GLView.Surface style={{ width: 100, height: 100 }}>
            <Node shader={shaders.Saturate} uniforms={{ contrast: 1, saturation: 2, brightness: 1, t: { uri: 'https://i.imgur.com/uTP9Xfr.jpg' } }} />
          </GLView.Surface> */}
      </Animated.View>
    );
  }

  private getCustomars() {
    const poll = Math.random();
    if (poll < 0.15) {
      Alert.alert(
        'Thank you for using HTBS caemra! GET PREMIUM',
        'To get even better features, support, and accelerated business-as-a-platform cloud based evolution solution advice, consider buying Premium! ',
        [
          {
            text: 'Ask me later',
            onPress: () => console.log('Ask me later pressed')
          },
          {
            text: 'Cancel',
            onPress: () => console.log('Cancel Pressed'),
            style: 'cancel'
          },
          {
            text: 'Scalable Cancel',
            onPress: () => console.log('OK Pressed'),
            style: 'cancel'
          }
        ],
        { cancelable: false }
      );
    }
  }

  private analyzePerson() {
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

  private toggleCameraType() {
    this.flipUi();
    setTimeout(() => {
      this.setState({
        // TODO
        // cameraType: this.state.cameraType === Camera.Constants.Type.back
        //   ? Camera.Constants.Type.front
        //   : Camera.Constants.Type.back
        spinDegree: new Animated.Value(0),
        cameraType: this.state.cameraType === 'back' ? 'front' : 'back'
      });
    }, 1000);

    this.getCustomars();
  }

  private toggleCameraFlash() {
    this.setState({ flashActive: !this.state.flashActive });
    this.getCustomars();
  }
}
