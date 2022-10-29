import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Divider, Header, Icon, Placeholder, Rail, Segment } from 'semantic-ui-react'
import { unsubscribe } from '../utils/reactHelper'
import { isSubjectLike, isFn } from '../utils/utils'
import ErrorBoundary from './CatchReactErrors'
import { Invertible } from './Invertible'
import Text from './Text'
import { toggleFullscreen } from '../services/window'

class ContentSegment extends Component {
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
		const { rxTrigger } = this.props
		this.subscription = isSubjectLike(rxTrigger)
			&& rxTrigger.subscribe(() => {
				const { contentProps } = this.props
				const content = this.getContent()
				this.setState({ content, contentProps: {...contentProps} })
			})
	}

	componentWillUnmount() {
		this._mounted = false
		unsubscribe(this.subscription)
	}

	getContent = props => {
		const { content: Content, contentProps } = props || this.props
		return isFn(Content) || Content['$$typeof'] === React.memo('div')['$$typeof']
			? <Content {...contentProps} />
			: Content || contentPlaceholder
	}

	toggleSubHeader = e => {
		e.preventDefault()
		e.stopPropagation()
		this.setState({ showSubHeader: !this.state.showSubHeader})
	}

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
		return !!active && (
			<Invertible {...{
				El: Segment,
				basic: basic,
				color: color,
				compact: !!compact,
				inverted,
				padded: true,
				style: { ...styles.segment, ...style },
				vertical: vertical,
			}}>
				<Rail internal position='right' close style={styles.closeButtonRail}>
					{name && (
						<Icon
							color='grey'
							link
							name='expand'//'expand arrows alternate' 'compress'
							onClick={() => {
								toggleFullscreen(`#main-content div[name="${name}"]`)
							}}
							size='mini'
							style={{ display: 'inline' }}
						/>
					)}

					{isFn(onClose) && (
						<Icon
							color='grey'
							link
							name='times circle outline'
							onClick={() => onClose(name)}
							size='mini'
							style={{ display: 'inline' }}
						/>
					)}
				</Rail>

				{!!headerText && (
					<Header as={headerTag || 'h2'} inverted={headerInverted}>
						{icon && <Icon name={icon} />}
						<Header.Content>
							<div>
								<Text>{headerText}</Text>
								{subHeader && (
									<Icon
										// className='text-deselect'
										color='grey'
										link
										name='question circle outline'
										onClick={this.toggleSubHeader}
										size='small'
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
			</Invertible>
		)
	}
}
ContentSegment.propTypes = {
	active: PropTypes.bool,
	basic: PropTypes.bool,
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
	// used to force trigger ContentSegment update
	rxTrigger: PropTypes.object,
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
export default React.memo(ContentSegment)

export const contentPlaceholder = (
	<Invertible El={Placeholder}>
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
	</Invertible>
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