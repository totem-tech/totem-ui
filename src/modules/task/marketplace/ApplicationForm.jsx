import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import React from 'react'
import FormBuilder, { fillValues } from '../../../components/FormBuilder'
import { addToQueue, QUEUE_TYPES } from '../../../services/queue'
import { translated } from '../../../utils/languageHelper'
import { iUseReducer, statuses } from '../../../utils/reactjs'
import { generateHash, isFn } from '../../../utils/utils'
import { TYPES, validate } from '../../../utils/validator'
import { getIdentityOptions } from '../../identity/getIdentityOptions'
import { get as getIdentity, rxIdentities } from '../../identity/identity'
import { queueableApis } from '../task'

let textsCap = {
    header: 'task application',
    linksLabel: 'links',
    linksPlaceholder: 'enter URLs of your website, portfolio, online resume and anything else you feel is related and may help you get selected.',
    linksPlaceholder2: 'one URL per line',
    linksErrInvalid: 'please enter a valid URL',
    linksErrLength: 'please enter URL with shorter than 96 characters',
    linksErrMax: 'maximum 5 links allowed',
    loading: 'loading...',
    nameLabel: 'change partner name',
    nameLabelDetails: 'this will be seen by recipients',
    namePlaceholder: 'enter a name to be shared',
    proposalLabel: 'proposal',
    proposalPlaceholder: 'write your proposal to stand out by including key skills, experiences and any other relevant details.',
    successContent: 'once your application has been accepted the task will be assigned to you and you will receive a notification to accept or reject it.',
    successHeader: 'application submitted!',
    title: 'title',
    workerLabel: 'identity',
    workerLabelDetails: 'this identity will be used to assign the task to you.',
    workerPlaceholder: 'select an identity',
}
textsCap = translated(textsCap, true)[1]
export const inputNames = {
    links: 'links',
    name: 'name',
    proposal: 'proposal',
    taskId: 'taskId',
    workerAddress: 'workerAddress',
}
export default function ApplicationForm(props) {
    const [state] = iUseReducer(null, getInitialState(props))
    const {
        subheader,
        title,
    } = props

    state.subheader = subheader
        || title
        && `${textsCap.title}: ${title}`
    return <FormBuilder {...{ ...props, ...state }} />
}
ApplicationForm.propTypes = {
    proposalRequired: PropTypes.bool,
    title: PropTypes.string,
    values: PropTypes.shape({
        taskId: PropTypes.string.isRequired,
    }),
}
ApplicationForm.defaultProps = {
    header: textsCap.header,
}

const getInitialState = props => rxSetState => {
    const {
        proposalRequired = true,
        values = {},
    } = props
    const rxName = new BehaviorSubject('')
    const inputs = [
        {
            label: textsCap.workerLabel,
            labelDetails: textsCap.workerLabelDetails,
            name: inputNames.workerAddress,
            onChange: (_, values) => {
                // update name field
                const { name = '' } = getIdentity(values[inputNames.workerAddress])
                rxName.next(name)
            },
            placeholder: textsCap.workerPlaceholder,
            required: true,
            rxOptions: rxIdentities,
            rxOptionsModifier: getIdentityOptions,
            search: ['keywords'],
            selection: true,
            type: 'dropdown',
        },
        {
            label: textsCap.nameLabel,
            labelDetails: (
                <b style={{ color: 'deeppink' }}>
                    {textsCap.nameLabelDetails}
                </b>
            ),
            minLength: 3,
            maxLength: 32,
            name: inputNames.name,
            placeholder: textsCap.namePlaceholder,
            required: true,
            rxValue: rxName,
            type: 'text',
        },
        {
            customMessages: {
                lengthMin: true,
            },
            hidden: !proposalRequired,
            label: textsCap.proposalLabel,
            maxLength: 2000,
            minLength: 50,
            name: inputNames.proposal,
            placeholder: `${textsCap.proposalPlaceholder} (50-2000)`,
            required: true,
            style: { minHeight: 150 },
            type: 'textarea',
            value: '',
        },
        {
            hidden: !proposalRequired,
            label: textsCap.linksLabel,
            maxLength: 504,
            name: inputNames.links,
            placeholder: `${textsCap.linksPlaceholder}\n\n${textsCap.linksPlaceholder2}`,
            required: false,
            style: { minHeight: 120 },
            type: 'textarea',
            validate: (_, { value }) => {
                const links = value
                    .split('\n')
                    .map(x => x.trim())
                    .filter(Boolean)
                if (!links.length) return

                if (links.length > 5) return textsCap.linksErrMax

                for (let i = 0;i < links.length;i++) {
                    const link = links[i]
                    if (link.length > 100) return textsCap.linksErrLength

                    const invalid = !!validate(link, {
                        required: true,
                        strict: false,
                        type: TYPES.url,
                    })
                    if (invalid) return `${textsCap.linksErrInvalid}: ${link}`
                }
            }
        },
        {
            name: inputNames.taskId,
            required: true,
            type: 'hidden',
        },
    ]

    return {
        inputs: fillValues(inputs, values),
        onSubmit: handleSubmit(rxSetState, props),
    }
}

const handleSubmit = (rxSetState, props) => (_, values) => {
    const { onSubmit, title } = props
    const taskId = values[inputNames.taskId]
    const linksArr = `${values[inputNames.links] || ''}`
        .split('\n')
        .map(x => x.trim())
        .filter(Boolean)
    const pName = inputNames.proposal
    values[pName] = values[pName].trim()

    rxSetState.next({
        message: {
            content: textsCap.loading,
            icon: true,
            status: statuses.LOADING,
        },
    })

    const handleResult = (success, err) => {
        rxSetState.next({
            message: {
                content: success
                    ? textsCap.successContent
                    : err,
                header: success && textsCap.successHeader,
                icon: true,
                status: success
                    ? statuses.SUCCESS
                    : statuses.ERROR,
            },
            success,
        })
        isFn(onSubmit) && onSubmit(success, values)
    }

    const func = queueableApis.marketApply
    const queueId = generateHash(taskId + func)
    addToQueue({
        args: [{
            ...values,
            [inputNames.links]: linksArr,
        }],
        description: title,
        func,
        recordId: taskId,
        then: handleResult,
        title: textsCap.header,
        type: QUEUE_TYPES.CHATCLIENT,
    }, queueId)
}
