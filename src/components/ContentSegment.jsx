import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Divider, Header, Icon, Placeholder, Rail, Segment } from 'semantic-ui-react'
import ErrorBoundary from './CatchReactErrors'
import { isBond, isFn, isObj } from '../utils/utils'

export default class ContentSegment extends Component {
	constructor(props) {
		super(props)

		this.state = {
			content: this.getContent(props),
			contentArgs: props.contentArgs,
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
			const { contentArgs: argsS } = this.state
			const { contentArgs: argsP } = this.props
			const content = this.getContent()
			// if arguments changed then force re-render
			const doReRender = isObj(argsP) && JSON.stringify(argsS) === JSON.stringify(argsP)
			this.setState({ content: doReRender ? '' : content, contentArgs: argsP })

			doReRender && setTimeout(() => this.setState({ content }))
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
							onClick={() => onClose(name)}
						/>
					</Rail>
				)}

				{!!headerText && (
					<Header as={headerTag || 'h2'} inverted={headerInverted}>
						{icon && <Icon name={icon} />}
						<Header.Content>
							<div>
								{headerText}
								{subHeader && (
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
						{showSubHeader && (
							<React.Fragment>
								<Header.Subheader style={styles.subHeader}>
									{subHeader}
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
		marginTop: 8
	},
	subHeaderDetails: {
		fontWeight: 'normal',
		fontSize: 13,
		lineHeight: '20px',
		marginTop: 8
	}
}