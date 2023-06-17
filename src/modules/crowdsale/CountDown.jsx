// import React from 'react'
// import TimeSince from '../../components/TimeSince'
// import { rxBlockNumber } from '../../services/blockchain'
// import { translated } from '../../services/language'
// import { subjectAsPromise, usePromise } from '../../services/react'
// import { MOBILE, rxLayout } from '../../utils/window'
// import { blockNumberToTS } from '../../utils/time'
// import Progress from './Progress'

// const textsCap = translated({
//     endsIn: 'crowdsale ends in',
//     isOver: 'crowdsale is over!',
//     startsIn: 'crowdsale starts in',
// }, true) [1]

// function CountDown(props) {
//     const { showProgress = true } = props
//     const [startBlock, endBlock] = [1893780, 1993780] // ToDo: read from blockchain
//     const [currentBlock] = usePromise(subjectAsPromise(
//         rxBlockNumber,
//         b => b > 0 && b, // waits until block number is received
//     )[0])
//     const isPending = startBlock > currentBlock
//     const isActive = !isPending && endBlock > currentBlock
//     const isDone = endBlock <= currentBlock
//     const block = isPending
//         ? startBlock
//         : isActive
//             ? endBlock
//             : null
//     const date = block && blockNumberToTS(block, currentBlock, false)

//     return (
//         <div style={{ width: '100%', textAlign: 'center' }}>
//             {currentBlock && (
//                 <h1 className='no-margin'>
//                     {isPending
//                         ? textsCap.startsIn
//                         : isActive
//                             ? textsCap.endsIn
//                             : textsCap.isOver
//                     }
//                 </h1>
//             )}
//             {date && (
//                 <TimeSince {...{
//                     asDuration: true,
//                     date,
//                     durationConfig: {
//                         fill: false, // fills with 0 if length is less that 2
//                         statisticProps: {
//                             color: isActive
//                                 ? 'yellow'
//                                 : isDone
//                                     ? 'red'
//                                     : 'green',
//                             style: { marginBottom: 0 },
//                         },
//                         withSeconds: rxLayout.value !== MOBILE,
//                     },
//                 }} />
//             )}
//             {showProgress && (isActive || isDone) && (<Progress />)}
//         </div>
//     )
// }

// export default React.memo(CountDown)