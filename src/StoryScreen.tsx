import * as React from 'react'
import { Component } from 'react'
import { ImageBackground, Text, View } from 'react-native'
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
export class StoryFeed extends Component<{}, State> {
  constructor(props) {
    super(props)
    this.state = { currentStoryFeed: 0, allStoryFeeds: [], photo: null, text: null }
    dbx.filesListFolder({ path: '' })
      .then((response) => {
        const results = response.entries.reverse()
        this.setState({ ...this.state, allStoryFeeds: results })
        this.getStoryFeed(results[0])
      })
  }
  getStoryFeed = async (storyObject) => {
    const uri = storyObject.path_display

    const shareObject = await dbx.sharingCreateSharedLink({ path: uri })
    const photo = await fetch(shareObject.url.replace('dl=0', 'dl=1'))
    const phext = await photo.text()
    this.setState({ ...this.state, photo: phext.split('###')[1], text: phext.split('###')[0] })

    // const photo = await dbx.filesDownload({path: uri})
    // this.setState({...this.state, text: photo.split('###')[0], photo: photo.split('###')[1] })
  }
  render() {
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