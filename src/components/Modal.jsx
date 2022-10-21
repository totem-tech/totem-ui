import React from 'react'
import { Modal } from 'semantic-ui-react'
import { className } from '../utils/utils'
import { useInverted } from '../services/window'

// Invertible modal (since Semantic UI Modal doesn't have inverted property!!!)
const ModalInvertible = props => {
    const inverted = useInverted()
    props = {
        ...props,
        className: className([
            props.className,
            { inverted },
        ]),
    }
    return <Modal {...props} />
}
export default ModalInvertible