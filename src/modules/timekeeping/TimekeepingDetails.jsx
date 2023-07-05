import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { ButtonGroup } from '../../components/buttons'
import DataTableVertical from '../../components/DataTableVertical'
import LabelCopy from '../../components/LabelCopy'
import { showInfo } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactjs'
import { isFn, objWithoutKeys } from '../../utils/utils'
import AddressName from '../partner/AddressName'
import { rxInProgressIds } from './TimekeepingList'

const textsCap = {
    activityName: 'activity name',
    activityOwner: 'activity owner',
    activityUnnamed: 'unnamed activity',
    blockCount: 'number of blocks',
    blockEnd: 'end block',
    blockStart: 'start block',
    duration: 'duration',
    header: 'record details',
    finishedAt: 'finished at',
    numberOfBreaks: 'number of breaks',
    recordDetails: 'record details',
    recordId: 'record ID',
    startedAt: 'started at',
    status: 'status',
    worker: 'worker',
}
translated(textsCap, true)

const TimekeepingDetails = props => {
    const {
        getActionButtons,
        recordId,
        rxData,
    } = props

    const [state] = useRxSubject(rxData, getFormProps(props), [])
    const [inProgressIds = new Map()] = useRxSubject(rxInProgressIds)
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
            disabled = disabled || !!inProgressIds.get(recordId)
            return {
                ...button,
                props: {
                    ...props,
                    content: title,
                    disabled,
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
    ]
    return (
        <div>
            <DataTableVertical {...objWithoutKeys(state, ignoredAttrs)} />
            <div style={{
                marginBottom: 14,
                marginTop: -14,
                padding: 1,
                textAlign: 'center',
            }}>
                {buttons && <ButtonGroup {...{ buttons, fluid: true }} />}
            </div>
        </div>
    )
}
TimekeepingDetails.propTypes = {
    getActionButtons: PropTypes.func,
    manage: PropTypes.bool,
    recordId: PropTypes.string,
    rxData: PropTypes.instanceOf(BehaviorSubject),
}
TimekeepingDetails.asModal = (props) => showInfo({
    collapsing: true,
    content: <TimekeepingDetails {...props} />,
    header: textsCap.header,
    size: 'mini',
}, props.recordId)
export default TimekeepingDetails

const getFormProps = props => (data = new Map()) => {
    const { manage, recordId } = props
    const record = data.get(recordId)
    const columns = [
        {
            content: x => (
                <LabelCopy {...{
                    content: x.activityName || textsCap.activityUnnamed,
                    maxLength: 18,
                    value: x.activityId,
                }} />
            ),
            title: textsCap.activityName,
        },
        // user is assignee
        !manage && {
            content: x => <AddressName address={x.projectOwnerAddress} />,
            title: textsCap.activityOwner,
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
            content: x => <AddressName address={x.workerAddress} />,

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
}