import React from 'react'
import PropTypes from 'prop-types'
import { useRxSubject } from '../utils/reactHelper'
import { BehaviorSubject, Subject } from 'rxjs'

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
        PropTypes.instanceOf(Subject),
    ]).isRequired,
    valueModifier: PropTypes.func,
}
export default React.memo(RxSubject)