import React from 'react'
import PropTypes from 'prop-types'
import FormBuilder, { fillValues } from '../../../components/FormBuilder'
import { statuses } from '../../../components/Message'
import { addToQueue, QUEUE_TYPES } from '../../../services/queue'
import { translated } from '../../../utils/languageHelper'
import { iUseReducer } from '../../../utils/reactHelper'
import { generateHash, isFn } from '../../../utils/utils'
import { TYPES, validate } from '../../../utils/validator'
import { getIdentityOptions } from '../../identity/getIdentityOptions'
import { rxIdentities } from '../../identity/identity'
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
    proposalLabel: 'proposal',
    proposalPlaceholder: 'enter brief proposal to stand out by including key skills, experiences and any other relevant details.',
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
    return <FormBuilder {...{...props, ...state }} />
}
ApplicationForm.propTypes = {
    values: PropTypes.shape({
        taskId: PropTypes.string.isRequired,
    }),
    title: PropTypes.string, 
}
ApplicationForm.defaultProps = {
    header: textsCap.header,
}

const getInitialState = props => rxSetState => {
    const { values = {} } = props
    const inputs = [
        {
            label: textsCap.workerLabel,
            labelDetails: textsCap.workerLabelDetails,
            name: inputNames.workerAddress,
            placeholder: textsCap.workerPlaceholder,
            required: true,
            rxOptions: rxIdentities,
            rxOptionsModifier: getIdentityOptions,
            search: ['keywords'],
            selection: true,
            type: 'dropdown',
        },
        {
            label: textsCap.proposalLabel,
            maxLength: 500,
            minLength: 50,
            name: inputNames.proposal,
            placeholder: textsCap.proposalPlaceholder,
            required: true,
            style: { minHeight: 150 },
            type: 'textarea',
        },
        {
            label: textsCap.linksLabel,
            maxLength: 500,
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

                for (let i = 0; i < links.length; i++) {
                    const link = links[i]
                    if (link.length > 96) return textsCap.linksErrLength

                    const invalid = !!validate(link, { required: true, type: TYPES.url })
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
