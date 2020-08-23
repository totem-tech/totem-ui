import React from 'react'
import { useInverted } from '../services/window'
import { objWithoutKeys } from '../utils/utils'

export default React.memo(props => {
    const {
        children,
        color = 'black',
        EL = 'span',
        invertedColor = 'white',
        reverseInverted = false,
        style
    } = props
    const inverted = useInverted(reverseInverted)
    return (
        <EL {...{
            ...objWithoutKeys(props, ['reverseInverted']),
            style: {
                background: 'transparent',
                color: inverted ? invertedColor : color,
                ...style,
            },
        }}>
            {children}
        </EL>
    )
})