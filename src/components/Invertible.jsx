import React from 'react'
import PropTypes from 'prop-types'
import { isFn, objWithoutKeys } from '../utils/utils'
import { useInverted } from '../utils/window'

// Convert supported Semantic UI element into Invertible element
export function Invertible(props) {
    const { asMemo, dynamicProps, El, ignoreAttributes, reverseInverted } = props
    const inverted = useInverted(reverseInverted)
    const ElMemo = asMemo ? React.memo(El) : El
    return (
        <ElMemo {...{
            ...objWithoutKeys(props, ignoreAttributes),
            ...(isFn(dynamicProps) ? dynamicProps(inverted) : {}),
            inverted,
        }} />
    )
}
Invertible.propTypes = {
    // @dynamicProps add props based on inverted status
    dynamicProps: PropTypes.func,
    El: PropTypes.elementType.isRequired,
    ignoreAttributes: PropTypes.array.isRequired,
    reverseInverted: PropTypes.bool,
}
Invertible.defaultProps = {
    ignoreAttributes: [
        'asMemo',
        'dynamicProps',
        'El',
        'ignoreAttributes',
        'reverseInverted'
    ],
}
Invertible.asComponent = (El, reverseInverted) => props => (
    <Invertible {...{ ...props, El, reverseInverted }} />
)
// export const InvertibleMemo = React.memo((props) => (
//     <Invertible {...{ ...props, asMemo: true }} />
// ))
// InvertibleMemo.getComponent = (El, reverseInverted) => props => (
//     <InvertibleMemo {...{ ...props, El, reverseInverted }} />
// )
export default Invertible