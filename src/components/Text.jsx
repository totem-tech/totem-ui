import React from 'react'
import { useInverted } from '../services/window'

export default React.memo(props => {
    const {
        className,
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
            className,
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