import * as React from 'react'
import { Component } from 'react'
import { ImageBackground, Text, View, TouchableOpacity } from 'react-native'
const Dropbox = require('dropbox').Dropbox

const dbx = new Dropbox({
  accessToken:
    'F9G1jrnCvJ0AAAAAAAAE-NQBkQDS1HiGPGDIAhc-wW0hgJ37HQ7hbSpqmQTQAwDF',
  fetch: fetch
})
interface State {
  currentStoryFeed: number
  allStoryFeeds: []
  photo: any
  text: string
}
export class StoryFeed extends Component<any, State> {
  private mounted = false
  constructor(props) {
    super(props)
    this.state = { currentStoryFeed: 0, allStoryFeeds: [], photo: null, text: null }
    dbx.filesListFolder({ path: '' })
      .then((response) => {
        let results = response.entries.reverse()
        results = results.filter(r => {
          let fileDate = new Date(r.client_modified)
          return (Date.now() - fileDate.getTime()) / 1000 / 60 / 60 / 24 < 1
        })
        this.setState({ ...this.state, allStoryFeeds: results })
        this.getStoryFeed(results[0])
      })
  }
  componentWillUnmount() {
    this.mounted = false
  }
  componentWillMount() {
    this.mounted = true
  }
  getStoryFeed = async (storyObject) => {
    const uri = storyObject.path_display
    console.log(storyObject)

    const shareObject = await dbx.sharingCreateSharedLink({ path: uri })
    const photo = await fetch(shareObject.url.replace('dl=0', 'dl=1'))
    const phext = await photo.text()
    if(!this.mounted) {
      return
    }
    this.setState({ ...this.state, photo: phext.split('###')[1], text: phext.split('###')[0] })

    // const photo = await dbx.filesDownload({path: uri})
    // this.setState({...this.state, text: photo.split('###')[0], photo: photo.split('###')[1] })
  }
  render() {
    const {onExitStoryFeed} = this.props
    return this.state.photo ? <View style={{ width: "100%", height: "100%" }} onTouchEnd={() => {
          if (this.state.allStoryFeeds[this.state.currentStoryFeed + 1]) {
            this.getStoryFeed(this.state.allStoryFeeds[this.state.currentStoryFeed + 1]);

            this.setState({
              ...this.state,
              currentStoryFeed: this.state.currentStoryFeed + 1,
              photo: null
            });
          }
        }}>

        <TouchableOpacity style={{zIndex: 100, position: 'absolute', top: 26, left: 3, backgroundColor: 'black' }} onPressOut={onExitStoryFeed}>
          <Text style={{ color: 'white' }}>{'HTBS\nCamera'}</Text>
        </TouchableOpacity>
        <ImageBackground source={{ uri: `data:image/png;base64,${this.state.photo}` }} style={{ width: "100%", height: "100%" }}>
          <View style={{ position: "absolute", bottom: 100, left: 20, backgroundColor: 'white' }}>
            <Text style={{fontSize: 20, color: 'black'}}>
              {this.state.text.match(/.{1,30}/g).join('\n')}
            </Text>
          </View>
        </ImageBackground>
      </View> : <Text style={{position: 'absolute', top: 100}}>Loading cloud images</Text>
  }  
}