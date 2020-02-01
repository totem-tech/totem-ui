import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { textCapitalize } from '../utils/utils'
import ContentSegment from '../components/ContentSegment'
import ProjectTimeKeepingList from '../lists/TimeKeepingList'
import TimeKeepingSummary from '../lists/TimeKeepingSummary'
import { layoutBond } from '../services/window'
import CheckboxGroup from '../components/CheckboxGroup'

const words = {
    archive: 'archive',
    manage: 'manage',
    summary: 'summary',
    overview: 'overview',
    unknown: 'unknown'
}
const wordsCap = textCapitalize(words)
const texts = {
    createProjectOrRequestInvite: 'Create a new activity or request to be invited to some elses activity',
    manageTeamTime: 'Manage team timekeeping',
    manageArchive: 'Team timekeeping archive',
    myRecords: 'My time records',
    myRecordsArchive: 'My timekeeping archive',
    myTimeKeepingSummary: 'My timekeeping overview',
    selectAProject: 'Select a activity',
}
export default class TimeKeepingView extends Component {
    constructor(props) {
        super(props)

        this.state = {
            optionsInput: {
                bond: new Bond(),
                multiple: true,
                name: 'option',
                onChange: (_, { value }) => this.setState({ viewOptions: value }),
                toggle: true,
                options: [
                    { label: wordsCap.overview, style: styles.alignLeft, value: 'summary' },
                    { label: texts.myRecords, style: styles.alignLeft, value: 'records' },
                    { label: texts.manageTeamTime, style: styles.alignLeft, value: 'manage' },
                    { label: texts.myRecordsArchive, style: styles.alignLeft, value: 'records-archive' },
                    { label: texts.manageArchive, style: styles.alignLeft, value: 'manage-archive' },
                ],
                style: { paddingTop: 7, textAlign: 'center' },
                value: props.viewOptions,
            },
            viewOptions: props.viewOptions
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        this.tieIdLayout = layoutBond.tie(layout => this.setState({ isMobile: layout === 'mobile' }))
    }
    componentWillUnmount() {
        this._mounted = false
        layoutBond.untie(this.tieIdLayout)
    }

    render() {
        const { isMobile, optionsInput, viewOptions } = this.state
        const contents = []
        const showSummary = viewOptions.includes('summary')
        const manage = viewOptions.includes('manage')
        const records = viewOptions.includes('records')
        const recordsArchive = viewOptions.includes('records-archive')
        const manageArchive = viewOptions.includes('manage-archive')
        optionsInput.inline = !isMobile

        if (showSummary) contents.push({
            content: <TimeKeepingSummary />,
            header: texts.myTimeKeepingSummary,
            key: `TimeKeepingSummary`,
        })
        if (records) contents.push({
            content: <ProjectTimeKeepingList />,
            header: texts.myRecords,
            key: 'ProjectTimeKeepingList-records',
        })
        if (manage) contents.push({
            content: <ProjectTimeKeepingList {...{ manage: true }} />,
            header: texts.manageTeamTime,
            key: 'ProjectTimeKeepingList-manage',
        })
        if (recordsArchive) contents.push({
            content: <ProjectTimeKeepingList {...{ archive: true }} />,
            header: texts.myRecordsArchive,
            key: 'ProjectTimeKeepingList-records-archive',
        })
        if (manageArchive) contents.push({
            content: <ProjectTimeKeepingList {...{ archive: true, manage: true }} />,
            header: texts.manageArchive,
            key: 'ProjectTimeKeepingList-manage-archive',
        })

        return (
            <div>
                <CheckboxGroup {...optionsInput} />
                {contents.map(item => (
                    <ContentSegment
                        {...item}
                        active={true}
                        basic={true}
                        headerTag="h3"
                        style={{ padding: 0 }}
                    />
                ))}
            </div>
        )
    }
}
TimeKeepingView.propTypes = {
    viewOptions: PropTypes.array.isRequired,
}
TimeKeepingView.defaultProps = {
    viewOptions: ['records', 'archive']
}

const styles = {
    alignLeft: {
        textAlign: 'left'
    }
}