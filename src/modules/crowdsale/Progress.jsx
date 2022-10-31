// import React from 'react'
// import { Progress } from 'semantic-ui-react'

// export default React.memo(() => {
//     const state = {
//         totalRaisedUSD: 1000000,
//         softCapUSD: 2500000, // 2.5 mil
//         targetCapUSD: 10000000, // 10 mil
//     }

//     const targetCapReached = state.targetCapUSD <= state.totalRaisedUSD
//     const softCapReached = state.softCapUSD <= state.totalRaisedUSD
//     return !state.totalRaisedUSD ?
//         ''
//         : (
//             <Progress {...{
//                 color: targetCapReached
//                     ? 'green'
//                     : softCapReached
//                         ? 'teal'
//                         : undefined,
//                 label: `US$${state.totalRaisedUSD} raised`
//                     + (
//                         targetCapReached 
//                             ? ' | Target cap reached!'
//                             : softCapReached
//                                 ? ' | Soft cap reached!'
//                                 : ''
//                     ),
//                 progress: 'percent',
//                 style: { marginBottom: 30 },
//                 total: state.targetCapUSD,
//                 value: state.totalRaisedUSD,
//             }} />
//         )
// })