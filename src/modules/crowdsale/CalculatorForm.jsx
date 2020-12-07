import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { iUseReducer } from '../../services/react'
import { BLOCKCHAINS, calculateAllocation, calculateToNextLevel, rxCrowdsaleData } from './crowdsale'
import { className, isValidNumber } from '../../utils/utils'
import { Currency } from '../../components/Currency'
import { convertTo, currencyDefault, rxSelected } from '../../services/currency'

const textsCap = translated({
    allocationEstimation: 'allocation estimation',
    allocatedLabel: 'amount allocated',
    // allocatedLabelDetails: 'this is the amount that you have been allocated for all amounts across all supported Blockchains that you have already deposited and has been processed by our system',
    amountLabel: 'amount to deposit',
    amountPlaceholder: 'enter amount',
    currencyLabel: 'deposit currency',
    depositedLabel: 'amount contributed',
    estimatedAllocationLabel: 'total allocation',
    estimatedContributionLabel: 'total contribution',
    estimatedLevelLabel: 'multiplier level',
    estimatedUnlockedLabel: 'unlocked after Crowdsale',
    formHeader: 'crowdsale allocation calculator',
    formSubheader: 'this calculator is to help you get an estimation on the amount of allocation you can will receive',
    msgAmountUnlocked: 'amount to be unlocked soon after the crowdsale',
    msgContributed: 'your contributed value will be equivalent to',
    msgCrowdsaleAllocation: 'your total allocation will be equivalent to',
    msgToReachLevel: 'to reach multiplier level',
    msgTxFeeWarning: 'please note that transaction fee is not included in any of the amounts displayed and does not count towards allocation',
    msgUseAmount: 'use amount greater or equal to',
    msgYourMultiplier: 'your multiplier will be',
    msgYourMultiplierLevel: 'your multiplier level will be',
}, true)[1]
const inputNames = {
    // sum previously allocated amount in XTX
    allocated: 'allocated',
    deposited: 'deposited',
    // expected deposit amount
    amount: 'amount',
    // exptected deposit Blockchain
    currency: 'currency',
    // estimated difference after @amount is deposited using the selected @blockchain
    differenceXTX: 'differenceXTX',
    estimatedAllocation: 'estimatedAllocation',
    estimatedContribution: 'estimatedContribution',
    estimatedLevel: 'estimatedLevel',
    estimatedMultiplier: 'estimatedMultiplier',
    estimatedUnlocked: 'estimatedUnlocked',
    groupAllocatedDeposited: 'group-allocated-deposited',
    groupAmountCurrency: 'group-amount-currency',
    groupEstAllocCont: 'group-estimated-allocation-contribution',
    groupEstMultiUnlocked: 'group-estimated-multiplier-unlocked',
    // estimated total allocation
    totalXTX: 'totalXTX',
}
/**
 * @name    Calculator
 * @summary calculates crowdsale allocation based on user's existing deposited amounts 
 *          and the amount user expects to deposit in the future.
 * 
 * @param   {Object} props 
 * 
 * @returns {Element}
 */
export default function CalculatorForm(props) {
    const [state] = iUseReducer(null, rxSetState => {
        const { deposits = {} } = rxCrowdsaleData.value || {}
        const inputs = getInputs(rxSetState, deposits)
        const selectedCurrency = rxSelected.value
        const allocatedIn = findInput(inputs, inputNames.allocated)
        const depositedIn = findInput(inputs, inputNames.deposited)
        allocatedIn.loading = true
        depositedIn.loading = true
                        
        setTimeout(async () => {
            // calculate total allocatted amount in XTX
            let [depositedXTX, allocatedXTX] = await calculateAllocation(deposits)
            // convert amount to selected currency
            const [_a, allocated] = await convertTo(allocatedXTX, currencyDefault, selectedCurrency)
            const [_d, deposited] = await convertTo(depositedXTX, currencyDefault, selectedCurrency)
            allocatedIn.loading = false
            depositedIn.loading = false
            // update inputs
            rxSetState.next({ inputs })
            // trigger value change
            allocatedIn.rxValue.next(allocated)
            depositedIn.rxValue.next(deposited)
        })
        return { inputs }
    })

    return <FormBuilder {...{...props, ...state}} />
}
CalculatorForm.defaultProps = {
    closeText: null,
    closeOnDimmerClick: true,
    closeOnEscape: true,
    header: textsCap.formHeader,
    size: 'tiny',
    subheader: textsCap.formSubheader,
    // hide submit button as it has no use
    submitText: null,
}

