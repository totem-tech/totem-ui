// import React from 'react'
// import FormBuilder, { fillValues } from '../../components/FormBuilder'
// import { translated } from '../../services/language'
// import { useRxSubject } from '../../services/react'
// import LocationForm, { inputNames as locInputNames } from '../location/LocationForm'
// import { rxCrowdsaleData } from './crowdsale'
// import { getInputs, inputNames } from './KYCForm'

// const textsCap = translated({
//     formHeaderView: 'your crowdsale data',
//     locationLabel: 'contact address',
// }, true)[1]

// export default function KYCViewForm(props) {
//     const [inputs] = useRxSubject(rxCrowdsaleData, kycData => {
//         const { depositAddresses = {}, location = {} } = kycData
//         const locationIn = {
//             accordion: { collapsed: true, styled: true },
//             inputs: [{
//                 content: (
//                     <LocationForm {...{
//                         El: 'div',
//                         // disable all inputs
//                         inputsReadOnly: Object.values(locInputNames),
//                         style: { width: '100%'},
//                         submitText: null,
//                         values: location,
//                     }} />
//                 ),
//                 name: 'location-form',
//                 type: 'html'
//             }],
//             label: textsCap.locationLabel,
//             name: 'location-group',
//             type: 'group',
//         }
//         // replace location dropdown field with an accordion with read-only LocationForm in an accordion
//         const inputs = getInputs().map(input =>
//             input.name === inputNames.locationId
//                 ? locationIn
//                 : input
//         )
//         const blockchains = Object.keys(depositAddresses)
//             .filter(x => !!depositAddresses[x])
//         return fillValues(inputs, { ...kycData, blockchains })
//     })

//     return (
//         <FormBuilder {...{
//             ...props,
//             inputs,
//             inputsReadOnly: Object.values(inputNames),
//             submitText: null,
//         }} />
//     )
// }
// KYCViewForm.defaultProps = {
//     closeOnEscapse: true,
//     closeOnDimmerClick: true,
//     closeText: null,
//     header: textsCap.formHeaderView,
//     size: 'tiny',
// }