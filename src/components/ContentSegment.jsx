import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Divider, Header, Icon, Placeholder, Rail } from 'semantic-ui-react'
import ErrorBoundary from './CatchReactErrors'
import Segment from './Segment'
import Text from './Text'
import { isBond, isFn } from '../utils/utils'
import { toggleFullscreen } from '../services/window'

export default class ContentSegment extends Component {
	constructor(props) {
		super(props)

		this.state = {
			content: this.getContent(props),
			contentProps: props.contentProps,
			showSubHeader: false,
		}
		this.originalSetState = this.setState
		this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
	}

	componentWillMount() {
		this._mounted = true
		const { bond } = this.props
		if (!isBond(bond)) return
		this.tieId = bond.tie(() => {
			const { contentProps } = this.props
			const content = this.getContent()
			this.setState({ content, contentProps })
		})
	}

	componentWillUnmount() {
		this._mounted = false
		const { bond } = this.props
		isBond(bond) && bond.untie(this.tieId)
	}

	getContent = props => {
		const { content, contentProps } = props || this.props
		const ContentEl = isFn(content) ? content : undefined
		return (!!ContentEl ? <ContentEl {...contentProps} /> : content) || placeholder
	}

	toggleSubHeader = () => this.setState({ showSubHeader: !this.state.showSubHeader })

	render() {
		const {
			active,
			basic,
			color,
			compact,
			contentPadding,
			header,
			headerDivider,
			headerDividerHidden,
			headerTag,
			headerInverted,
			icon,
			inverted,
			name,
			onClose,
			style,
			subHeader,
			subHeaderDetails,
			title,
			vertical,
		} = this.props
		const { content, showSubHeader } = this.state
		const headerText = header || title

		return !active ? '' : (
			<Segment
				basic={basic}
				color={color}
				compact={!!compact}
				inverted={inverted}
				padded
				style={{ ...styles.segment, ...style }}
				vertical={vertical}
			>
				{isFn(onClose) && (
					<Rail internal position='right' close style={styles.closeButtonRail}>
						<Icon
							color='grey'
							link
							name='expand arrows alternate'
							onClick={() => toggleFullscreen(`.main-content div[name="${name}"]`)}
							size='mini'
							style={{ display: 'inline' }}
						/>
						<Icon
							color='grey'
							link
							name='times circle outline'
							onClick={() => onClose(name)}
							size='mini'
							style={{ display: 'inline' }}
						/>
					</Rail>
				)}

				{!!headerText && (
					<Header as={headerTag || 'h2'} inverted={headerInverted}>
						{icon && <Icon name={icon} />}
						<Header.Content>
							<div>
								<Text>{headerText}</Text>
								{subHeader && (
									<Icon
										link
										name='question circle outline'
										color='grey'
										size='small'
										onClick={this.toggleSubHeader}
									/>
								)}
							</div>
						</Header.Content>
						{showSubHeader && (
							<React.Fragment>
								<Header.Subheader style={styles.subHeader}>
									<Text>{subHeader}</Text>
								</Header.Subheader>
								{subHeaderDetails && (
									<div style={styles.subHeaderDetails}>
										{subHeaderDetails}
									</div>
								)}
							</React.Fragment>
						)}
					</Header>
				)}

				{!!headerText && !!headerDivider && <Divider hidden={!!headerDividerHidden} />}

				<div style={{ padding: contentPadding || 0 }}>
					<ErrorBoundary>{content}</ErrorBoundary>
				</div>
			</Segment>
		)
	}
}

ContentSegment.propTypes = {
	active: PropTypes.bool,
	basic: PropTypes.bool,
	// used to force trigger ContentSegment update
	bond: PropTypes.object,
	onClose: PropTypes.func,
	color: PropTypes.string,
	content: PropTypes.oneOfType([
		PropTypes.element,
		PropTypes.elementType,
		PropTypes.node,
		PropTypes.string,
	]),
	contentPadding: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.number
	]),
	// arguments to supply to content element, if @content is a component class/function
	contentProps: PropTypes.object,
	compact: PropTypes.bool,
	header: PropTypes.string,
	headerDivider: PropTypes.bool,
	headerDividerHidden: PropTypes.bool,
	headerInverted: PropTypes.bool,
	headerTag: PropTypes.string,
	icon: PropTypes.string,
	index: PropTypes.number, // unused
	inverted: PropTypes.bool,
	name: PropTypes.string,
	subHeader: PropTypes.string,
	style: PropTypes.object,
	title: PropTypes.string,
	vertical: PropTypes.bool
}

ContentSegment.defaultProps = {
	basic: false,
	compact: false,
	contentPadding: '0 0 1em 0',
	headerDivider: true,
	headerTag: 'h2',
	index: 0,
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
	segment: {
		overflow: 'auto',
	},
	closeButtonRail: {
		marginTop: 0,
		marginRight: 25,
		padding: 0,
		fontSize: 50,
		width: 50,
		height: 40,
		maxHeight: 40,
	},
	subHeader: {
		marginTop: 8
	},
	subHeaderDetails: {
		fontWeight: 'normal',
		fontSize: 13,
		lineHeight: '20px',
		marginTop: 8
	}
}