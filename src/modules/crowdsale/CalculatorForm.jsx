import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { iUseReducer, useRxSubject } from '../../services/react'
import { BLOCKCHAINS, calculateAllocation, calculateToNextLevel, rxCrowdsaleData } from './crowdsale'
import { className, isValidNumber } from '../../utils/utils'
import { Currency } from '../../components/Currency'
import { convertTo, currencyDefault, rxSelected } from '../../services/currency'

const textsCap = translated({
    allocationEstimation: 'allocation estimation',
    allocatedXTXLabel: 'amount already allocated',
    allocatedXTXLabelDetails: 'this is the amount that you have been allocated for all amounts across all supported Blockchains that you have already deposited and has been processed by our system',
    amountLabel: 'amount to deposit',
    amountPlaceholder: 'enter amount',
    currencyLabel: 'currency',
    formHeader: 'crowdsale allocation calculator',
    formSubheader: 'this calculator is to help you get an estimation on the amount of allocation in Totem native currency, XTX, you will receive.',
    msgAmountUnlocked: 'amount to be unlocked soon after the crowdsale',
    msgContributed: 'your contributed value will be equivalent to',
    msgCrowdsaleAllocation: 'your total crowdsale allocation will be',
    msgToReachLevel: 'to reach multiplier level',
    msgTxFeeWarning: 'please note that transaction fee is not included in any of the amounts displayed here and does not count towards your allocation ',
    msgUseAmount: 'use amount greater or equal to',
    msgYourMultiplier: 'your multiplier will be',
    msgYourMultiplierLevel: 'your multiplier level will be',
}, true)[1]
const inputNames = {
    // sum previously allocated amount in XTX
    allocatedXTX: 'allocatedXTX',
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
 * @summary form to calculate crowdsale XTX allocation based on user's existing deposited total XTX and future deposits
 * 
 * @param   {Object} props 
 * 
 * @returns {Element}
 */
export default function CalculatorForm(props) {
    const [state] = iUseReducer(null, rxSetState => {
        const { depositAmounts = {
            BTC: 0.01,
            ETH: 1,
        } } = rxCrowdsaleData.value || {}
        const inputs = getInputs( rxSetState, depositAmounts)
        const allocatedIn = findInput(inputs, inputNames.allocatedXTX)
        const { action } = allocatedIn
        allocatedIn.action = null
        allocatedIn.loading = true
                        
        setTimeout(async () => {
            // calculate total allocatted amount in XTX
            let [allocated] = await calculateAllocation(depositAmounts)
            const currency = rxSelected.value
            // convert amount to selected currency
            const [_, amount, decimals] = await convertTo(allocated, currencyDefault, currency)
            allocatedIn.decimals = decimals
            console.log({ _, amount, decimals })
            action.content = currency
            allocatedIn.action = action
            allocatedIn.loading = false
            rxSetState.next({ inputs })
            allocatedIn.rxValue.next(amount)
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
    size: 'mini',
    subheader: textsCap.formSubheader,
    // hide submit button as it has no use
    submitText: null,
}

export const getInputs = (rxSetState, depositAmounts = {}) => {
    const rxAmount = new BehaviorSubject()
    const onChange = handleAmountChange(rxAmount, rxSetState, depositAmounts)
    return [
        {
            action: {
                content: 'XTX',
                onClick: e => e.preventDefault()
            },
            decimals: 0,
            label: textsCap.allocatedXTXLabel,
            labelDetails: textsCap.allocatedXTXLabelDetails,
            name: inputNames.allocatedXTX,
            readOnly: true,
            rxValue: new BehaviorSubject(),
            type: 'number',
        },
        {
            name: 'group',
            type: 'group',
            unstackable: true,
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
                    width: 9,
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
                    width: 7,
                },
            ],
        },
    ]
}

const handleAmountChange = (rxAmount, rxSetState, depositAmounts) => async (_, values) => {
    const amount = values[inputNames.amount]
    const currency = values[inputNames.currency]
    if (!currency || !isValidNumber(amount)) return rxSetState.next({ message: null })

    const amounts = { ...depositAmounts }
    amounts[currency] = (amounts[currency] || 0) + amount
    const [
        amtDepositedXTX,
        amtMultipliedXTX,
        level,
        multiplier,
        amtToBeUnlockedXTX,
    ] = await calculateAllocation(amounts)
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
            {nextLevel && (
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