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
import { ButtonGroup } from '../../components/buttons'

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
    startedAt: 'started at',
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
                key: 'total_blocks',
                title: textsCap.blockCount,
            },
            {
                key: 'nr_of_breaks',
                title: textsCap.numberOfBreaks,
            },
            {
                key: '_start_block',
                title: textsCap.startedAt,
            },
            {
                key: '_end_block',
                title: textsCap.finishedAt,
            },
            // {
            //     key: 'start_block',
            //     title: textsCap.blockStart,
            // },
            // {
            //     key: 'end_block',
            //     title: textsCap.blockEnd,
            // },
        ]
        return {
            columns,
            data: [record],
            record,
        }
    })
    const [state] = useRxSubject(rxData, getFormProps, [])
    const [inProgressIds = []] = useRxSubject(rxInProgressIds)
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const { record } = state

    const buttons = record && getActionButtons(record, recordId)
        .filter(({ props: { title } = {} }) =>
            title !== textsCap.recordDetails
        )
        .map(button => {
            const { props = {} } = button
            let {
                disabled,
                onClick,
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
            <div style={{ marginTop: -14, textAlign: 'center' }}>
                <ButtonGroup {...{
                    buttons,
                    style: {
                        margin: 3,
                        width: 'calc( 100% - 6px )',
                    }
                }} />
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