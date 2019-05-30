import React from 'react'
import {ReactiveComponent, If} from 'oo7-react'
import { runtimeUp } from 'oo7-substrate'
import { Icon, Header, Placeholder, Segment } from 'semantic-ui-react'

class ContentSegment extends ReactiveComponent {
  constructor(props) {
    super(props, {ensureRuntimeUp: runtimeUp})
  }

  render() {
    const headerText = this.props.header || this.props.title
    const header = (
      <Header as="h1" inverted={this.props.headerInverted}>
        <Icon name={this.props.icon} />
        <Header.Content>
          <div>{headerText}</div>
          {!!this.props.subHeader && <Header.Subheader>{this.props.subHeader}</Header.Subheader>}
        </Header.Content>
      </Header>
    )
    const segment = (
      <Segment padded color={this.props.color} inverted={this.props.inverted}>
        <If condition={!!headerText} then={header} />
        <div style={{ paddingBottom: '1em' }}>
          <If condition={!!this.props.content} then={this.props.content} else={placeholder} />
        </div>
      </Segment>
    )
    return <If condition={this.props.active} then={segment} />
  }
} 

export default ContentSegment


const placeholder = (
  <Placeholder>
    <Placeholder.Paragraph>
      <Placeholder.Line />
      <Placeholder.Line />
      <Placeholder.Line />
      <Placeholder.Line />
      <Placeholder.Line />
      <Placeholder.Line />
      <Placeholder.Line />
      <Placeholder.Line />
    </Placeholder.Paragraph>
  </Placeholder>
)