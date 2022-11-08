import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import uuid from 'uuid'
import { isBool, isFn, isObj } from '../../utils/utils'
import FormBuilder, { fillValues } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { useRxSubject } from '../../services/react'
import { stepIndexes, setActiveStep } from '../gettingStarted/GettingStarted'
import { rxSelected } from '../identity/identity'
import client, { referralCode, rxIsRegistered } from './ChatClient'
import { iUseReducer } from '../../utils/reactHelper'

const textsCap = translated({
    alreadyRegistered: 'you have already registered!',
    createAccount: 'create account',
    formHeader: 'register a memorable user name',
    formSubheader: 'choose an unique alias for use with Totem messaging service.',
    referredByLabel: 'referral code',
    referredByPlaceholder: 'if you have a referral code enter it here',
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
        isRegistered => isObj(isRegistered)
            ? isRegistered // state update using setState
            : { // value of isRegistered changed
                inputs: getInputs(props, isRegistered),
                submitDisabled: { isRegistered },
            },
        {},
        true,
    )

    return (
        <FormBuilder {...{
            ...props,
            ...state,
            onSubmit: handleSubmit(props, setState),
            onClose: (...args) => {
                let { values: { redirectTo } = {}} = props
                isFn(props.onClose) && props.onClose(...args)
                try { 
                    redirectTo = new URL(redirectTo)
                    window.location.href = redirectTo.href
                } catch (err) {}
            },
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
    silent: false,
    size: 'tiny',
    subheader: textsCap.formSubheader,
    submitText: textsCap.createAccount
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

    const supportedPlatforms = [
        'twitter'
    ]
    const isSocialRefer = referredBy
        && supportedPlatforms
            .includes(`${referredBy}`.split('@')[1])
    const validateRFC = async (_, { value }, _v, rxValue) => {
        if (!value || !values.referredBy || await client.idExists.promise(value)) return
        // reset value, if invalid referral code used in the URL
        rxValue.next('')
        referralCode(null)
    }

    return fillValues([
        {
            disabled: isRegistered,
            label: textsCap.userId,
            multiple: false,
            name: inputNames.userId,
            newUser: true,
            required: true,
            placeholder: textsCap.userIdPlaceholder,
            type: 'UserIdInput',
        },
        {
            hidden: values => isSocialRefer || !!referredBy && values[inputNames.referredBy] === referredBy,
            label: textsCap.referredByLabel,
            name: inputNames.referredBy,
            placeholder: textsCap.referredByPlaceholder,
            rxValue: new BehaviorSubject(referredBy),
            type: isSocialRefer
                ? 'text'
                : 'UserIdInput',
            // no need to validate UserID if referred from social platforms
            validate: !isSocialRefer && validateRFC,
        },
        {
            // auto redirect after successful registration
            hidden: true,
            name: inputNames.redirectTo,
            type: 'url',
        },
    ], values)
}

const handleSubmit = (props, setState) => async (_, values) => {
    const { onSubmit, silent } = props
    const userId = values[inputNames.userId]
    const referredBy = values[inputNames.referredBy]
    const redirectTo = values[inputNames.redirectTo]
    const secret = uuid.v1()
    const address = rxSelected.value

    setState({ submitInProgress: true })
    const err = await client.register.promise(
        userId,
        secret,
        address,
        referredBy,
    )
    const success = !err
    const message = {
        content: err,
        header: success
            ? textsCap.registrationComplete
            : textsCap.registrationFailed,
        icon: true,
        status: success
            ? 'success'
            : 'error'
    }
    const state = {
        message,
        submitInProgress: false,
        success,
    }
    setState(state)
    isFn(onSubmit) && onSubmit(success, values)
    if (!success) return
    
    // set getting started active step
    setActiveStep(
        stepIndexes.register + 1,
        redirectTo
            ? false
            : silent,
        redirectTo,
    )
    // delete referral information from device
    referralCode(null)
}