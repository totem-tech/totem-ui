import React from 'react'
import PropTypes from 'prop-types'
import { translated } from '../../utils/languageHelper'
import ButtonGroup from './ButtonGroup'

const textsCap = {
	accept: 'accept',
	reject: 'reject',
}
translated(textsCap, true)

export const ButtonAcceptOrReject = React.memo(props => {
	const {
		acceptColor,
		acceptProps = {},
		acceptText,
		ignoreAttributes,
		loading,
		rejectColor,
		rejectProps = {},
		rejectText,
	} = props

	return (
		<ButtonGroup {...{
			...props,
			buttons: [
				{
					...acceptProps,
					content: acceptText || acceptProps.content,
					color: acceptColor || acceptProps.color,
					loading: loading || acceptProps.loading,
				},
				{
					...rejectProps,
					content: rejectText || rejectProps.content,
					color: rejectColor || rejectProps.color,
					loading: loading || rejectProps.loading,
				},
			],
			ignoreAttributes: [
				...ignoreAttributes,
				...ButtonAcceptOrReject.defaultProps.ignoreAttributes,
			],
			or: true,
			values: [true, false],
		}} />
	)
})
ButtonAcceptOrReject.propTypes = {
	acceptColor: PropTypes.string, // colors supported by SemanticUI buttons
	acceptText: PropTypes.string,
	ignoreAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
	// args: (event, true/false)
	onAction: PropTypes.func.isRequired,
	rejectColor: PropTypes.string, // colors supported by SemanticUI buttons
	rejectText: PropTypes.string,
}
ButtonAcceptOrReject.defaultProps = {
	acceptColor: 'blue',
	acceptText: textsCap.accept,
	ignoreAttributes: [
		'acceptColor',
		'acceptProps',
		'acceptText',
		'ignoreAttributes',
		'rejectColor',
		'rejectProps',
		'rejectText',
	],
	rejectColor: 'red',
	rejectText: textsCap.reject,
}
export default ButtonAcceptOrReject