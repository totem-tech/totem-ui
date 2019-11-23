import React from 'react'
import { Bond } from 'oo7'
import { ReactiveComponent } from 'oo7-react'
import { Divider, Header } from 'semantic-ui-react'
import { deferred, objCopy, IfMobile, newMessage, arrUnique, arrSort, textCapitalize } from '../utils/utils'
import ContentSegment from '../components/ContentSegment'
import FormBuilder, { findInput } from '../components/FormBuilder'
import ProjectTimeKeepingList from '../lists/TimeKeepingList'
import TimeKeepingInviteList from '../lists/TimeKeepingInviteList'
import TimeKeepingSummary from '../lists/TimeKeepingSummary'
import { project, timeKeeping } from '../services/blockchain'
import client from '../services/ChatClient'
import { getSelected, selectedAddressBond } from '../services/identity'
import { bytesToHex } from '../utils/convert'

const words = {
    invitations: 'invitations',
    invites: 'invites',
    manage: 'manage',
    summary: 'summary',
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
        super(props)

        this.getContent = this.getContent.bind(this)
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
                            inline: true,
                            name: 'projectHash',
                            onChange: deferred(this.handleProjectChange, 300, this),
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
                                {
                                    label: texts.myRecords,
                                    value: 'records'
                                },
                                {
                                    label: wordsCap.manage,
                                    value: 'manage',
                                },
                                {
                                    label: wordsCap.invites,
                                    value: 'invites',
                                },
                                {
                                    label: wordsCap.summary,
                                    value: 'summary',
                                },
                            ],
                        },
                    ],
                }
            ],
        }
    }

    componentWillMount() {
        this.tieIdIdentity = selectedAddressBond.tie(() => {
            // untie from any existing subscriptions
            if (this.tieIdProjects && this.projectsBond) this.projectsBond.untie(this.tieIdProjects)
            const { address } = getSelected()

            // listen for changes and update projects list accordingly
            this.projectsBond = Bond.all([
                // projects owned by selected identity
                project.listByOwner(address),
                // projects selected identity was invited to
                timeKeeping.invitation.listByWorker(address)
            ])

            this.projectsBond.tie(([owned, invited]) => {
                const { inputs, values } = this.state
                const { projectHash } = values
                const projectHashes = arrUnique([...owned, ...invited].map(bytesToHex)).map(h => '0x' + h)
                const projectIn = findInput(inputs, 'projectHash')
                projectIn.loading = true
                client.projectsByHashes(projectHashes, (_, projects, unknownHashes = []) => {
                    const options = Array.from(projects).map(([hash, project]) => ({
                        key: hash,
                        project,
                        text: project.name,
                        value: hash,
                    })).concat(...unknownHashes.map(hash => ({
                        // if for some reason chatserver does not have the data for a project
                        key: hash,
                        text: hash,
                        value: hash,
                    })))
                    projectIn.loading = false
                    projectIn.options = arrSort(options, 'text')
                    projectIn.noResultsMessage = options.length > 0 ? undefined : (
                        // user doesn't own any project and never been invited to one
                        <p style={{ whiteSpace: 'pre-wrap' }}>
                            {texts.createProjectOrRequestInvite}
                        </p>
                    )

                    if (!projectHash || !options.find(x => x.value === projectHash)) {
                        const firstOption = options[0] || {}
                        projectIn.value = firstOption.value
                        values.projectHash = firstOption.value
                    }

                    this.setState({ inputs, values })
                })
            })
        })
    }

    componentWillUnmount() {
        selectedAddressBond.untie(this.tieIdIdentity)
        this.projectsBond.untie(this.tieIdProjects)
    }

    handleChange(_, values) {
        this.setState({ values })
    }

    handleProjectChange(_, { projectHash }) {
        const { inputs } = this.state
        const { options } = findInput(inputs, 'projectHash')
        const project = !projectHash ? undefined : options.find(o => o.value === projectHash).project
        this.setState({ inputs, project })
    }

    getContent(mobile) {
        const { inputs, project, values: { projectHash, option } } = this.state
        let contents = []
        const manage = option.includes('manage')
        const showSummary = option.includes('summary')
        const showInvites = option.includes('invites')
        const showRecords = option.includes('records') || manage
        const optionInput = findInput(inputs, 'option')
        optionInput.inline = !mobile
        optionInput.style = { float: mobile ? '' : 'right' }
        optionInput.style.paddingTop = 7
        findInput(inputs, 'option').options.find(x => x.value === 'records').disabled = manage

        if (showRecords) contents.push({
            content: <ProjectTimeKeepingList {...{ project, projectHash, manage }} />,
        })
        if (showInvites) contents.push({
            content: <TimeKeepingInviteList {...{ projectHash }} />,
            header: wordsCap.invitations
        })
        if (showSummary) contents.push({
            content: <TimeKeepingSummary />,
            header: texts.myTimeKeepingSummary,
        })

        return (
            <div>
                <FormBuilder {...{
                    inputs,
                    onChange: this.handleChange.bind(this),
                    submitText: null
                }}
                />
                {contents.map((item, i) => (
                    <ContentSegment
                        {...item}
                        active={true}
                        basic={true}
                        key={i}
                        headerTag="h3"
                        style={{ padding: 0 }}
                    />
                ))}
            </div>
        )
    }

    render() {
        return <IfMobile then={this.getContent} else={this.getContent} />
    }
}

export default TimeKeepingView