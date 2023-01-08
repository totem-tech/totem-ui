import React, { isValidElement, useState } from 'react'
import PropTypes from 'prop-types'
import { isFn, objWithoutKeys } from '../../utils/utils'
import { translated } from '../../services/language'
import { useInverted } from '../../services/window'
import Button from './Button'
import { iUseState } from '../../utils/reactHelper'

let textsCap = {
	or: 'or',
}
textsCap = translated(textsCap, true)[1]

/**
 * @name    ButtonGroup
 * @summary Shorthand for Or button group
 *
 * @param   {Object}    props see `ButtonGroup.propTypes` for accepted props
 *
 * @returns {Element}
 */
const ButtonGroup = (props) => {
	const inverted = useInverted()
	const {
		buttons,
		disabled,
		El,
		ignoreAttributes,
		loading: loadingP,
		onAction,
		or,
		orText,
		values = [],
	} = props
	const [{ loading, index }, setLoading] = iUseState({})
	const buttonsEl = buttons.map((button, i) => {
		button = (isValidElement(button)
			? button.props
			: button)
		return [
			or && i > 0 && (
				<Button.Or {...{
					key: 'or',
					onClick: e => e.stopPropagation(),
					text: orText,
				}} />
			),
			<Button {...{
				key: 'btn',
				...button,
				disabled: button.disabled
					|| disabled
					|| loading,
				loading: button.loading
					|| loadingP
					|| (loading && index === i),
				onClick: async (event) => {
					event.stopPropagation()
					event.preventDefault()
					setLoading({ loading: true, index: i })
					try {
						isFn(button.onClick) && await button.onClick(event, values[i])
						isFn(onAction) && await onAction(event, values[i])
					} catch (err) {
						console.warn('ButtonGroup: unexpected error occured while executing onAction.', err)
					} finally {
						setLoading({ loading: false, index: null })
					}
				},
			}} />,
		].filter(Boolean)
	})
	return (
		<El {...objWithoutKeys(
			{
				...props,
				children: buttonsEl,
				inverted,
			},
			[
				...ignoreAttributes,
				...ButtonGroup.defaultProps.ignoreAttributes,
			],
		)} />
	)
}
ButtonGroup.propTypes = {
	buttons: PropTypes.arrayOf(PropTypes.object).isRequired,
	El: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.func,
	]).isRequired,
	ignoreAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
	loading: PropTypes.bool,
	// @onAction triggered whenever any of the @buttons are clicked.
	//          Arguments:
	//          @value  value specified for the button in the @values array
	//          @event  synthetic event
	onAction: PropTypes.func,
	or: PropTypes.bool,
	orText: PropTypes.string,
	// @values: specific value to be passed on when @onClick is triggered for the respective button index
	values: PropTypes.array,
}
ButtonGroup.defaultProps = {
	buttons: [],
	El: Button.Group,
	ignoreAttributes: [
		'buttons',
		'El',
		'ignoreAttributes',
		'loading',
		'onAction',
		'or',
		'orText',
		'values',
	],
	orText: textsCap.or.toLowerCase(),
}
export default React.memo(ButtonGroup)