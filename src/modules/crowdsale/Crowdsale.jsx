import React, { useEffect } from 'react'
import { Button, Step } from 'semantic-ui-react'
import { isBool } from '../../utils/utils'
import Message from '../../components/Message'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { iUseReducer, reducer, subjectAsPromise, usePromise, useRxSubject } from '../../services/react'
import { MOBILE, rxLayout } from '../../services/window'
import client, { rxIsLoggedIn, rxIsRegistered } from '../chat/ChatClient'
import RegistrationForm from '../chat/RegistrationForm'
import { getDeposits } from './crowdsale'
import AddressList from './AddressList'
import DepositStats from './DepositStats'
import KYCForm from './KYCForm'
import KYCViewForm from './KYCViewForm'

const START_BLOCK = 1787748
const END_BLOCK = 9999
const textsCap = translated({
    loading: 'loading',
    loginRequired: 'you must be logged in and online to access this section',
    stepAccountDesc: 'create an account so that you can continue with the crowdsale registration',
    stepAccountTitle: 'create an account',
    stepDepositDesc: 'contibute to the crowdsale by depositing funds using one or more of your chosen Blockchains',
    stepDepositTitle: 'deposit funds',
    stepKYCTitle: 'register for crowdsale',
    stepUnlockDesc: 'you will be able to unlock equivalent to three times the total contribution amount as soon as crowdsale ends',
    stepUnlockTitle: 'unlock funds',
    viewCrowdsaleData: 'view your crowdsale data',
}, true)[1]

export default function () {
    // checks if user is registered
    const [isRegistered] = usePromise(async () => await subjectAsPromise(rxIsRegistered, true)[0])
    // waits until user is logged in for the first time after page load
    // will not update if user goes offline and messaging service disconnects
    const [isLoggedIn] = usePromise(async () => await subjectAsPromise(rxIsLoggedIn, true)[0])
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const [isActive] = [true] // use block number to determine active
    const [state, setState] = iUseReducer(reducer, {
        kycDone: false,
        loading: true,
    })

    useEffect(() => {        
        isLoggedIn && !state.kycDone && (async () => {
            let newState = {}
            try {
                // check if KYC done
                const kycDone = await client.crowdsaleKYC.promise(true)
                // retrieve any existing amounts deposited
                const { deposits = {}, lastChecked } = (kycDone && await getDeposits()) || {}
                newState = {
                    ...state,
                    deposits,
                    kycDone,
                    lastChecked,
                    message: null, 
                }
            } catch (err) {
                console.trace(err)
                newState = {
                    message: {
                        content: `${err}`,
                        icon: true,
                        status: 'error',
                    }
                }
            }
            setState({ ...newState, loading: false })
        })()
        
    }, [isLoggedIn])

    const activeIndex = !isRegistered
        ? 0
        : !isLoggedIn || state.loading || !!state.message
            ? -1
            : !state.kycDone
                ? 1
                : isActive ? 2 : 3
    const showProgress = activeIndex >= 0
    const progressSteps = showProgress && [
        {
            title: textsCap.stepAccountTitle,
            description: textsCap.stepAccountDesc,
        },
        {
            description: '',
            disabled: false,
            title: (
                <div className='title'>
                    {state.kycDone && (
                        <Button {...{
                            circular: true,
                            icon: 'eye',
                            onClick: () => showForm(KYCViewForm),
                            size: 'mini',
                            title: textsCap.viewCrowdsaleData,
                        }} />
                    )}
                    {textsCap.stepKYCTitle}
                </div>
            ),
        },
        {
            description: (
                <div>
                    {textsCap.stepDepositDesc}
                    <br />
                    {state.kycDone && <DepositStats />}
                </div>
            ),
            title: textsCap.stepDepositTitle,
        },
        {
            description: textsCap.stepUnlockDesc,
            title: textsCap.stepUnlockTitle,
        },
    ].map((x, i) => ({
        ...x,
        active: activeIndex === i, 
        completed: isBool(x.completed)
            ? x.completed
            : activeIndex > i,
        description: activeIndex === i
            ? x.description
            : undefined, // hide when not active
        disabled: isBool(x.disabled)
            ? x.disabled
            : activeIndex !== i,
        key: i,
        style: isMobile
            ? null
            : { maxWidth: 450 },
    }))

    let content = ''
    switch (activeIndex) {
        case -1:
            const isLoading = state.loading || isLoggedIn === null
            const msgProps = state.message || {
                header: isLoading
                    ? textsCap.loading
                    : textsCap.loginRequired,
                icon: true,
                status: isLoading
                    ? 'loading'
                    : 'error',
            }
            content = <Message {...msgProps} />
            break
        case 0: 
            content = getInlineForm(RegistrationForm)
            break
        case 1: 
            content = getInlineForm(KYCForm, {
                onSubmit: kycDone => kycDone && setState({ kycDone }),
                style: { maxWidth: 400 },
            })
            break
        case 2:
        case 3:
            content = <AddressList />
            break
    }
        
    return (
        <div>
            {showProgress && (
                <Step.Group {...{
                    items: progressSteps,
                    fluid: true,
                    // ordered: true,
                    stackable: 'tablet',
                    style: {
                        maxWidth: '100%',
                        overflowX: 'auto',
                    },
                }} />
            )}
            {content}
        </div>
    )
}

const getInlineForm = (Form, props) => (
    <div>
        <h3>{Form.defaultProps.header}</h3>
        <h4 style={{ color: 'grey', marginTop: 0 }}>
            {Form.defaultProps.subheader}
        </h4>
        <Form {...props} />
    </div>
)