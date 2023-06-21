import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'
import { Button } from 'semantic-ui-react'
import { objWithoutKeys } from '../../utils/utils'

export const ButtonDelayed = React.memo(props => {
    const {
        content,
        children,
        El,
        seconds: sec,
        ignoreAttributes: ia = [],
    } = props
    const [seconds, setSeconds] = useState(parseInt(sec) || 3)

    useEffect(() => {
        let mounted = true
        seconds >= 0 && setTimeout(
            () => mounted && setSeconds(seconds - 1),
            1000,
        )
        return () => {
            mounted = false
        }
    }, [seconds])

    const _children = (
        <React.Fragment>
            {content || children}
            {seconds > 0 && ` (${seconds})`}
        </React.Fragment>
    )
    props = {
        ...objWithoutKeys(props, ia),
        // use either content or children whichever is supplied in the props
        children: children && _children || undefined,
        content: content && _children || undefined,
        disabled: seconds > 0,
    }

    return <El {...props} />
})
ButtonDelayed.propTypes = {
    seconds: PropTypes.number,
    El: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.elementType,
    ]),
    ignoreAttributes: PropTypes.array,
}
ButtonDelayed.defaultProps = {
    seconds: 3,
    El: Button,
    ignoreAttributes: [
        'seconds',
        'El',
        'ignoreAttributes',
    ],
}
export default ButtonDelayed
