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
    unknown: 'unknown'
}
const wordsCap = textCapitalize(words)
const texts = {
    createProjectOrRequestInvite: 'Create a new project or request project owner to be invited',
    myRecords: 'My records',
    myTimeKeepingSummary: 'My timekeeping summary',
    selectAProject: 'Select a project',
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
                    { label: texts.myRecords, value: 'records' },
                    { label: wordsCap.manage, value: 'manage' },
                    { label: wordsCap.archive, value: 'archive' },
                    { label: wordsCap.summary, value: 'summary' },
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
        const manage = viewOptions.includes('manage')
        const showSummary = viewOptions.includes('summary')
        const showRecords = viewOptions.includes('records') || manage
        const archive = viewOptions.includes('archive')
        optionsInput.inline = !isMobile
        optionsInput.options.find(x => x.value === 'records').disabled = manage
        optionsInput.options.find(x => x.value === 'archive').hidden = !showRecords

        if (showRecords) contents.push({
            content: <ProjectTimeKeepingList {...{ archive, manage }} />,
            key: 'ProjectTimeKeepingList' + JSON.stringify({ archive, manage }),
        })
        if (showSummary) contents.push({
            content: <TimeKeepingSummary />,
            header: texts.myTimeKeepingSummary,
            key: `TimeKeepingSummary`,
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