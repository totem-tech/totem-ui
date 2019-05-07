import React from 'react'
import {ReactiveComponent, If} from 'oo7-react'
import { runtimeUp } from 'oo7-substrate'
import { Icon, Header, Image, Segment } from 'semantic-ui-react'
const placeholderImage =
  'https://react.semantic-ui.com/images/wireframe/paragraph.png'


const style = {
  color: 'white',
  background: 'none',
  borderColor: 'white',
  borderWidth: 5,
  borderRadius: 7,
  margin: '1em'
}

class ContentSegment extends ReactiveComponent {
  constructor(props) {
    super(props, {ensureRuntime: runtimeUp})
  }

  render() {
    const headerText = this.props.header || this.props.title
    const header = (
      <Header as="h1" inverted>
        <Icon name={this.props.icon} />
        <Header.Content>
          <div>{headerText}</div>
          {!!this.props.subHeader && <Header.Subheader>{this.props.subHeader}</Header.Subheader>}
        </Header.Content>
      </Header>
    )
    const segment = (
      <Segment style={style} padded>
        {headerText && header }
        <div style={{ paddingBottom: '1em' }}>
          {this.props.content || <Image src={placeholderImage} />}
        </div>
      </Segment>
    )
    return <If condition={this.props.active} then={segment} />
  }
} 

export default ContentSegment

