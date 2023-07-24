import PropTypes from 'prop-types'
import React from 'react'
import { ButtonGroup } from '../../components/buttons'
import DataTableVertical from '../../components/DataTableVertical'
import LabelCopy from '../../components/LabelCopy'
import { showInfo } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import { useRxSubjects } from '../../utils/reactjs'
import {
    isFn,
    isMap,
    objWithoutKeys
} from '../../utils/utils'
import AddressName from '../partner/AddressName'
import {
    getActionButtons,
    rxInProgressIds,
    statusTexts,
} from './TimekeepingList'
import useTkRecords from './useTkRecords'

const textsCap = {
    activity: 'activity',
    activityOwner: 'activity owner',
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

const RecordDetails = props => {
    const {
        activityId,
        archive,
        identity,
        manage,
    } = props
    const rxRecords = useTkRecords({
        activityId,
        archive,
        identity,
        manage,
        subjectOnly: true,
    })

    const [state] = useRxSubjects(
        [rxRecords, rxInProgressIds],
        getState(props),
    )
    const { buttons = [] } = state

    return (
        <div>
            <DataTableVertical {...objWithoutKeys(
                state,
                // prevents passing on unnecessary props to the table
                Object.keys(RecordDetails.propTypes)
            )} />
            {!!buttons.length && (
                <div style={{
                    marginBottom: 14,
                    marginTop: -14,
                    padding: 1,
                    textAlign: 'center',
                }}>
                    <ButtonGroup {...{ buttons, fluid: true }} />
                </div>
            )}
        </div>
    )
}
const arrOrStr = PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.string,
])
RecordDetails.propTypes = {
    activityId: arrOrStr,
    archive: PropTypes.bool.isRequired,
    identity: arrOrStr,
    manage: PropTypes.bool.isRequired,
    recordId: PropTypes.string.isRequired,
}
RecordDetails.asModal = (props = {}) => showInfo({
    collapsing: true,
    content: <RecordDetails {...props} />,
    header: textsCap.header,
    size: 'mini',
}, props.recordId)
export default RecordDetails

const getState = (props = {}) => ([
    record = new Map(),
    inProgressIds = []
]) => {
    const { manage, recordId } = props
    record = isMap(record)
        // Map or rxRecords received in the props
        ? record.get(recordId) || {}
        : record || {}
    const {
        activityId,
        activityName,
        activityOwnerAddress,
        workerAddress,
    } = record
    const columns = [
        {
            content: () => (
                <LabelCopy {...{
                    maxLength: 18,
                    value: recordId,
                }} />
            ),
            title: textsCap.recordId,
        },
        {
            content: () => (
                <LabelCopy {...{
                    content: activityName,
                    value: activityId,
                }} />
            ),
            title: textsCap.activity,
        },
        // user is assignee
        !manage && {
            content: () => (
                <AddressName {...{
                    address: activityOwnerAddress,
                    maxLength: 20,
                }} />
            ),
            title: textsCap.activityOwner,
        },
        {
            content: () => <AddressName address={workerAddress} />,
            title: textsCap.worker,
        },
        {
            content: x => statusTexts[x.submit_status],
            key: 'submit_status',
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
        ...props,
        buttons: getButtons(
            props,
            inProgressIds,
            record
        ),
        columns,
        data: [record],
    }
}

const getButtons = (
    props,
    inProgressIds = new Map(),
    record
) => {
    const { recordId } = props
    const allBtns = !record
        ? []
        : getActionButtons(props)(record, recordId)
    const buttons = allBtns
        // exclude the details button to prevent openting this modal recursively
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
    return buttons
}