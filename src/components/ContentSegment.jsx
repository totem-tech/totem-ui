import React, { useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import {
	Divider,
	Header,
	Icon,
	Placeholder,
	Rail,
	Segment,
} from 'semantic-ui-react'
import uuid from 'uuid'
import {
	isMemo,
	iUseReducer,
	useRxSubject,
} from '../utils/reactjs'
import printElement from '../utils/reactjs/printElement'
import {
	isSubjectLike,
	isFn,
	isStr
} from '../utils/utils'
import { toggleFullscreen } from '../utils/window'
import ErrorBoundary from './CatchReactErrors'
import { Invertible } from './Invertible'
import Text from './Text'

const ContentSegment = props => {
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
		print = true, // css selector or true
		printSize, // force print page layout to "portrait" or "landscape"
		rxTrigger,
		settings,
		style,
		subHeader,
		subHeaderDetails,
		title,
		vertical,
	} = props
	const id = useMemo(() => `content-segment-${uuid.v1()}`, [])
	const getContent = useCallback(() => {
		const {
			content: Content,
			contentProps,
		} = props

		return isFn(Content) || isMemo(Content)
			? <Content {...contentProps} />
			: Content || contentPlaceholder
	}, [props])
	const [state, setState] = iUseReducer(null, {
		content: getContent(),
		contentProps: props.contentProps,
		showSettings: false,
		showSubHeader: false,
	})
	if (!active) return ''

	const {
		content,
		contentProps,
		showSettings,
		showSubHeader,
	} = state
	const headerText = header || title
	const _settings = active && (
		isFn(settings)
			? settings(contentProps)
			: settings
	)

	// subscribe to changes on content component props
	isSubjectLike(rxTrigger) && useRxSubject(rxTrigger, () => {
		const { contentProps } = props
		const content = getContent()
		setState({
			content,
			contentProps: { ...contentProps },
		})
	})

	const printIcon = print && (
		<Icon {...{
			color: 'grey',
			link: true,
			name: 'print',
			onClick: () => {
				const content = document.getElementById(id)
				if (!content) return
				const printStyle = printSize && `
				@media print { 
					@page {
						size: ${printSize}
					}
				}`
				const styles = `
				.no-print { display: none !important; }
				.content-segment { height: initial !important; }
				${printStyle || ''}				
				`
				printElement(
					print && isStr(print)
						? print
						: '#' + id,
					undefined,
					styles,
				)
			},
			size: 'mini',
			style: { display: 'inline' },
		}} />
	)

	return (
		<Invertible {...{
			basic: basic,
			className: 'content-segment',
			color: color,
			compact: !!compact,
			El: Segment,
			id,
			inverted,
			padded: true,
			style: { ...styles.segment, ...style },
			vertical: vertical,
		}}>
			<Rail {...{
				className: 'no-print',
				close: true,
				internal: true,
				position: 'right',
				style: styles.topRightContainer
			}}>
				{printIcon}

				{name && ( // full screen icon
					<Icon {...{
						color: 'grey',
						link: true,
						name: 'expand',//'expand arrows alternate' 'compress'
						onClick: () => toggleFullscreen(`#main-content div#${name}`),
						size: 'mini',
						style: { display: 'inline' },
					}} />
				)}

				{isFn(onClose) && ( // close icon
					<Icon {...{
						color: 'grey',
						link: true,
						name: 'times circle outline',
						onClick: () => onClose(name),
						size: 'mini',
						style: { display: 'inline' },
					}} />
				)}
			</Rail>

			{!!headerText && (
				<Header as={headerTag || 'h2'} inverted={headerInverted}>
					{icon && <Icon name={icon} />}
					<Header.Content>
						<div>
							<Text style={{ paddingRight: 5 }}>
								{headerText}
							</Text>
							<span className='no-print'>
								{subHeader && (
									<Icon {...{
										// className='text-deselect'
										className: 'no-margin',
										color: showSubHeader ? undefined : 'grey',
										link: true,
										loading: showSubHeader,
										name: 'question circle outline',
										onClick: () => setState({
											showSettings: false,
											showSubHeader: !showSubHeader,
										}),
										size: 'small',
									}} />
								)}
								{!!_settings && (
									<Icon {...{
										// className='text-deselect'
										className: 'no-margin',
										color: showSettings ? undefined : 'grey',
										link: true,
										loading: showSettings,
										name: 'cog',
										onClick: () => setState({
											showSettings: !showSettings,
											showSubHeader: false,
										}),
										size: 'small',
									}} />
								)}
							</span>
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
					{showSettings && (
						<Header.Subheader style={styles.subHeader}>
							<Text>{_settings}</Text>
						</Header.Subheader>
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
	topRightContainer: {
		fontSize: 50,
		height: 40,
		marginTop: 0,
		// marginRight: 25,
		padding: 0,
		maxHeight: 40,
		// width: 50,
		width: 'auto',
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