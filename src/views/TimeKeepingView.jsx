import React from 'react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { arrSort, textCapitalize } from '../utils/utils'
import ContentSegment from '../components/ContentSegment'
import FormBuilder, { findInput } from '../components/FormBuilder'
import ProjectTimeKeepingList from '../lists/TimeKeepingList'
import TimeKeepingInviteList from '../lists/TimeKeepingInviteList'
import TimeKeepingSummary from '../lists/TimeKeepingSummary'
import { getSelected } from '../services/identity'
import { getProjects, getProjectsBond } from '../services/timeKeeping'
import { layoutBond } from '../services/window'

const words = {
    invitations: 'invitations',
    invites: 'invites',
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

class TimeKeepingView extends ReactiveComponent {
    constructor(props) {
        super(props, { layout: layoutBond })

        this.state = {
            values: {
                option: 'records'
            },
            inputs: [
                {
                    name: 'group',
                    type: 'group',
                    inputs: [
                        {
                            bond: new Bond(),
                            inline: true,
                            name: 'projectHash',
                            options: [],
                            placeholder: texts.selectAProject,
                            search: true,
                            selection: true,
                            type: 'dropdown',
                            width: 4,
                        },
                        {
                            multiple: true,
                            name: 'option',
                            toggle: true,
                            type: 'checkbox-group',
                            value: 'records',
                            width: 12,
                            options: [
                                { label: texts.myRecords, value: 'records' },
                                { label: wordsCap.manage, value: 'manage' },
                                { label: wordsCap.invites, value: 'invites' },
                                { label: wordsCap.summary, value: 'summary' },
                            ],
                        },
                    ],
                }
            ],
        }
    }

    componentWillMount() {
        this.tieId = getProjectsBond.tie(() => this.loadProjectOptions())
    }

    componentWillUnmount() {
        getProjectsBond.untie(this.tieId)
    }

    handleChange(_, values) {
        this.setState({ values })
    }

    render() {
        const { inputs, layout, values: { projectHash, option } } = this.state
        const { loading, options: projectOptions } = findInput(inputs, 'projectHash')
        const { ownerAddress, name } = (projectOptions.find(x => x.value === projectHash) || {}).project || {}
        const { address } = getSelected()
        const isOwner = ownerAddress === address
        const isMobile = layout === 'mobile'
        let contents = []
        const manage = isOwner && option.includes('manage')
        const showSummary = option.includes('summary')
        const showInvites = option.includes('invites')
        const showRecords = option.includes('records') || manage
        const optionInput = findInput(inputs, 'option')
        optionInput.inline = !isMobile
        optionInput.style = { float: isMobile ? '' : 'right' }
        optionInput.style.paddingTop = 7
        optionInput.options.find(x => x.value === 'records').disabled = manage
        optionInput.options.find(x => x.value === 'manage').hidden = !isOwner

        if (!loading && showRecords) contents.push({
            content: <ProjectTimeKeepingList {...{ isOwner, manage, projectHash, ownerAddress, projectName: name }} />,
            key: 'ProjectTimeKeepingList',
        })
        if (!loading && showInvites) contents.push({
            content: <TimeKeepingInviteList {...{ projectHash }} />,
            header: wordsCap.invitations,
            key: 'TimeKeepingInviteList',
        })
        if (showSummary) contents.push({
            content: <TimeKeepingSummary />,
            header: texts.myTimeKeepingSummary,
            key: 'TimeKeepingSummary',
        })

        return (
            <div>
                <FormBuilder {...{ inputs, onChange: this.handleChange.bind(this), submitText: null }} />
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

    loadProjectOptions() {
        const { inputs, values } = this.state
        let { projectHash } = values
        const projectIn = findInput(inputs, 'projectHash')
        projectIn.loading = true
        getProjects().then(projects => {
            const options = Array.from(projects).map(([hash, project]) => ({
                key: hash,
                project,
                text: (project || {}).name || wordsCap.unknown,
                value: hash,
            }))
            projectIn.loading = false
            projectIn.options = arrSort(options, 'text')
            projectIn.noResultsMessage = options.length > 0 ? undefined : (
                // user doesn't own any project and never been invited to one
                <p style={{ whiteSpace: 'pre-wrap' }}>
                    {texts.createProjectOrRequestInvite}
                </p>
            )

            if (!projectHash || !projectIn.options.find(x => x.value === projectHash)) {
                const { value: projectHash } = projectIn.options[0] || {}
                values.projectHash = projectHash
                projectHash && projectIn.bond.changed(projectHash)
            }
            this.setState({ inputs, values })
        }, console.log)
    }
}

export default TimeKeepingView