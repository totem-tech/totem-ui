import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import uuid from 'uuid'
import { isFn } from '../../utils/utils'
import FormBuilder, { fillValues } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { registerStepIndex, setActiveStep } from '../../views/GettingStartedView'
import client, { getUser, referralCode, rxIsRegistered } from './ChatClient'
import { iUseReducer, reducer, useRxSubject } from '../../services/react'

const textsCap = translated({
    alreadyRegistered: 'you have already registered!',
    formHeader: 'register a memorable user name',
    formSubheader: 'choose an unique alias for use with Totem chat messaging.',
    referredByLabel: 'referral code',
    referredByPlaceholder: 'if you have a referral code enter it here',
    register: 'register',
    registrationComplete: 'registration complete',
    registrationFailed: 'registration failed',
    userId: 'User ID',
    userIdCriteria: 'please enter an User ID that meets the following criteria:',
    userIdCriteria1: 'starts with a letter',
    userIdCriteria2: 'contains minimum 3 characters',
    userIdCriteria3: 'contains only alphanumeric characters',
    userIdPlaceholder: 'enter your desired ID',
}, true)[1]

export const inputNames = {
    redirectTo: 'redirectTo',
    referredBy: 'referredBy',
    secret: 'secret',
    url: 'url',
    userId: 'userId',
}

export default function RegistrationForm(props) {
    const [state, setState] = useRxSubject(
        rxIsRegistered,
        isRegistered => ({
            inputs: getInputs(props, isRegistered),
            submitDisabled: { isRegistered },
        }),
        false
    )

    console.log({props})
    
    return (
        <FormBuilder {...{
            ...props,
            ...state,
            onSubmit: handleSubmit(props, setState),
        }} />
    )
}

RegistrationForm.propsTypes = {
    // @silent: whether to continue with next step in the gettings started process
    silent: PropTypes.bool,
    values: PropTypes.shape({
        redirectTo: PropTypes.string,
        referralCode: PropTypes.string,
        referredBy: PropTypes.string,
        secret: PropTypes.string,
        url: PropTypes.string,
        userId: PropTypes.string,        
    }),
}
RegistrationForm.defaultProps = {
    closeOnSubmit: true,
    header: textsCap.formHeader,
    headerIcon: 'sign-in',
    silent: true,
    size: 'tiny',
    subheader: textsCap.formSubheader,
    submitText: textsCap.register
}

const getInputs = (props, isRegistered) => {
    const { values = {} } = props
    let { referredBy, referralCode: rfc } = values
    const referredBySaved = referralCode()
    // if user has already been referred by someone use the first referrer's code
    referredBy = referredBySaved || referredBy || rfc || ''
    values.referredBy = referredBy
    // save referral information to local storage
    if (referredBy && !referredBySaved) referralCode(referredBy)
    return fillValues([
        {
            disabled: isRegistered,
            label: textsCap.userId,
            message: {
                content: isRegistered ? '' : (
                    <div>
                        {textsCap.userIdCriteria}
                        <ul>
                            <li>{textsCap.userIdCriteria1}</li>
                            <li>{textsCap.userIdCriteria2}</li>
                            <li>{textsCap.userIdCriteria3}</li>
                        </ul>
                    </div>
                ),
                header: !isRegistered ? '' : textsCap.alreadyRegistered,
                icon: isRegistered,
                status: isRegistered ? 'error' : 'warning',
                style: { textAlign: 'left' },
            },
            name: inputNames.userId,
            multiple: false,
            newUser: true,
            placeholder: textsCap.userIdPlaceholder,
            type: 'UserIdInput',
            required: true,
        },
        {
            hidden: values => !!referredBy && values[inputNames.referredBy] === referredBy,
            label: textsCap.referredByLabel,
            name: inputNames.referredBy,
            placeholder: textsCap.referredByPlaceholder,
            rxValue: new BehaviorSubject(referredBy),
            type: 'UserIdInput',
            validate: async (_, { value }, _v, rxValue) => {
                if (!value || !values.referredBy || await client.idExists.promise(value)) return
                // reset value, if invalid referral code used in the URL
                rxValue.next('')
                referralCode(null)
            },
        },
        {
            // auto redirect after successful registration
            hidden: true,
            name: inputNames.redirectTo,
            type: 'url',
        },
    ], values)
}

const handleSubmit = (props, setState) => (_, values) => {
    const { onSubmit, silent } = props
    const userId = values[inputNames.userId]
    const referredBy = values[inputNames.referredBy]
    const redirectTo = values[inputNames.redirectTo]
    const secret = uuid.v1()
    console.log({props, silent})

    setState({ submitInProgress: true })
    client.register(userId, secret, referredBy, err => {
        const success = !err
        const message = {
            content: err,
            header: success ? textsCap.registrationComplete : textsCap.registrationFailed,
            icon: true,
            status: success ? 'success' : 'error'
        }
        setState({
            message,
            submitInProgress: false,
            success,
        })
        isFn(onSubmit) && onSubmit(success, values)

        if (!success) return
        // set getting started active step
        setActiveStep(registerStepIndex + 1, silent)
        // redirect URL
        redirectTo && setTimeout(() => window.location.href = redirectTo, 100)

        // delete referral information from device
        referralCode(null)
    })
}