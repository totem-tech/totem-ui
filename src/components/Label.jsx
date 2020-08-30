import React from 'react'
import { Label } from 'semantic-ui-react'
import { useInverted } from '../services/window'
import { isBool, className, objWithoutKeys } from '../utils/utils'

export default React.memo(props => {
    const { inverted: inv, reverseInverted } = props
    const inverted = isBool(inv) ? inv : useInverted(reverseInverted)

    return <Label {...{
        ...objWithoutKeys(props, ['inverted', 'reverseInverted']),
        className: className([
            props.className,
            { inverted }
        ]),
    }} />
})