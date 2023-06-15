import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { iUseReducer } from '../../utils/reactjs'
import { generateHash, isFn, objClean } from '../../utils/utils'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
// services
import { translated } from '../../utils/languageHelper'
import { confirm, showForm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
// modules
import { getIdentityOptions } from '../identity/getIdentityOptions'
import { find as findIdentity, rxIdentities } from '../identity/identity'
import { rxPartners } from '../partner/partner'
import PartnerForm from '../partner/PartnerForm'
import getPartnerOptions from '../partner/getPartnerOptions'
import { getProjects, queueables } from './activity'
import { bonsaiKeys } from './ActivityForm'

let textsCap = {
    addPartner: 'add partner',
    cancel: 'cancel',
    confirmHeader: 'are you sure you want to reassign this activity?',
    confirmMsg1: 'you are about to assign the ownership of this activity to an Identity that does not belong to you.',
    confirmMsg2: 'if you proceed, you will no longer be able to update or manage this activity.',
    formHeader: 're-assign activity Owner',
    activityIdLabel: 'activity ID',
    identity: 'identity',
    identityOptionsHeader: 'select own identity',
    nameLabel: 'activity Name',
    newOwnerLabel: 'new activity Owner',
    newOwnerPlaceholder: 'select new owner',
    newOwnerReassignSelfMsg: 'cannot reassign activity to yourself',
    ownerLabel: 'current Activity Owner',
    partner: 'partner',
    partnerOptionsHeader: 'select a partner',
    proceed: 'proceed',
    queueDescription: 'activity Name',
    queueTitle: 're-assign activity owner',
    saveBONSAIToken: 'save BONSAI auth token',
}
textsCap = translated(textsCap, true)[1]

export default function ActivityReassignForm(props) {
    const [state] = iUseReducer(null, rxSetState => {
        const { hash, values } = props
        const inputs = [
            {
                label: textsCap.nameLabel,
                name: 'name',
                readOnly: true,
                required: true,
                type: 'text',
                value: ''
            },
            {
                label: textsCap.activityIdLabel,
                name: 'hash',
                readOnly: true,
                required: true,
                type: 'text',
                value: ''
            },
            {
                disabled: true,
                label: textsCap.ownerLabel,
                name: 'ownerAddress',
                required: true,
                options: [],
                rxOptions: rxIdentities,
                rxOptionsModifier: getIdentityOptions,
                search: ['keywords'],
                selection: true,
                type: 'dropdown',
            },
            {
                label: textsCap.newOwnerLabel,
                name: 'newOwnerAddress',
                options: [],
                placeholder: textsCap.newOwnerPlaceholder,
                rxOptions: rxPartners,
                rxOptionsModifier: partners => {
                    const { values = {} } = props
                    const { ownerAddress } = values
                    return getPartnerOptions(partners, {}, true)
                        .filter(x => x.value !== ownerAddress)
                },
                rxValue: new BehaviorSubject(),
                search: ['keywords'], // search both name and project hash
                selection: true,
                required: true,
                type: 'dropdown',
                validate: (_, { ownerAddress, newOwnerAddress }) => {
                    const invalid = ownerAddress
                        && ownerAddress !== newOwnerAddress
                    return invalid && {
                        content: newOwnerReassignSelfMsg,
                        status: 'error'
                    }
                },
            },
            {
                content: textsCap.addPartner,
                fluid: true,
                name: 'addPartnerButton',
                onClick: () => showForm(PartnerForm, {
                    onSubmit: (ok, { address }) => {
                        if (!ok) return
                        const newOwnerIn = findInput(inputs, 'newOwnerAddress')
                        newOwnerIn.rxValue.next(address)
                    }
                }),
                type: 'button'
            }
        ]
        const state = {
            message: {},
            onSubmit: handleSubmit(props, rxSetState),
            success: false,
            inputs: fillValues(inputs, { ...values, hash }),
        }

        return state
    })


    return <FormBuilder {...{ ...props, ...state }} />
}
ActivityReassignForm.propTypes = {
    hash: PropTypes.string.isRequired,
    values: PropTypes.shape({
        name: PropTypes.string.isRequired,
        ownerAddress: PropTypes.string.isRequired,
    }).isRequired
}
ActivityReassignForm.defaultProps = {
    header: textsCap.formHeader,
    size: 'mini',
}

const handleSubmit = (props, rxSetState) => (_, values) => {
    const { values: project, onSubmit } = props
    const {
        hash,
        name,
        ownerAddress,
        newOwnerAddress,
    } = values
    // confirm if re-assigning to someone else
    const doConfirm = !!findIdentity(newOwnerAddress)
    const handleResult = (isLast = false) => (success, err) => {
        if (!isLast && success) return
        rxSetState.next({
            loading: !isLast,
            message: {
                content: success
                    ? textsCap.successContent
                    : err,
                status: 'success',
                icon: true
            },
            success,
        })

        isLast && success && getProjects(true)
    }
    const projectUpdated = {
        ...project,
        ownerAddress: newOwnerAddress,
    }
    const description = `${textsCap.queueDescription}: ${name}`
    const reassignOwner = queueables.reassign(
        ownerAddress,
        newOwnerAddress,
        hash,
        {
            description,
            then: handleResult(),
            title: textsCap.queueTitle,
        },
    )
    const updateOffChainStorage = {
        args: [
            hash,
            projectUpdated,
            false,
            err => isFn(onSubmit) && onSubmit(values, !err)
        ],
        description,
        func: 'project',
        next: reassignOwner,
        then: handleResult(true),
        type: QUEUE_TYPES.CHATCLIENT,
        title: textsCap.queueTitle,
    }
    const token = generateHash(
        objClean(projectUpdated, bonsaiKeys)
    )
    const upateBonsaiToken = queueables.saveBONSAIToken(
        ownerAddress,
        hash,
        token,
        {
            description: textsCap.saveBONSAIToken,
            next: updateOffChainStorage,
            then: handleResult(),
            title: textsCap.queueTitle,
        },
    )
    rxSetState.next({ loading: true })
    if (!doConfirm) return addToQueue(upateBonsaiToken)

    confirm({
        cancelButton: { content: textsCap.cancel, color: 'green' },
        confirmButton: { content: textsCap.proceed, negative: true },
        content: `${textsCap.confirmMsg1} ${textsCap.confirmMsg2}`,
        header: (
            <div className='header' style={{ textTransform: 'initial' }}>
                {textsCap.confirmHeader}
            </div>
        ),
        onConfirm: () => addToQueue(upateBonsaiToken),
        size: 'mini'
    })
}