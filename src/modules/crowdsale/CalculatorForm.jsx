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
    depositedLabel: 'amount deposited',
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
        const inputs = getInputs( rxSetState, deposits)
        const selectedCurrency = rxSelected.value
        const allocatedIn = findInput(inputs, inputNames.allocated)
        const depositedIn = findInput(inputs, inputNames.deposited)
        depositedIn.action.content = selectedCurrency
        allocatedIn.action.content = selectedCurrency
        allocatedIn.loading = true
        depositedIn.loading = true
                        
        setTimeout(async () => {
            // calculate total allocatted amount in XTX
            let [depositedXTX, allocatedXTX] = await calculateAllocation(deposits)
            console.log({deposited: depositedXTX, allocated: allocatedXTX})
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
// CalculatorForm.propTypes = {
//     deposits: PropTypes.shape(
//         // only accept supported blockchains
//         Object.keys(BLOCKCHAINS)
//             .reduce((obj, key) => {
//                 obj[key] = PropTypes.number
//                 return obj
//             }, {})
//     )
// }
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
    const rxAmount = new BehaviorSubject()
    const onChange = handleAmountChange(rxAmount, rxSetState, deposits)
    return [
        {
            name: 'group-allocated-deposited',
            type: 'group',
            unstackable: true,
            widths: 8,
            inputs: [
                {
                    action: {
                        content: 'XTX',
                        onClick: e => e.preventDefault(),
                        style: { padding: '0 10px' },
                    },
                    icon: 'exchange',
                    iconPosition: 'left',
                    label: textsCap.depositedLabel,
                    name: inputNames.deposited,
                    readOnly: true,
                    rxValue: new BehaviorSubject(0),
                    type: 'number',
                },
                {
                    action: {
                        content: 'XTX',
                        onClick: e => e.preventDefault(),
                        style: { padding: '0 10px' },
                    },
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
            name: 'group',
            type: 'group',
            unstackable: true,
            widths: 8,
            inputs: [
                {
                    decimals: 8,
                    label: textsCap.amountLabel,
                    name: inputNames.amount,
                    onChange,
                    placeholder: textsCap.amountPlaceholder,
                    rxValue: rxAmount,
                    required: true,
                    type: 'number',
                },
                {
                    className: 'selection fluid',
                    label: textsCap.currencyLabel,
                    name: inputNames.currency,
                    onChange,
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
    ]
}

const handleAmountChange = (rxAmount, rxSetState, deposits) => async (_, values) => {
    const amount = values[inputNames.amount]
    const currency = values[inputNames.currency]
    if (!currency || !isValidNumber(amount)) return rxSetState.next({ message: null })

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
            <h4 className='no-margin'>
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
            {isValidLevel && <div>{textsCap.msgYourMultiplier} <b>x{multiplier}</b></div>}
            {nextMultiplier && (
                <div>
                    <br />
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