import React, { useCallback } from 'react'
import FormBuilder from '../../components/FormBuilder'
import { MOBILE, rxLayout } from '../../services/window'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactHelper'
import { copyToClipboard, isFn, objWithoutKeys, textEllipsis } from '../../utils/utils'

let textsCap = {
    action: 'action',
    activity: 'activity',
    approve: 'approve',
    approved: 'approved',
    archive: 'archive',
    close: 'close',
    deleted: 'deleted',
    dispute: 'dispute',
    disputed: 'disputed',
    draft: 'draft',
    duration: 'duration',
    edit: 'edit',
    hash: 'hash',
    invoiced: 'invoiced',
    no: 'no',
    reject: 'reject',
    rejected: 'rejected',
    selected: 'selected',
    status: 'status',
    submitted: 'submitted',
    timekeeping: 'Timekeeping',
    timer: 'timer',
    yes: 'yes',
    unarchive: 'unarchive',
    unknown: 'unknown',
    worker: 'worker',
    
    approveRecord: 'approve record',
    archiveRecord: 'archive record',
    banUser: 'ban user',
    blockStart: 'start block',
    blockEnd: 'end block',
    blockCount: 'number of blocks',
    emptyMessage: 'no time records available',
    emptyMessageArchive: 'no records have been archived yet',
    finishedAt: 'finished at',
    loading: 'loading...',
    orInviteATeamMember: 'maybe invite someone to an activity?',
    noTimeRecords: 'your team have not yet booked time.',
    numberOfBreaks: 'number of breaks',
    projectName: 'activity name',
    recordDetails: 'record details',
    recordId: 'record ID',
    rejectRecord: 'reject record',
    setAsDraft: 'set as draft',
    setAsDraftDetailed: 'set as draft and force user to submit again',
    unarchiveRecord: 'restore from archive',
    workerIdentity: 'worker identity',
}
textsCap = translated(textsCap, true)[1]

const TimekeepingDetailsFrom = props => {
    const {
        getActionButtons,
        manage,
        recordId,
        rxData,
        rxInProgressIds,
    } = props
    const getFormProps = useCallback((data = new Map()) => {
        const record = data.get(recordId)
        const {
            duration,
            end_block,
            nr_of_breaks,
            projectHash,
            projectName,
            start_block,
            total_blocks,
            workerAddress,
            workerName,
            _end_block,
            _status,
        } = record
        
        const inputs = [
            manage && [textsCap.projectName, projectName || projectHash],
            [textsCap.recordId, textEllipsis(recordId, 30)],
            [textsCap.worker, workerName || workerAddress],
            [textsCap.status, _status],
            [textsCap.duration, duration],
            [textsCap.numberOfBreaks, nr_of_breaks, 'number'],
            [textsCap.finishedAt, _end_block],
            [textsCap.blockCount, total_blocks],
            [textsCap.blockStart, start_block],
            [textsCap.blockEnd, end_block],
        ]
            .filter(Boolean)
            .map(([label, value, type]) => ({
                action: label !== textsCap.recordId
                    ? undefined
                    : {
                        icon: 'copy',
                        onClick: () => copyToClipboard(recordId),
                    },
                label,
                name: label,
                readOnly: true,
                type: type || 'text',
                value,
            }))

        return {
            closeOnEsCape: true,
            closeText: null,
            header: textsCap.recordDetails,
            inputs,
            record,
            size: 'tiny',
            submitText: null,
        }
    })
    const [state] = useRxSubject(rxData, getFormProps, [])
    const [inProgressIds = []] = useRxSubject(rxInProgressIds)
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const { inputs, record } = state

    const buttons = getActionButtons(record, recordId)
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

    return (
        <FormBuilder {...{
            ...objWithoutKeys(props, [
                'actionButtons',
                'manage',
                'recordId',
                'record',
                'rxData',
                'rxInprogressIds',
            ]),
            ...state,
            inputs: [
                ...inputs,
                {
                    content: (
                        <div style={{ textAlign: 'center' }}>
                            {buttons}
                        </div>
                    ),
                    name: 'actions',
                    type: 'html'
                },
            ]
        }} />
    )
}
export default TimekeepingDetailsFrom