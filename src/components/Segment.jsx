import React from 'react'
import { Segment as SemanticSegment } from 'semantic-ui-react'
import { useInverted } from '../services/window'
import { isBool } from '../utils/utils'

export default React.memo(props => {
    const inverted = isBool(props.inverted) ? props.inverted : useInverted()
    return <SemanticSegment {...{ ...props, inverted }} />
})