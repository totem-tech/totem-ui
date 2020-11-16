import React, { useEffect } from 'react'
import { Button, Icon, Step } from 'semantic-ui-react'
import DataTable from '../../components/DataTable'
import Text from '../../components/Text'
import Message from '../../components/Message'
import { translated } from '../../services/language'
import { confirm, showForm } from '../../services/modal'
import { iUseReducer, reducer, useRxSubject } from '../../services/react'
import { MOBILE, rxLayout } from '../../services/window'
import { copyToClipboard } from '../../utils/utils'
import client, { rxIsLoggedIn, rxIsRegistered } from '../chat/ChatClient'
import RegistrationForm from '../chat/RegistrationForm'
import {
    BLOCKCHAINS,
    calculateAllocation,
    calculateToNextLevel,
    crowdsaleData,
    ENTRY_NEGOTIATE_XTX,
    getDeposits,
    rxCrowdsaleData,
} from './crowdsale'
import DAAForm from './DAAForm'
import KYCForm from './KYCForm'
import KYCViewForm from './KYCViewForm'
import CalculatorForm from './CalculatorForm'
import { Currency } from '../../components/Currency'
import { currencyDefault } from '../../services/currency'

const textsCap = translated({
    achieved: 'achieved!',
    amountDeposited: 'amount deposited',
    blockchain: 'blockchain',
    calculator: 'calculator',
    checkDepositStatus: 'check deposit status',
    despositAddress: 'pay to address',
    level: 'level',
    loadingMsg: 'loading',
    loginRequired: 'you must be logged in and online to access this section',
    multiplierLevel: 'multiplier level',
    multiplierHighest: 'highest multiplier level',
    registrationRequired: 'please complete the getting started steps',
    requestBtnTxt: 'request address',
    stepMsgContributed: 'you contributed value equivalent to',
    stepMsgAllocation: 'your total crowdsale allocation will be',
    stepMsgLevel: 'Yeey! You have reached the last level. Contact us for a special bonus if you would like to invest more than',
    stepMsgToNextLevel: 'contribution required to reach next level',
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

export default function () {
    const [data] = useRxSubject(rxCrowdsaleData, generateTableData)
    const [isRegistered] = useRxSubject(rxIsRegistered)
    const [isLoggedIn] = useRxSubject(rxIsLoggedIn)
    const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
    const [state, setState] = iUseReducer(reducer, {
        ...getTableProps(),
        // blockchains: [],
        // depositAddresses: [],
        kycDone: false,
        loading: true,
        steps: [],
    })

    useEffect(() => {
        if (!isLoggedIn || state.kycDone) return
        
        setTimeout(async () => {
            let newState = { message: null }
            try {
                // check if KYC done
                newState.kycDone = await client.crowdsaleKYC.promise(true)
                newState.deposits = await getDeposits()
                // retrieve any existing amounts deposited
                newState.steps = await getSteps(
                    newState.deposits,
                    isMobile,
                )
            } catch (err) {
                newState.message = {
                    content: `${err}`,
                    icon: true,
                    status: 'error',
                }
            }
            setState({ ...newState, loading: false })
        })
        
    }, [isLoggedIn])

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
            showNotes()
        },
        style: { maxWidth: 400 },
    })
    
    return (
        <div>
            <Step.Group fluid stackable='tablet' items={state.steps}/>
            <DataTable {...{ ...state, data }} />
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

const getSteps = async (deposits = {}, isMobile = false) => {
    const lastLevel = 8
    const maxLevels = 3
    const [
        amtDepositedXTX = 0,
        amtMultipliedXTX = 0,
        currentLevel = 0,
        multiplier,
    ] = await calculateAllocation(deposits)
    const [amtXTXToNextLevel] = await calculateToNextLevel('XTX', amtDepositedXTX)
    let showIndicator = false
    let startLevel = currentLevel + maxLevels - 1 > lastLevel
        ? lastLevel - maxLevels + 1
        : currentLevel

    const indexes = new Array(maxLevels)
        .fill(0)
        .map((_, i) => i + startLevel)

    if (!indexes.includes(lastLevel)) {
        showIndicator = true
        indexes[indexes.length - 1] = lastLevel
    }

    return indexes.map(level => {
        const isCurrent = level === currentLevel
        const isLast = currentLevel === lastLevel && level === lastLevel
        const isLevel0 = level === 0

        return {
            active: level === currentLevel,
            disabled: !isCurrent,
            level,
            key: level,
            title: isCurrent && (
                <h1>
                    {isLast
                        ? textsCap.multiplierHighest
                        : `${textsCap.multiplierLevel} ${level}`
                    }
                    {level > 0 && ' ' + textsCap.achieved}
                </h1>
            ),
            description: (
                <div>
                    {!isCurrent && (
                        <h1 style={styles.stepIndex}>
                            {textsCap.level} {level}
                        </h1>
                    )}
                    {isCurrent && (
                        <div>
                            {!isLevel0 && (
                                <h4 style={styles.stepHeader4}>
                                    <Currency {...{
                                        prefix: `${textsCap.stepMsgContributed} `,
                                        value: amtDepositedXTX,
                                    }} />
                                </h4>
                            )}
                            {!isLevel0 && (
                                <Text {...{
                                    El: 'h3',
                                    style: styles.stepHeader3,
                                }}>
                                    <Currency {...{
                                        prefix: `${textsCap.stepMsgAllocation} `,
                                        value: amtMultipliedXTX,
                                    }} />
                                </Text>
                            )}
                            <h4 style={styles.stepHeader4}>
                                {isLast && (
                                    <Currency {...{
                                        prefix: `${textsCap.stepMsgLevel} `,
                                        value: ENTRY_NEGOTIATE_XTX,
                                    }} />
                                )}
                                {/* {isLast && `${textsCap.stepMsgLevel} ${ENTRY_NEGOTIATE_XTX} XTX!`} */}
                                <Currency {...{
                                    prefix: `${isLast ? textsCap.stepMsgLevel : textsCap.stepMsgToNextLevel}: `,
                                    unit: currencyDefault,
                                    value: isLast ? ENTRY_NEGOTIATE_XTX : amtXTXToNextLevel,
                                }} />
                            </h4>
                        </div>
                    )}
                    {showIndicator && level === lastLevel && (
                        <div style={{
                            ...styles.lastLevelIndicator,
                            // create styles.css
                            ...(isMobile ? styles.lastLevelIndicatorMobile : {})
                        }}>~</div>
                    )}
                </div>
            ),
        }
    })
}

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
            onClick: () => showForm(KYCViewForm),
        },
        {
            content: textsCap.checkDepositStatus,
            icon: 'find',
            onClick: () => alert('To be implemented')
        },
        {
            content: textsCap.calculator,
            icon: 'calculator',
            onClick: () => showForm(CalculatorForm)
        }
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
                    address: hasAddress && (
                        <div {...{
                            onClick: () => copyToClipboard(depositAddresses[blockchain]),
                            style: { cursor: 'pointer' },
                        }}>
                            {depositAddresses[blockchain]} <Icon name='copy outline' />
                        </div>
                    ) || '',
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

const styles = {
    lastLevelIndicator: {
        position: 'absolute',
        left: -9,
        top: '43%',
        zIndex: 9999,
        fontSize: '200%',
    },
    lastLevelIndicatorMobile: {
        left: '48%',
        top: -9,
        transform: 'rotate(-90deg)',
    },
    stepHeader3: { margin: 0 },
    stepHeader4: { color: 'grey', margin: 0 },
    stepIndex: {
        fontSize: '300%',
        margin: 0,
    },
    stepTitle: {
        fontSize: '150%',
        textTransform: 'capitalize',
    },
}