// Deprecated
// import React from 'react'
// import PropTypes from 'prop-types'
// import { BehaviorSubject } from 'rxjs'
// import { useRxSubject } from '../utils/reactjs'

// /**
//  * @name    RxSubjectView
//  * @summary a functional component to display & auto-update the value of an RxJs subject.
//  * PS: if value is defined, make sure it is acceptable in the React DOM.
//  * 
//  * @param   {Object}            props
//  * @param   {Boolean}           props.allowMerge         (optional)
//  * @param   {Boolean}           props.allowSubjectUpdate (optional)
//  * @param   {*}                 props.initialValue       (optional)
//  * @param   {BehaviorSubject}   props.subject
//  * @param   {Function}          props.valueModifier      (optional)
//  * 
//  * @returns {Element}
//  */
// const RxSubjectView = React.memo(props => {
//     const {
//         allowMerge,
//         allowSubjectUpdate,
//         initialValue,
//         subject,
//         valueModifier,
//     } = props
//     const [value = ''] = useRxSubject(
//         subject,
//         valueModifier,
//         initialValue,
//         allowMerge,
//         allowSubjectUpdate,
//     )

//     return value
// })
// RxSubjectView.propTypes = {
//     allowMerge: PropTypes.bool,
//     allowSubjectUpdate: PropTypes.bool,
//     initialValue: PropTypes.any,
//     subject: PropTypes.oneOfType([
//         PropTypes.instanceOf(BehaviorSubject),
//         PropTypes.any,
//     ]).isRequired,
//     valueModifier: PropTypes.func,
// }
// export default RxSubjectView