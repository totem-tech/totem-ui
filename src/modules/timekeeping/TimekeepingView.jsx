import PropTypes from 'prop-types'
import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Button } from '../../components/buttons'
import ContentSegment from '../../components/ContentSegment'
import CheckboxGroup from '../../components/CheckboxGroup'
import { showForm } from '../../services/modal'
import { translated } from '../../utils/languageHelper'
import {
    Message,
    useIsMobile,
    useRxState
} from '../../utils/reactjs'
import storage from '../../utils/storageHelper'
import { isArr, isStr } from '../../utils/utils'
import useActivities from '../activity/useActivities'
import { MODULE_KEY } from './timekeeping'
import TimeKeepingForm, { inputNames } from './TimekeepingForm'
import TimekeepingList from './TimekeepingList'
import TimekeepingSummaryList from './TimekeepingSummaryList'

const textsCap = {
    loading: 'loading...',
    manageTeamTime: 'manage team records',
    manageArchive: 'team records archive',
    myRecords: 'my records',
    myRecordsArchive: 'my records archive',
    myTimeKeepingSummary: 'my timekeeping overview',
    overview: 'overview',
    timer: 'timer',
    zeroActivities: `create a new activity or request to be invited to some else's activity`,
}
translated(textsCap, true)
const rw = value => storage.settings.module(MODULE_KEY, value) || {}

const TimekeepingView = React.memo(({
    isMobile = useIsMobile(),
    ...props
}) => {
    const [activities] = useActivities()
    const [state] = useRxState(getInitialState(props), {
        valueModifier: (state, prevState) => {
            state = { ...prevState, ...state }
            const { optionsInput, viewOptions } = state
            const showSummary = viewOptions.includes('summary')
            const manage = viewOptions.includes('manage')
            const records = viewOptions.includes('records')
            const recordsArchive = viewOptions.includes('records-archive')
            const manageArchive = viewOptions.includes('manage-archive')
            optionsInput.inline = !isMobile
            let hideTimer = true
            state.contents = [
                showSummary && {
                    content: TimekeepingSummaryList,
                    header: textsCap.myTimeKeepingSummary,
                },
                records && {
                    content: TimekeepingList,
                    contentProps: { ...props, hideTimer },
                    header: textsCap.myRecords,
                },
                manage && {
                    content: TimekeepingList,
                    contentProps: { ...props, hideTimer, manage: true },
                    header: textsCap.manageTeamTime,
                },
                recordsArchive && {
                    content: TimekeepingList,
                    contentProps: { ...props, archive: true, hideTimer },
                    header: textsCap.myRecordsArchive,
                },
                manageArchive && {
                    content: TimekeepingList,
                    contentProps: { ...props, archive: true, hideTimer, manage: true },
                    header: textsCap.manageArchive,
                },
            ].filter(Boolean)
            return state
        }
    })
    const message = !activities?.loaded
        ? {
            content: textsCap.loading,
            icon: true,
            status: 'loading',
        }
        : !activities.size && {
            content: textsCap.zeroActivities,
            status: 'warning',
        }
    if (message) return <Message {...message} />

    const {
        contents,
        optionsInput,
        timerButton,
    } = state
    return (
        <div>
            <div className='no-print'>
                <Button {...timerButton} />
                <CheckboxGroup {...optionsInput} />
            </div>
            {contents.map(item => (
                <ContentSegment {...{
                    ...item,
                    active: true,
                    basic: true,
                    // content: <item.content {...item.contentProps} />,
                    headerTag: 'h3',
                    key: JSON.stringify({
                        ...item.contentProps,
                        header: item.header,
                    }),
                    style: { padding: 0 },
                }} />
            ))}
        </div>
    )
})
TimekeepingView.propTypes = {
    // Default: ['records']
    viewOptions: PropTypes.array,
}['records']
export default TimekeepingView

const getInitialState = props => rxState => {
    let {
        projectHash: activityId,
        viewOptions = rw().viewOptions
    } = props
    const style = { textAlign: 'left' }
    viewOptions = isArr(viewOptions)
        && viewOptions.length !== 0
        && viewOptions.every(x => isStr(x))
        ? viewOptions
        : ['records']
    const state = {
        optionsInput: {
            rxValue: new BehaviorSubject(viewOptions),
            multiple: true,
            name: 'option',
            onChange: (_, { value: viewOptions }) => {
                rxState.next({ viewOptions })
                // update local storage with module settings
                rw({ viewOptions })
            },
            toggle: true,
            options: [
                {
                    label: textsCap.overview,
                    style,
                    value: 'summary',
                },
                {
                    label: textsCap.myRecords,
                    style,
                    value: 'records',
                },
                {
                    label: textsCap.manageTeamTime,
                    style,
                    value: 'manage',
                },
                {
                    label: textsCap.myRecordsArchive,
                    style,
                    value: 'records-archive',
                },
                {
                    label: textsCap.manageArchive,
                    style,
                    value: 'manage-archive',
                },
            ],
            style: {
                display: 'inline',
                paddingTop: 7,
                textAlign: 'center',
            },
        },
        timerButton: {
            active: false,
            content: textsCap.timer,
            icon: 'clock outline',
            key: 'timer',
            onClick: () => showForm(TimeKeepingForm, {
                [inputNames.activityId]: activityId,
            }),
            style: { display: 'inline' }
        },
        viewOptions,
    }
    return state
}