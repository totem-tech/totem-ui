import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import { Divider, Header } from 'semantic-ui-react'
import { deferred, objCopy, IfMobile, newMessage } from '../utils/utils'
import ContentSegment from '../components/ContentSegment'
import ProjectTimeKeepingList from '../lists/TimeKeepingList'
import TimeKeepingInviteList from '../lists/TimeKeepingInviteList'
import TimeKeepingSummary from '../lists/TimeKeepingSummary'
import FormBuilder, { findInput } from '../components/FormBuilder'
import { projectDropdown, handleSearch } from '../components/ProjectDropdown'

class TimeKeepingView extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.getContent = this.getContent.bind(this)
        this.state = {
            values: {
                option: 'entries'
            },
            inputs: [
                {
                    name: 'group',
                    type: 'group',
                    inputs: [
                        objCopy(
                            {
                                label: '',
                                onChange: this.handleProjectChange.bind(this),
                                onSearchChange: deferred(handleSearch, 300, this),
                                styleContainer: { minWidth: '15em' },
                                width: 4,
                            },
                            projectDropdown,
                            true,
                        ),
                        {
                            multiple: true,
                            name: 'option',
                            placeholder: 'Select an option',
                            toggle: true,
                            type: 'checkbox-group',
                            value: 'entries',
                            width: 12,
                            options: [
                                {
                                    label: 'My Entries',
                                    value: 'entries'
                                },
                                {
                                    label: 'Manage',
                                    value: 'manage',
                                },
                                {
                                    label: 'Invites',
                                    value: 'invites',
                                },
                                {
                                    label: 'Summary',
                                    value: 'summary',
                                },
                            ],
                        },
                    ],
                }
            ],
        }
    }

    handleChange(e, values = {}) {
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
        const showEntries = option.includes('entries') || manage
        const optionInput = findInput(inputs, 'option')
        optionInput.inline = !mobile
        optionInput.style = { float: mobile ? '' : 'right' }
        optionInput.style.paddingTop = 7
        findInput(inputs, 'option').options.find(x => x.value === 'entries').disabled = manage

        if (showEntries) contents.push({
            content: <ProjectTimeKeepingList {...{ project, projectHash, manage }} />,
        })
        if (showInvites) contents.push({
            content: <TimeKeepingInviteList {...{ projectHash }} />,
            header: 'Invitations'
        })
        if (showSummary) contents.push({
            content: <TimeKeepingSummary />,
            header: 'My Time Keeping Summary',
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