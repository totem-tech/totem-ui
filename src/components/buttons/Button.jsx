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
		icon,
		inverted,
		loading,
		negative,
		onClick,
		positive,
		primary,
		title,
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
			icon: state.error
				? 'warning sign'
				:  icon,
			inverted,
			disabled: disabled || state.loading,
			loading: loading || state.loading,
			onClick: async (...args) => {
				let error = false
				setState({ error, loading: true })
				try {
					isFn(onClick) && await onClick(...args)
				} catch (err) {
					error = `${err}`
				} finally {
					setState({ error, loading: false })
				}
			},
			title: state.error || title,
		}} />
	)
})
Object
    .keys(_Button)
    .forEach(key => Button[key] = _Button[key])
export default Button