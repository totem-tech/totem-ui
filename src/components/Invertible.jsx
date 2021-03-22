import React from 'react'
import PropTypes from 'prop-types'
import { isFn, objWithoutKeys } from '../utils/utils'
import { useInverted } from '../services/window'

// Convert supported Semantic UI element into Invertible element
export default function Invertible(props) {
    const { asMemo, dynamicProps, El, ignoreAttributes, reverseInverted } = props
    const inverted = useInverted(reverseInverted)
    const Ele = asMemo && isFn(El) ? React.memo(El) : El
    return (
        <Ele {...{
            ...objWithoutKeys(props, ignoreAttributes),
            ...(isFn(dynamicProps) ? dynamicProps(inverted) : {}),
            inverted,
        }} />
    )
}
Invertible.propTypes = {
    asMemo: PropTypes.bool,
    // @dynamicProps add props based on inverted status
    dynamicProps: PropTypes.func,
    El: PropTypes.func.isRequired,
    ignoreAttributes: PropTypes.array.isRequired,
    reverseInverted: PropTypes.bool,
}
Invertible.defaultProps = {
    asMemo: false,
    ignoreAttributes: [
        'asMemo',
        'dynamicProps',
        'El',
        'ignoreAttributes',
        'reverseInverted'
    ],
}
Invertible.asCallback = (El, asMemo, reverseInverted) => props => <Invertible {...{
    ...props,
    asMemo,
    El,
    reverseInverted,
}} />