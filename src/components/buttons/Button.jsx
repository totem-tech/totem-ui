import React, { useState } from 'react'
import { Button as _Button } from 'semantic-ui-react'
import { useInverted } from '../../services/window'
import { isBool, isFn } from '../../utils/utils'

/**
 * @name	Button
 * @summary an extension of the Semantic UI Button that automatically disables the button and shows loading spinner while the onClick is being executed.
 * 
 * @param	{Object}	props Button props
 * 
 * @returns {Element}
 */
const Button = React.memo(props => {
	const [_loading, setLoading] = useState(false)
	let {
		color,
		disabled,
		inverted,
		loading,
		negative,
		onClick,
		positive,
		primary,
	} = props
	inverted = isBool(inverted)
		? inverted
		: !color
			&& !negative
			&& !positive
			&& !primary
			&& useInverted()
	return (
		<_Button {...{
            ...props,
			inverted,
			disabled: disabled || _loading,
			loading: loading || _loading,
			onClick: async (...args) => {
				setLoading(true)
				isFn(onClick) && await onClick(...args)
				setLoading(false)
			},
		}} />
	)
})
Object
    .keys(_Button)
    .forEach(key => Button[key] = _Button[key])
export default Button