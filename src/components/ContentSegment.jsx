import React from 'react'
import PropTypes from 'prop-types'
import {ReactiveComponent, If} from 'oo7-react'
import { runtimeUp } from 'oo7-substrate'
import { Divider, Header, Icon, Placeholder, Rail, Segment } from 'semantic-ui-react'

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
      <Header as={this.props.headerTag || 'h2'} inverted={this.props.headerInverted}>
        <Icon name={this.props.icon} />        
        <Header.Content>
          <div>
            {headerText} 
            <Icon link name='question circle outline' color="grey" size="small" onClick={this.toggleSubHeader} />
          </div>
        </Header.Content>
          {this.state.showSubHeader && <Header.Subheader>{this.props.subHeader}</Header.Subheader>}
      </Header>
    )

    const closeBtn = (
      <Rail internal position='right' close style={styles.closeButtonRail}>
        <Icon link name='times circle outline' color="grey" size="mini" onClick={() => this.props.onClose(this.props.index)} />
      </Rail>
    )

    const segment = (
      <Segment
      color={this.props.color}
        compact={!!this.props.compact}
        inverted={this.props.inverted}
        padded
        vertical={this.props.vertical}>
        <If condition={typeof(this.props.onClose) === 'function'} then={closeBtn} />
        <If condition={!!headerText} then={header} />
        <If condition={!!headerText && !!this.props.headerDivider} then={<Divider />} />
        <div style={{ paddingBottom: this.props.paddingBottom }}>
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
  onClose: PropTypes.func,
  color: PropTypes.string,
  content: PropTypes.node,
  compact: PropTypes.bool,
  header: PropTypes.string,
  headerDivider: PropTypes.bool,
  headerInverted: PropTypes.bool,
  headerTag: PropTypes.string,
  icon:  PropTypes.string,
  index: PropTypes.number,
  inverted:  PropTypes.bool,
  paddingBottom: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  subHeader: PropTypes.string,
  title:  PropTypes.string,
  vertical: PropTypes.bool
}

ContentSegment.defaultProps = {
  compact: false,
  headerDivider: false,
  headerTag: 'h2',
  index: 0,
  paddingBottom: '1em',
  vertical: false
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
    marginTop: 0,
    marginRight: -12,
    padding: 0,
    fontSize: 50,
    width: 50
  }
}