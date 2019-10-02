import React from 'react'
import PropTypes from 'prop-types'
import {ReactiveComponent, If} from 'oo7-react'
import { runtimeUp } from 'oo7-substrate'
import { Divider, Header, Icon, Placeholder, Rail, Segment } from 'semantic-ui-react'
import { isFn } from '../utils/utils'

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
		const {
			active,
			basic,
			color,
			compact,
			content,
			contentPadding,
			header,
			headerDivider,
			headerDividerHidden,
			headerTag,
			headerInverted,
			icon,
			index,
			inverted,
			onClose,
			style,
			subHeader,
			subHeaderDetails,
			title,
			vertical,
		} = this.props
		const { showSubHeader } = this.state

		const headerText = header || title

		return !active ? '' : (
			<Segment
				basic={basic}
				color={color}
				compact={!!compact}
				inverted={inverted}
				padded
				style={style}
				vertical={vertical}
			>
				{isFn(onClose) && (
					<Rail internal position='right' close style={styles.closeButtonRail}>
						<Icon 
							link 
							name='times circle outline' 
							color="grey" 
							size="mini" 
							onClick={() => onClose(index)} 
						/>
					</Rail>
				)}

				{!!headerText && (
					<Header as={headerTag || 'h2'} inverted={headerInverted}>
						{icon && <Icon name={icon} />}
						<Header.Content>
							<div>
								{headerText}
								{showSubHeader && (
									<Icon 
										link 
										name='question circle outline' 
										color="grey" 
										size="small" 
										onClick={this.toggleSubHeader} 
									/>
								)}
							</div>
						</Header.Content>
						{subHeaderDetails && (
							<React.Fragment>
								<Header.Subheader style={styles.subHeader}>
									{subHeader}
								</Header.Subheader>
								<div style={styles.subHeaderDetails}>
									{subHeaderDetails}
								</div>
							</React.Fragment>
						)}
					</Header>
				)}

				{!!headerText && !!headerDivider && <Divider hidden={!!headerDividerHidden} />}

				<div style={{ padding: contentPadding || 0 }}>
					{!!content ? content : placeholder}
				</div>
			</Segment>
		)
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