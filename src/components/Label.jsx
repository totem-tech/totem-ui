import React from 'react'
import { Label as SemanticLabel } from 'semantic-ui-react'
import { className } from '../utils/utils'
import { useInverted } from '../utils/window'

export default function Label(props) {
    const inverted = useInverted()

    return (
        <SemanticLabel {...{
            ...props,
            className: className({
                inverted,
                [props.className]: true,
            }),
            style: {
                background: inverted
                    ? '#333333'
                    : undefined,
                ...props.style,
            }
        }} />
    )
}