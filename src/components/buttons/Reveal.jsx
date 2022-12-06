import React, {
	useCallback,
	useState,
} from 'react'
import PropTypes from 'prop-types'
import {
	deferred,
	isFn,
	isTouchable,
	objWithoutKeys,
} from '../../utils/utils'
import Holdable from '../Holdable'

const Reveal = React.memo(function Reveal(props){
	let {
		children,
		content = children,
		contentHidden,
		defaultVisible,
		defer,
		El,
		exclusive,
		ignoreAttributes,
		onClick,
		onMouseEnter,
		onMouseOver,
		onMouseOut,
		onMouseLeave,
		onTouchStart,
		ready,
		style,
		toggleOnClick,
		toggleOnHold,
		toggleOnHover,
	} = props
	const [visible, setVisible] = useState(defaultVisible)
	const getContent = useCallback(c => isFn(c) ? c() : c)
	const _setVisible = useCallback(
		defer > 0 
			? deferred(setVisible, defer)
			: setVisible,
		[setVisible]
	)
	const triggerEvent = useCallback((func, show) => async (...args) => {
		const _ready = await (isFn(ready) ? ready() : ready)
		if (!_ready) return

		isFn(func) && func(...args)
		_setVisible(show)
	}, [_setVisible, ready, visible])
	
	children = !visible
		? getContent(content)
		: exclusive
			? getContent(contentHidden)
			: [
				<span key='c'>{getContent(content)}</span>,
				<span {...{
					key: 'ch',
					onClick: !exclusive
						? undefined
						: (e => e.preventDefault() | e.stopPropagation())
				}}>
					{getContent(contentHidden)}
				</span>
			]

	const touchable = isTouchable()
	const elProps = {
		...objWithoutKeys(props, ignoreAttributes),
		children,
		...toggleOnClick && {
			onClick: !touchable
				? triggerEvent(onClick, !visible)
				: onClick,
			onTouchStart: touchable
				? triggerEvent(onTouchStart, !visible)
				: onTouchStart,
		},
		...toggleOnHover && {
			onMouseEnter: triggerEvent(onMouseEnter, true),
			onMouseLeave: triggerEvent(onMouseLeave, false),
			// onMouseOver: triggerEvent(onMouseOver, true),
			// onMouseOut:  triggerEvent(onMouseOut, false),
		},
		style: {
			cursor: 'pointer',
			...style,
		},
	}
	if (toggleOnHold) {
		elProps.El = El
		El = Holdable
		elProps.onHold = triggerEvent(null, !visible)
	}
	return <El {...elProps} />
})
Reveal.propTypes = {
	// content to show when visible
	content: PropTypes.any,
	// content to show when not visible
	contentHidden: PropTypes.any.isRequired,
	// initial state of `hiddenContent`
	defaultVisible: PropTypes.any,
	defer: PropTypes.number,
	El: PropTypes.oneOfType([
		PropTypes.elementType,
		PropTypes.func,
		PropTypes.string,
	]).isRequired,
	// whether to only display `content` and `hiddenContent` together or exclusively
	exclusive: PropTypes.bool,
	ignoreAttributes: PropTypes.arrayOf(PropTypes.string).isRequired,
	// will not display hiddenContent until ready is truthy
	ready: PropTypes.oneOfType([
		PropTypes.bool,
		PropTypes.func,
	]),
	// whether to trigger visibility on mouse click
	toggleOnClick: PropTypes.bool,
	// whether to triggler visibility on touch and hold
	toggleOnHold: PropTypes.bool,
	// whether to trigger visibility on mouse enter and leave
	toggleOnHover: PropTypes.bool,
}
Reveal.defaultProps = {
	defaultVisible: false,
	defer: 200,
	El: 'span',
	exclusive: true,
	ignoreAttributes: [
		'content',
		'contentHidden',
		'defaultVisible',
		'El',
		'exclusive',
		'onClick',
		'ready',
		'ignoreAttributes',
		'toggleOnClick',
		'toggleOnHold',
		'toggleOnHover',
	],
	ready: true,
	toggleOnClick: false,
	toggleOnHold: false,
	toggleOnHover: true,
}
export default React.memo(Reveal)