export const getInputs = (rxSetState, deposits = {}) => {
    const actionCurrency = {
        content: rxSelected.value,
        onClick: e => e.preventDefault(),
        style: { padding: '0 10px' },
    }
    const actionExchangeIcon = {
        icon: 'exchange',
        style: { padding: '0 8px' },
    }
    const inputs = [
        {
            name: inputNames.groupAllocatedDeposited,
            type: 'group',
            unstackable: true,
            widths: 8,
            inputs: [
                {
                    action: actionCurrency,
                    icon: 'exchange',
                    iconPosition: 'left',
                    label: textsCap.depositedLabel,
                    name: inputNames.deposited,
                    readOnly: true,
                    rxValue: new BehaviorSubject(0),
                    type: 'number',
                },
                {
                    action: actionCurrency,
                    icon: 'exchange',
                    iconPosition: 'left',
                    label: textsCap.allocatedLabel,
                    // labelDetails: textsCap.allocatedLabelDetails,
                    name: inputNames.allocated,
                    readOnly: true,
                    rxValue: new BehaviorSubject(0),
                    type: 'number',
                },
            ],
        },
        {
            name: inputNames.groupAmountCurrency,
            type: 'group',
            unstackable: true,
            widths: 8,
            inputs: [
                {
                    decimals: 8,
                    label: textsCap.amountLabel,
                    min: 0,
                    name: inputNames.amount,
                    placeholder: textsCap.amountPlaceholder,
                    rxValue: new BehaviorSubject(),
                    required: true,
                    type: 'number',
                },
                {
                    className: 'selection fluid',
                    label: textsCap.currencyLabel,
                    name: inputNames.currency,
                    options: Object.keys(BLOCKCHAINS)
                        .map(value => ({ key: value, text: BLOCKCHAINS[value], value })),
                    required: true,
                    rxValue: new BehaviorSubject('BTC'),
                    search: true,
                    selection: false,
                    type: 'dropdown',
                },
            ],
        },
        {
            // hide group if amount not entered
            hidden: values => !values[inputNames.amount],
            name: inputNames.groupEstAllocCont,
            type: 'group',
            unstackable: true,
            inputs: [
                {
                    action: actionExchangeIcon,
                    actionPosition: 'left',
                    label: textsCap.estimatedContributionLabel,
                    name: inputNames.estimatedContribution,
                    readOnly: true,
                    rxValue: new BehaviorSubject(''),
                    type: 'text',
                    width: 6,
                },
                {
                    action: { ...actionExchangeIcon, icon: 'bars' },
                    inlineLabel: { icon: { className: 'no-margin', name: 'x' } },
                    input: <input style={{ padding: 0, textAlign: 'center' }} />,
                    label: <br />,
                    name: inputNames.estimatedMultiplier,
                    readOnly: true,
                    rxValue: new BehaviorSubject(''),
                    type: 'number',
                    width: 4,
                },
                {
                    action: actionExchangeIcon,
                    actionPosition: 'left',
                    label: textsCap.estimatedAllocationLabel,
                    name: inputNames.estimatedAllocation,
                    readOnly: true,
                    rxValue: new BehaviorSubject(''),
                    type: 'text',
                    width: 6,
                },
            ],
        },
        {
            // hide group if amount not entered
            hidden: values => !values[inputNames.amount],
            name: inputNames.groupEstMultiUnlocked,
            type: 'group',
            unstackable: true,
            inputs: [
                {
                    action: actionExchangeIcon,
                    actionPosition: 'left',
                    label: textsCap.estimatedUnlockedLabel,
                    name: inputNames.estimatedUnlocked,
                    readOnly: true,
                    rxValue: new BehaviorSubject(''),
                    type: 'text',
                    width: 10,
                },
                {
                    label: textsCap.estimatedLevelLabel,
                    name: inputNames.estimatedLevel,
                    readOnly: true,
                    rxValue: new BehaviorSubject(''),
                    type: 'number',
                    width: 6,
                },
            ]
        }
    ]

    const handleChange = handleAmountChange(inputs, rxSetState, deposits)
    findInput(inputs, inputNames.amount).onChange = handleChange
    findInput(inputs, inputNames.currency).onChange = handleChange
    return inputs
}

