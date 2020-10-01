import React from 'react'
import PropTypes from 'prop-types'
import { isFn, objWithoutKeys } from '../utils/utils'
import { useInverted } from '../services/window'

// Convert supported Semantic UI element into Invertible element
export default function Invertible(props) {
    const { asMemo = false, El, reverseInverted } = props
    const inverted = useInverted(reverseInverted)
    const Ele = asMemo && isFn(El) ? React.memo(El) : El
    return (
        <Ele {...{
            ...objWithoutKeys(props, ignoredKeys),
            inverted,
        }} />
    )
}
Invertible.propTypes = {
    asMemo: PropTypes.bool,
    El: PropTypes.func.isRequired,
    reverseInverted: PropTypes.bool,
}
Invertible.defaultProps = {}
Invertible.asCallback = (El, asMemo, reverseInverted) => props => <Invertible {...{
    ...props,
    asMemo,
    El,
    reverseInverted,
}} />
const ignoredKeys = Object.keys(Invertible.propTypes)