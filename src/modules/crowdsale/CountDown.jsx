import React from 'react'
import TimeSince from '../../components/TimeSince'
import { rxBlockNumber } from '../../services/blockchain'
import { subjectAsPromise, usePromise } from '../../services/react'
import { MOBILE, rxLayout } from '../../services/window'
import { blockNumberToTS } from '../../utils/time'
import Progress from './Progress'

export default function CountDown(props) {
    const { showProgress = true } = props
    const [startBlock, endBlock] = [1893780, 1993780] // ToDo: read from blockchain
    const [currentBlock] = usePromise(subjectAsPromise(rxBlockNumber)[0], b => b > 0)
    const isPending = startBlock > currentBlock
    const isActive = endBlock > currentBlock
    const isDone = endBlock <= currentBlock
    const block = isPending
        ? startBlock
        : isActive
            ? endBlock
            : null
    const date = block && blockNumberToTS(block, currentBlock, false)

    return (
        <div style={{ width: '100%', textAlign: 'center' }}>
            <h1>
                {isDone
                    ? 'Crowdsale is now over!'
                    : !isActive
                        ? 'Crowdsale starts in'
                        : 'Crowdsale ends in'}
            </h1>
            {date && (
                <TimeSince {...{
                    asDuration: true,
                    date,
                    durationConfig: {
                        fill: false, // fills with 0 if length is less that 2
                        statisticProps: {
                            color: isActive
                                ? 'yellow'
                                : isDone
                                    ? 'red'
                                    : 'green',
                        },
                        withSeconds: rxLayout.value !== MOBILE,
                    },
                }} />
            )}
            {showProgress && (isActive || isDone) && (<Progress />)}
        </div>
    )
}