const handleAmountChange = (inputs, rxSetState, deposits) => async (_, values) => {
    const amount = values[inputNames.amount]
    const currency = values[inputNames.currency]
    if (!currency || !isValidNumber(amount)) return rxSetState.next({ message: null })
    
    const rxAmount = findInput(inputs, inputNames.amount).rxValue
    const depositAmounts = { ...deposits }
    depositAmounts[currency] = (depositAmounts[currency] || 0) + amount
    const [
        amtDepositedXTX,
        amtMultipliedXTX,
        level,
        multiplier,
        amtToBeUnlockedXTX,
    ] = await calculateAllocation(depositAmounts)
    const result = await calculateToNextLevel(currency, amtDepositedXTX, level)

    // update estimated contribution, allocation and other fields
    findInput(inputs, inputNames.estimatedContribution).rxValue.next(
        (await convertTo(
            amtDepositedXTX,
            currencyDefault,
            rxSelected.value,
        ))[1]
    )
    findInput(inputs, inputNames.estimatedAllocation).rxValue.next(
        (await convertTo(
            amtMultipliedXTX,
            currencyDefault,
            rxSelected.value,
        ))[1]
    )
    findInput(inputs, inputNames.estimatedMultiplier).rxValue.next(multiplier)
    findInput(inputs, inputNames.estimatedLevel).rxValue.next(level)
    findInput(inputs, inputNames.estimatedUnlocked).rxValue.next(
        (await convertTo(
            amtToBeUnlockedXTX,
            currencyDefault,
            rxSelected.value,
        ))[1]
    )

    const [
        amtXTXToNextEntry,
        amtToNextEntry,
        nextLevel,
        nextMultiplier,
    ] = result || []
    const isValidLevel = level > 0
    const amountNext = ((amount + amtToNextEntry) * 1.0001) // multiply to get around rounding issues
        .toFixed(8)
    console.log({amount, amtToNextEntry, amountNext})
    const content = (
        <div>
            {/* <h4 className='no-margin'>
                {textsCap.allocationEstimation}:
            </h4>
            {isValidLevel && (
                <div>
                    {textsCap.msgContributed}
                    <div>
                        <Currency {...{ EL: 'b', value: amtDepositedXTX }} />
                    </div>
                </div>
            )}
            <h3 className={className([
                'no-margin',
                'ui',
                'header',
                isValidLevel ? 'green' : 'red'
            ])}>
                <Currency {...{
                    EL: 'b',
                    prefix: `${textsCap.msgCrowdsaleAllocation} `,
                    value: amtMultipliedXTX,
                }} />
            </h3>
            {isValidLevel && (
                <Currency {...{
                    prefix: `${textsCap.msgAmountUnlocked}: `,
                    value: amtToBeUnlockedXTX,
                }} />
            )}
            {isValidLevel && <div>{textsCap.msgYourMultiplierLevel} <b>{level}</b></div>}
            {isValidLevel && <div>{textsCap.msgYourMultiplier} <b>x{multiplier}</b></div>} */}
            {nextMultiplier && (
                <div>
                    {/* <br /> */}
                    <h4 className='no-margin'>
                        {textsCap.msgToReachLevel} <b>{nextLevel}</b> (x<b>{nextMultiplier}</b>)
                    </h4>
                    <div>
                        {textsCap.msgUseAmount}
                        <div
                            className='clickable'
                            onClick={() => rxAmount.next(amountNext)}
                        >
                            <b> {amountNext} </b>{currency}
                            <Icon {...{
                                name: 'arrow circle up',
                                link: true,
                            }} />
                        </div>
                    </div>
                </div>
            )}
            <br />
            <div style={{ color: 'orange', textTransform: 'uppercase' }}>
                <b>{textsCap.msgTxFeeWarning}</b>
            </div>
        </div>
    )
    rxSetState.next({ message: { content } })
}