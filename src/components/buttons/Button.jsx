import React from 'react'
import { Button as _Button } from 'semantic-ui-react'
import { useInverted } from '../../services/window'
import { iUseReducer } from '../../utils/reactHelper'
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
	const [state, setState] = iUseReducer(null, { loading: false })
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
	const _inverted = useInverted()
	inverted = isBool(inverted)
		? inverted
		: !color
			&& !negative
			&& !positive
			&& !primary
			&& _inverted
	return (
		<_Button {...{
            ...props,
			inverted,
			disabled: disabled || state.loading,
			loading: loading || state.loading,
			onClick: async (...args) => {
				setState({ loading: true})
				isFn(onClick) && await onClick(...args)
				setState({ loading: false })
			},
		}} />
	)
})
Object
    .keys(_Button)
    .forEach(key => Button[key] = _Button[key])
export default Button