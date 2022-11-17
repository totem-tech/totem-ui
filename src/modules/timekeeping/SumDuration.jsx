import React from 'react'
import PropTypes from 'prop-types'
import { Button, Icon } from 'semantic-ui-react'
import { BehaviorSubject } from 'rxjs'
import { useRxSubject } from '../../utils/reactHelper'
// import { BLOCK_DURATION_SECONDS, secondsToDuration } from '../../utils/time'
import { MOBILE, rxLayout } from '../../services/window'
// import TimeSince from '../../components/TimeSince'
import { blocksToDuration, statuses } from './timekeeping'
// import Invertible from '../../components/Invertible'
import { translated } from '../../utils/languageHelper'

let textsCap = {
    approved: 'approved time',
    overall: 'overall time',
    submitted: 'submitted time',
}
textsCap = translated(textsCap, true)[1]

const SumDuration = props => {
    const [data = new Map()] = useRxSubject(props.data)
    const [ids = []] = useRxSubject(props.ids)
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    
    if (!data.size) return ''

    const sum = (sum, item) => sum + item.total_blocks
    const selectedItems = !ids.length
        ? Array
            .from(data)
            .map(([_, item]) => item)
        : ids
            .map(id => data.get(id))
            .filter(Boolean)
    
    const approved = blocksToDuration(
        selectedItems
            .filter(item => item.approved)
            .reduce(sum, 0)
    )
    const submitted = blocksToDuration(
        selectedItems
            .filter(item => item.submit_status === statuses.submit)
            .reduce(sum, 0)
    )
    const overall = blocksToDuration(
        selectedItems.reduce(sum, 0)
    )    

    const getBtn = (content, title) => (
        <div style={{ display: 'inline-block', position: 'relative' }}>
            <div style={{
                fontSize: '80%',
                fontWeight: 'bold',
                position: 'absolute',
                top: -18,
            }}>
                {title}
            </div>
            <Button {...{
                content,
                key: title,
                style: { cursor: 'initial' },
                title: 'hh:mm:ss',
            }} />
        </div>
    )
    return (
        <div style={{
            display: isMobile
                ? 'block'
                : 'inline-block',
            marginBottom: isMobile
                ? 5
                : undefined,
            // marginTop: 20,
            textAlign: 'center',
            whiteSpace: 'nowrap',
        }}>
            {getBtn(overall, textsCap.overall)}
            {getBtn(approved, textsCap.approved)}
            {getBtn(submitted, textsCap.submitted)}
        </div>
    )

    // // sum up the total duration of selected records 
    // const sumBlocks = ids
    //     .map(id => (data.get(id) || {}).total_blocks)
    //     .filter(Boolean)
    //     .reduce((sum, next) => sum + next, 0)
    // const numSeconds = sumBlocks * BLOCK_DURATION_SECONDS
    // const dateFrom = new Date()
    // dateFrom.setSeconds(dateFrom.getSeconds() - numSeconds)
    // const dateTo = new Date()
    // return !!sumBlocks && (
    //     <div style={{
    //         display: isMobile 
    //             ? 'block'
    //             : 'inline-flex',
    //         textAlign: 'center',
    //         whiteSpace: 'nowrap',
    //         minHeight: 38,
    //         minWidth: 180,
    //     }}>
    //         <div style={{
    //             display: 'inline-block',
    //             fontSize: '150%',
    //         }}>
    //             <Icon.Group>
    //                 <Icon name='clock outline' size='large' />
    //                 <Icon corner inverted name='check circle' />
    //             </Icon.Group>
    //         </div>
    //         <TimeSince {...{
    //             asDuration: true,
    //             date: dateFrom,
    //             dateTo,
    //             durationConfig: {
    //                 statisticProps: {
    //                     style: { 
    //                         marginBottom: 0,
    //                         marginTop: -5,
    //                     },
    //                     labelProps: {
    //                         style: { fontSize: 8 },
    //                     },
    //                     valueProps: {
    //                         style: {
    //                             // fontSize: 14, // does't work due to Semantic's "!important" usage
    //                             zoom: 0.3
    //                         }
    //                     }
    //                 },
    //                 withHours: true,
    //             },
    //             key: numSeconds,
    //             El: 'span',
    //             updateFrequency: null,
    //         }} />
    //     </div>
    // )
}
SumDuration.propTypes = {
    data: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.instanceOf(Map),
        PropTypes.instanceOf(BehaviorSubject),
    ]),
    ids: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.instanceOf(BehaviorSubject),
    ]),
}
export default React.memo(SumDuration)