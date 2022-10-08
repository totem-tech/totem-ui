import React from 'react'
import PropTypes from 'prop-types'
import { useInverted } from '../services/window'
import { objWithoutKeys } from '../utils/utils'

function Text(props) {
    let {
        color,
        El,
        ignoreAttributes,
        invertedColor,
        reverseInverted,
        style
    } = props
    const inverted = useInverted(reverseInverted)
    color = inverted
        ? invertedColor
        : color
    return (
        <El {...{
            ...objWithoutKeys(props, ignoreAttributes),
            color,
            style: {
                background: 'transparent',
                color,
                ...style,
            },
        }} />
    )
}
Text.propTypes = {
    // content
    children: PropTypes.any,
    color: PropTypes.string,
    El: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.string,
    ]).isRequired,
    ignoreAttributes: PropTypes.array.isRequired,
    invertedColor: PropTypes.string,
    // whether to reverse the value of inverted. See `useInverted` for more details
    reverseInverted: PropTypes.oneOfType([
        PropTypes.bool,
        PropTypes.string,
    ]),
}
Text.defaultProps = {
    color: 'black',
    El: 'span',
    ignoreAttributes: [
        'El',
        'ignoreAttributes',
        'invertedColor',
        'reverseInverted',
    ],
    invertedColor: 'white',
    reverseInverted: false,
}
export default React.memo(Text)