import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { useRxSubject } from '../utils/reactHelper'

const RxSubject = props => {
    const {
        allowMerge,
        allowSubjectUpdate,
        initialValue,
        subject,
        valueModifier,
    } = props
    const [value = ''] = useRxSubject(
        subject,
        valueModifier,
        initialValue,
        allowMerge,
        allowSubjectUpdate,
    )
    
    return value
}
RxSubject.propTypes = {
    allowMerge: PropTypes.bool,
    allowSubjectUpdate: PropTypes.bool,
    initialValue: PropTypes.any,
    subject: PropTypes.oneOfType([
        PropTypes.instanceOf(BehaviorSubject),
        PropTypes.any,
    ]).isRequired,
    valueModifier: PropTypes.func,
}
export default React.memo(RxSubject)