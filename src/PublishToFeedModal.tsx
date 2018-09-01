import * as React from 'react'
import { Modal, View, Text, TouchableHighlight, TextInput } from 'react-native'

namespace PublishToFeedModal {
  export interface Props {
    open: boolean
    publish: (text: string) => void
    cancel: () => void
  }
  export interface State {
    text: string
  }
}

class PublishToFeedModal extends React.Component<PublishToFeedModal.Props, PublishToFeedModal.State> {
  state: PublishToFeedModal.State = { text: '' }

  render() {
    const { } = this.state
    return (
      <Modal animationType={'slide'} transparent={true} visible={this.props.open}>
        <View style={{ justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5 }}>
          <View style={{ backgroundColor: '#fff', width: 300, height: 200, padding: 10, flexDirection: 'column' }}>
            <Text style={{ fontSize: 20 }}>Publish to HTBS Story Feed?</Text>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <TextInput
                style={{ height: 50, fontSize: 15, padding: 5, width: '100%' }}
                placeholder='Say something about your photo...'
                onChangeText={(text) => this.setState({ text })}
              />
            </View>

            <View style={{ flexDirection: 'row' }}>
              <TouchableHighlight style={{ height: 50, flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={this.props.cancel}>
                <Text style={{ fontSize: 20 }}>No</Text>
              </TouchableHighlight>

              <TouchableHighlight style={{ height: 50, flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={() => this.props.publish(this.state.text)}>
                <Text style={{ fontSize: 20 }}>Yes</Text>
              </TouchableHighlight>
            </View>
          </View>
        </View>
      </Modal >
    )
  }
}

export default PublishToFeedModal
