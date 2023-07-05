import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button } from '../../components/buttons'
import { translated } from '../../utils/languageHelper'
import { useIsMobile, useRxSubjectOrValue } from '../../utils/reactjs'
import { blocksToDuration, statuses } from './timekeeping'

const textsCap = {
    approved: 'approved time',
    overall: 'overall time',
    submitted: 'submitted time',
}
translated(textsCap, true)

const SumDuration = React.memo(props => {
    let {
        data = new Map(),
        ids = [],
        isMobile = useIsMobile(),
    } = props
    data = useRxSubjectOrValue(data)
    ids = useRxSubjectOrValue(ids)
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
})
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
export default SumDuration