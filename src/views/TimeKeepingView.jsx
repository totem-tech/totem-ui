import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import {Divider} from 'semantic-ui-react'
import { deferred, objCopy } from '../utils/utils'
import { FormInput } from '../components/FormBuilder'
import ProjectTimeKeepingList from '../lists/TimeKeepingList'
import TimeKeepingSummary from '../lists/TimeKeepingSummary'
import FormBuilder, {findInput} from '../components/FormBuilder'
import {projectDropdown, handleSearch, getAddressName} from '../components/ProjectDropdown'

class TimeKeepingView extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            values: {
                option: 'entries'
            },
            inputs: [
                {
                    name: 'group',
                    type: 'group',
                    equalWidths: true,
                    inputs: [
                        {
                            name: 'option',
                            placeholder: 'Select an option',
                            selection: true,
                            type: 'dropdown',
                            value: 'entries',
                            options: [
                                {
                                    text: 'My Entries',
                                    value: 'entries'
                                },
                                {
                                    text: 'Invites',
                                    value: 'invites',
                                },
                                {
                                    text: 'Manage',
                                    value: 'manage',
                                },
                                {
                                    text: 'Summary',
                                    value: 'summary',
                                },
                            ],
                        },
                        objCopy(
                            {
                                label: '',
                                onChange: this.handleProjectChange.bind(this),
                                onSearchChange: deferred(handleSearch, 300, this),
                            },
                            projectDropdown,
                            true,
                        ),
                    ],
                }
            ],
        }
    }

    handleChange(e, values = {}) {
        this.setState({values})
    }

    handleProjectChange(_, { projectHash }) {
        const { inputs } = this.state
        const {options} = findInput(inputs, 'projectHash')
        const project = !projectHash ? undefined : options.find(o => o.value === projectHash).project
        this.setState({ inputs, project })
    }

    render() {
        const { inputs, project, values: {projectHash, option} } = this.state
        let content = ''

        switch(option) {
            case 'summary': 
                content = <TimeKeepingSummary />
                break
            case 'entries':
            case 'manage':
                content = <ProjectTimeKeepingList {...{project, projectHash}} manage={option === 'manage'} />
                break
            case 'invites': 
                break
        }

        return (
            <div>
                <FormBuilder {...{inputs, onChange: this.handleChange.bind(this) , submitText: null}} />
                {content}
            </div>
        )
    }
}

export default TimeKeepingView