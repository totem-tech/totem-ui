import React, { useEffect, useReducer, useState } from 'react'
import { Button, Icon, Step } from 'semantic-ui-react'
import DataTable from '../../components/DataTable'
import { Message } from '../../components/Message'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { reducer, useRxSubject } from '../../services/react'
import { copyToClipboard } from '../../utils/utils'
import client, { getUser, rxIsLoggedIn, rxIsRegistered } from '../chat/ChatClient'
import RegistrationForm from '../chat/RegistrationForm'
import { crowdsaleData, rxCrowdsaleData } from './crowdsale'
import DAAForm from './DAAForm'
import KYCForm from './KYCForm'
import KYCViewForm from './KYCViewForm'

const textsCap = translated({
    amountDeposited: 'amount deposited',
    blockchain: 'blockchain',
    checkDepositStatus: 'check deposit status',
    despositAddress: 'pay to address',
    level: 'level',
    loadingMsg: 'loading',
    loginRequired: 'you must be logged in and online to access this section',
    multiplierAchieved: 'multiplier achieved!',
    registrationRequired: 'please complete the getting started steps',
    requestBtnTxt: 'request address',
    successMsg: `
        Fantastic! You have now been registered for the Totem Live Association crowdsale.
        You are now ready to deposit funds using any of your chosen Blockchains.
    `,
    successEndingMsg: 'Click close to view your pay to addresses.',
    successNote0: 'Here are a few things for you to note:',
    successNote1: 'You can deposit as many times as you wish to any of your pay to addresses',
    successNote2: 'The number of tokens you receive on the MainNet will be based on the sum of all funds deposited across all supported Blockchains',
    successNote3: 'The more you depost the higher level of multiplier will be unlocked for you',
    successNote4: 'Each higher level of multiplier will get you more bonus tokens than the predecessors',
    successNote5: 'The tokens you recieve will be locked until the end of the crowdsale',
    successNote6: 'You will be able to unlock some of tokens soon after the crowdsale',
    successNote7: 'You will be able to unlocked your bonus tokens when the MainNet launches',
    successNote8: 'MOST IMPORTANTLY, remember to come back once you have made your deposits and the transaction received required confirmations for the respective Blockchain and check your deposit status to avoid delays',
    successNote9: 'If you are in doubt, feel free to contact us the support chat channel which can be found by clicking on the chat icon in the header bar (desktop) or footer bar (mobile)',
    viewCrowdsaleData: 'view crowdsale data',
    viewNotes: 'view notes',
}, true)[1]
const BLOCKCHAINS = {
    BTC: 'Bitcoin',
    DOT: 'Polkadot',
    ETH: 'Ethereum',
}

