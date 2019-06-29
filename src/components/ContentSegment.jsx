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
          {this.state.showSubHeader && (
            <React.Fragment>
              <Header.Subheader style={styles.subHeader}>{this.props.subHeader}</Header.Subheader>
              <div style={styles.subHeaderDetails}>{this.props.subHeaderDetails}</div>
            </React.Fragment>
          )}
        </Header>
    )

    const closeBtn = (
      <Rail internal position='right' close style={styles.closeButtonRail}>
        <Icon link name='times circle outline' color="grey" size="mini" onClick={() => this.props.onClose(this.props.index)} />
      </Rail>
    )

    const segment = (
      <Segment
        basic={this.props.basic}
        color={this.props.color}
        compact={!!this.props.compact}
        inverted={this.props.inverted}
        padded
        style={this.props.style}
        vertical={this.props.vertical}>
        <If condition={typeof(this.props.onClose) === 'function'} then={closeBtn} />
        <If condition={!!headerText} then={header} />
        <If condition={!!headerText && !!this.props.headerDivider} then={<Divider hidden={!!this.props.headerDividerHidden} />} />
        <div style={{ padding: this.props.contentPadding }}>
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
  basic: PropTypes.bool,
  onClose: PropTypes.func,
  color: PropTypes.string,
  content: PropTypes.node,
  contentPadding: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  compact: PropTypes.bool,
  header: PropTypes.string,
  headerDivider: PropTypes.bool,
  headerDividerHidden: PropTypes.bool,
  headerInverted: PropTypes.bool,
  headerTag: PropTypes.string,
  icon:  PropTypes.string,
  index: PropTypes.number,
  inverted:  PropTypes.bool,
  subHeader: PropTypes.string,
  style: PropTypes.object,
  title:  PropTypes.string,
  vertical: PropTypes.bool
}

ContentSegment.defaultProps = {
  basic: false,
  compact: false,
  contentPadding: '0 0 1em 0',
  headerDivider: true,
  headerTag: 'h2',
  index: 0,
  style: {
    borderRadius: 2 
  },
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
  },
  subHeader: {
    marginTop: 10
  },
  subHeaderDetails: {
    fontWeight: 'normal',
    fontSize: 13,
    margin: 0
  }
}