import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import DataTableVertical from '../../components/DataTableVertical'
import LabelCopy from '../../components/LabelCopy'
import { MOBILE, rxLayout } from '../../services/window'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactHelper'
import { isFn, objWithoutKeys } from '../../utils/utils'
import { BehaviorSubject } from 'rxjs'
import { confirmAsPromise } from '../../services/modal'
import AddPartnerBtn from '../partner/AddPartnerBtn'

let textsCap = {
    blockCount: 'number of blocks',
    blockEnd: 'end block',
    blockStart: 'start block',
    duration: 'duration',
    header: 'record details',
    finishedAt: 'finished at',
    numberOfBreaks: 'number of breaks',
    projectName: 'activity name',
    projectOwner: 'activity owner',
    status: 'status',
    recordDetails: 'record details',
    recordId: 'record ID',
    worker: 'worker',
}
textsCap = translated(textsCap, true)[1]

const TimekeepingDetails = props => {
    const {
        getActionButtons,
        manage,
        recordId,
        rxData,
        rxInProgressIds,
    } = props
    const getFormProps = useCallback((data = new Map()) => {
        const record = data.get(recordId)
        const columns = [
            {
                content: x => x.projectName || (
                    <LabelCopy {...{
                        maxLength: 18,
                        value: x.projectHash,
                    }} />
                ),
                title: textsCap.projectName,
            },
            // user is assignee
            !manage && {
                content: x => <AddPartnerBtn address={x.projectOwnerAddress} />,
                title: textsCap.projectOwner,
            },
            {
                content: x => (
                    <LabelCopy {...{
                        maxLength: 18,
                        value: x.hash,
                    }} />
                ),
                title: textsCap.recordId,
            },
            {
                content: x => x.workerName || x.workerAddress,
                title: textsCap.worker,
            },
            {
                key: '_status',
                title: textsCap.status,
            },
            {
                key: 'duration',
                title: textsCap.duration,
            },
            {
                key: 'nr_of_breaks',
                title: textsCap.numberOfBreaks,
            },
            {
                key: '_end_block',
                title: textsCap.finishedAt,
            },
            {
                key: 'total_blocks',
                title: textsCap.blockCount,
            },
            {
                key: 'start_block',
                title: textsCap.blockStart,
            },
            {
                key: 'end_block',
                title: textsCap.blockEnd,
            },
        ]
        return {
            columns,
            data: [record],
        }
    })
    const [state] = useRxSubject(rxData, getFormProps, [])
    const [inProgressIds = []] = useRxSubject(rxInProgressIds)
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const { inputs, record } = state

    const buttons = record && getActionButtons(record, recordId)
        .filter(({ props: { title } = {} }) =>
            title !== textsCap.recordDetails
        )
        .map(button => {
            const { props = {} } = button
            let {
                disabled,
                onClick,
                style,
                title,
            } = props
            disabled = disabled || inProgressIds.includes(recordId)
            return {
                ...button,
                props: {
                    ...props,
                    content: title,
                    disabled,
                    fluid: isMobile,
                    onClick: (...args) => {
                        args[0].preventDefault()
                        isFn(onClick) && onClick(...args)
                    },
                    style: {
                        ...style,
                        margin: 5,
                    }
                }
            }
        })

    const ignoredAttrs = [
        'actionButtons',
        'manage',
        'recordId',
        'record',
        'rxData',
        'rxInprogressIds',
    ]
    return (
        <div>
            <DataTableVertical {...objWithoutKeys(state, ignoredAttrs)} />
            <div style={{ textAlign: 'center' }}>
                {buttons}
            </div>
        </div>
    )
}
TimekeepingDetails.propTypes = {
    getActionButtons: PropTypes.func,
    manage: PropTypes.bool,
    recordId: PropTypes.string,
    rxData: PropTypes.instanceOf(BehaviorSubject),
    rxInProgressIds: PropTypes.instanceOf(BehaviorSubject),
}
TimekeepingDetails.asModal = (props) => confirmAsPromise({
    confirmButton: null,
    cancelButton: null,
    className: 'collapsing',
    content: <TimekeepingDetails {...props} />,
    header: textsCap.header,
    size: 'mini',
}, props.recordId)
export default TimekeepingDetails