export default function () {
    const [data] = useRxSubject(rxCrowdsaleData, generateTableData)
    const [isRegistered] = useRxSubject(rxIsRegistered)
    const [isLoggedIn] = useRxSubject(rxIsLoggedIn)
    const [state, setStateOrg] = useReducer(reducer, {
        ...getTableProps(),
        blockchains: [],
        data: [],
        depositAddresses: [],
        kycDone: false,
        loading: false,
        multiplierLevel: 1,
    })
    const [setState] = useState(() => (...args) => setStateOrg.mounted && setStateOrg(...args))

    useEffect(() => {
        setStateOrg.mounted = true
        isLoggedIn && !state.kycDone && setTimeout(async () => {
            setState({ loading: true })
            let newState = { message: null}
            await client.crowdsaleKYC
                .promise(true)
                .then(done => newState.kycDone = done)
                .catch(err => {
                    newState.message = {
                        content: `${err}`,
                        icon: true,
                        status: 'error',
                    }
                })
                .finally(() => setState({
                    ...newState,
                    // data: generateTableData(),
                    loading: false,
                    steps: getSteps(),
                }))
        })
            
        return () => setStateOrg.mounted = false
    }, [setState, isLoggedIn])

    if (!isRegistered) return getInlineForm(RegistrationForm, {})
    if (!isLoggedIn || state.loading) {
        const isLoading = state.loading || isLoggedIn === null
        return (
            <Message {...{
                header: isLoading
                    ? textsCap.loadingMsg
                    : textsCap.loginRequired,
                icon: true,
                status: isLoading
                    ? 'loading'
                    : 'error',
            }} />
        )
    }

    // show inline KYC form
    if (!state.kycDone) return getInlineForm(KYCForm, {
        onSubmit: kycDone => {
            if (!kycDone) return
            setState({ kycDone })
            // generateTableData(setState)
            showNotes()
        },
        style: { maxWidth: 400 },
    })
    
    return (
        <div>
            <Step.Group fluid>
                {state.steps.map((step, i) => {
                    step = {...step}
                    const { description, icon, title } = step
                    const active = state.multiplierLevel === i
                    const disabled = state.multiplierLevel < i
                    step.description = (
                        <div>
                            {description}
                            <div>
                                <h4 style={{ color: 'grey', margin: 0 }}>
                                    You contributed value equivalent to 99999 XTX
                                </h4>
                                <h3 style={{ margin: 0 }}>
                                    Your total crowdsale allocation will be 99999 XTX
                                </h3>
                                <h4 style={{ color: 'grey', margin: 0 }}>
                                    Contribution required to reach next level: 99999 XTX
                                </h4>
                            </div>
                        </div>
                    )
                    step.title = <h2 className='title' style={{ fontSize: '150%'}}>{title}</h2>
                    return (
                        <Step {...{
                            ...(active ? step : { icon }),
                            active,
                            // completed,
                            disabled,
                            key: i,
                        }} />
                    )
                })}
            </Step.Group>
            <DataTable {...{
                ...state,
                data,
            }} />
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

const getSteps = () => [
    {
        icon: 'chess pawn',
        // description: 'You have not made any deposits yet.',
        title: 'Multiplier Level 0',
    },
    {
        icon: 'chess knight',
        // description: 'Choose your shipping options',
        title: 'Multiplier Level 1 Achieved!',
    },
    {
        icon: 'chess bishop',
        // description: 'Choose your shipping options',
        title: 'Multiplier Level 2',
    },
    {
        icon: 'chess queen',
        // description: 'Choose your shipping options',
        title: 'Multiplier Level 3',
    },
    // {
    //     icon: 'truck',
    //     description: 'Choose your shipping options',
    //     title: 'Shipping',
    // },
]

const getTableProps = () => ({
    columns: [
        { key: 'blockchainName', title: textsCap.blockchain },
        {
            content: ({ address, blockchain }) => address || (
                <Button {...{
                    content: textsCap.requestBtnTxt,
                    onClick: () => showForm(DAAForm, { values: { blockchain } }),
                }} />
            ),
            key: 'address',
            textAlign: 'center',
            title: textsCap.despositAddress,
        },
        {
            key: 'amount',
            textAlign: 'center',
            title: textsCap.amountDeposited,
        },
    ],
    searchable: false,
    topLeftMenu: [
        {
            content: textsCap.viewNotes,
            icon: 'info',
            onClick: showNotes,
        },
        {
            content: textsCap.viewCrowdsaleData,
            icon: 'eye',
            onClick: () => {
                showForm(KYCViewForm)
                // const values = crowdsaleData() || {}
                // showForm(KYCForm, {
                //     inputsDisabled: Object.values(kycInputNames),
                //     submitText: null,
                //     values,
                // })
            },
        },
        {
            content: textsCap.checkDepositStatus,
            icon: 'find',
            onClick: () => alert('To be implemented')
        },
    ],
})

/**
 * @name    generateTableData
 * @summary generate a list using crowdsale data locally stored in the device
 * 
 * @param   {Object} csData crowdsale data from localStorage
 * 
 * @returns {Map}
 */
const generateTableData = (csData) => {
    csData = csData || crowdsaleData()
    let { depositAddresses = {} } = csData || {} 
    const data = Object.keys(BLOCKCHAINS)
        .map(blockchain => {
            const hasAddress = !!depositAddresses[blockchain]
            return [
                blockchain,
                {
                    address: !hasAddress
                        ? ''
                        : (
                            <div {...{
                                onClick: () => copyToClipboard(depositAddresses[blockchain]),
                                style: { cursor: 'pointer' },
                            }}>
                                {depositAddresses[blockchain]} <Icon name='copy outline' />
                            </div>
                        ),
                    blockchain,
                    blockchainName: BLOCKCHAINS[blockchain],
                    amount: undefined,
                },
            ]
        })
    return new Map(data)
}

const showNotes = () => confirm({
    confirmButton: null,
    content: (
        <div>
            {textsCap.successMsg}
            <div>{textsCap.successNote0}</div>
            <ul> 
                <li>{textsCap.successNote1}</li>
                <li>{textsCap.successNote2}</li>
                <li>{textsCap.successNote3}</li>
                <li>{textsCap.successNote4}</li>
                <li>{textsCap.successNote5}</li>
                <li>{textsCap.successNote6}</li>
                <li>{textsCap.successNote7}</li>
                <li>{textsCap.successNote8}</li>
                <li>{textsCap.successNote9}</li>
            </ul>
            {textsCap.successEndingMsg}
        </div>
    )
})