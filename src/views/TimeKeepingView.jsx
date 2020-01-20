import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Bond } from 'oo7'
import { arrSort, isObj, textCapitalize } from '../utils/utils'
import ContentSegment from '../components/ContentSegment'
import FormBuilder, { findInput, fillValues } from '../components/FormBuilder'
import ProjectTimeKeepingList from '../lists/TimeKeepingList'
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
export default class TimeKeepingView extends Component {
    constructor(props) {
        super(props)

        this.state = {
            values: isObj(props.values) ? props.values : { option: 'records' },
            inputs: [
                {
                    name: 'group',
                    type: 'group',
                    inputs: [
                        {
                            bond: new Bond(),
                            className: 'no-margin',
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
                            bond: new Bond(),
                            multiple: true,
                            name: 'option',
                            toggle: true,
                            options: [
                                { label: texts.myRecords, value: 'records' },
                                { label: wordsCap.manage, value: 'manage' },
                                // { label: wordsCap.invites, value: 'invites' },
                                { label: wordsCap.summary, value: 'summary' },
                            ],
                            value: 'records',
                            type: 'checkbox-group',
                            width: 12,
                        },
                    ],
                }
            ],
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount() {
        this._mounted = true
        this.tieId = getProjectsBond.tie(() => this.loadProjectOptions())
        this.tieIdLayout = layoutBond.tie(layout => this.setState({ isMobile: layout === 'mobile' }))
        fillValues(this.state.inputs, this.props.values, true)
    }
    componentWillUnmount() {
        this._mounted = false
        getProjectsBond.untie(this.tieId)
        layoutBond.untie(this.tieIdLayout)
    }

    handleChange = (_, values) => setTimeout(() => this.setState({ values }))

    loadProjectOptions = () => {
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

    render() {
        const { inputs, isMobile, values: { projectHash, option } } = this.state
        const { loading, options: projectOptions } = findInput(inputs, 'projectHash')
        const { ownerAddress, name } = (projectOptions.find(x => x.value === projectHash) || {}).project || {}
        const { address } = getSelected()
        const isOwner = ownerAddress === address
        // const isMobile = layout === 'mobile'
        let contents = []
        const manage = isOwner && option.includes('manage')
        const showSummary = option.includes('summary')
        // const showInvites = option.includes('invites')
        const showRecords = option.includes('records') || manage
        const optionInput = findInput(inputs, 'option')
        optionInput.inline = !isMobile
        optionInput.style = { float: isMobile ? '' : 'right' }
        optionInput.style.paddingTop = 7
        optionInput.options.find(x => x.value === 'records').disabled = manage
        optionInput.options.find(x => x.value === 'manage').hidden = !isOwner

        const recordListProps = { isOwner, manage, ownerAddress, projectHash, projectName: name }
        if (!loading && showRecords) contents.push({
            content: <ProjectTimeKeepingList {...recordListProps} />,
            key: 'ProjectTimeKeepingList' + JSON.stringify(recordListProps),
        })
        if (showSummary) contents.push({
            content: <TimeKeepingSummary />,
            header: texts.myTimeKeepingSummary,
            key: 'TimeKeepingSummary' + projectHash,
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
}
TimeKeepingView.propTypes = {
    values: PropTypes.shape({
        option: PropTypes.string,
        projectHash: PropTypes.string,
    })
}