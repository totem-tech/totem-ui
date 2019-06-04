import React from 'react'
import PropTypes from 'prop-types'
import {ReactiveComponent, If} from 'oo7-react'
import { runtimeUp } from 'oo7-substrate'
import { Button, Header, Icon, Placeholder, Rail, Segment } from 'semantic-ui-react'

class ContentSegment extends ReactiveComponent {
  constructor(props) {
    super(props, {ensureRuntimeUp: runtimeUp})
    this.state = {
      showSubHeader: false
    }
    this.toggleSubHeader = this.toggleSubHeader.bind(this)
  }

  toggleSubHeader() {
    this.setState({showSubHeader: !this.state.showSubHeader})
  }

  render() {
    const headerText = this.props.header || this.props.title
    const header = (
      <Header as="h1" inverted={this.props.headerInverted}>
        <Icon name={this.props.icon} />
        <Header.Content>
          <div>
            {headerText} 
            <Icon link name='help' size="mini" onClick={this.toggleSubHeader} />
          </div>
          {this.state.showSubHeader && <Header.Subheader>{this.props.subHeader}</Header.Subheader>}
        </Header.Content>
      </Header>
    )
    const segment = (
      <Segment padded color={this.props.color} inverted={this.props.inverted}>
        <Rail internal position='right' close style={styles.closeButtonRail}>
            <Button
              icon="close"
              color="black"
              title={'Close ' + headerText}
              onClick={() => this.props.onClose(this.props.index)}
            >
            </Button>
        </Rail>
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

ContentSegment.propTypes = {
  active: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  color: PropTypes.string,
  content: PropTypes.node,
  header: PropTypes.string,
  headerInverted: PropTypes.bool,
  icon:  PropTypes.string,
  index: PropTypes.number.isRequired,
  inverted:  PropTypes.bool,
  subHeader: PropTypes.string,
  title:  PropTypes.string
}


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

const styles = {
  closeButtonRail: {
    padding: 0,
    fontSize: 30,
    width: 38
  }
}