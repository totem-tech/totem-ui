import React from 'react'
import PropTypes from 'prop-types'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import FormBuilder from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { iUseReducer } from '../../services/react'
import { BLOCKCHAINS, calculateAllocation, calculateToNextLevel } from './crowdsale'
import { className } from '../../utils/utils'

const textsCap = translated({
    allocatedXTXLabel: 'amount already allocated',
    allocatedXTXLabelDetails: 'this is the amount that you have been allocated for all amounts across all supported Blockchains that you have already deposited and has been processed by our system',
    amountLabel: 'amount to deposit',
    amountPlaceholder: 'enter amount',
    blockchainLabel: 'currency',
    formHeader: 'crowdsale allocation calculator',
    formSubheader: 'this calculator is to help you get an estimation on the amount of allocation in Totem native currency, XTX, you will receive.',

}, true)[1]
const inputNames = {
    // sum previously allocated amount in XTX
    allocatedXTX: 'allocatedXTX',
    // expected deposit amount
    amount: 'amount',
    // exptected deposit Blockchain
    blochchain: 'blochchain',
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
    const [state, setState] = iUseReducer(null, rxSetState => ({
        inputs: getInputs(
            rxSetState,
            (props || {}).depositAmounts
        ),
    }))

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
    const handleAmountChange = (_, values) => {
        const amount = values[inputNames.amount] || 0
        const blockchain = values[inputNames.blochchain]
        if (!blockchain) return

        const amounts = { ...depositAmounts }
        amounts[blockchain] = (amounts[blockchain] || 0) + amount
        const [
            amtDepositedXTX,
            amtMultipliedXTX,
            level,
            multiplier,
        ] = calculateAllocation(amounts)
        const result = calculateToNextLevel(blockchain, amtDepositedXTX, level)

        const [
            amtXTXToNextEntry,
            amtToNextEntry,
            nextLevel,
            nextMultiplier,
        ] = result || []
        const isValidLevel = level > 0
        const amountNext = ((amount + amtToNextEntry) * 1.0001)
            .toFixed(8)
        const textsCap = {
            msgContributed: 'your contributed value will be equivalent to',
            msgCrowdsaleAllocation: 'your total crowdsale allocation will be',
            msgToReachLevel: 'to reach multiplier level',
            msgUseAmount: 'use amount greater or equal to',
            msgYourMultiplier: 'your multiplier will be',
            msgYourMultiplierLevel: 'your multiplier level will be',
        }
        const content = (
            <div>
                <h4 className='no-margin'>Allocation estimation:</h4>
                {isValidLevel && (
                    <div>
                        {textsCap.msgContributed}
                        <div><b> {amtDepositedXTX}</b> XTX</div>
                    </div>
                )}
                <h3 className={className([
                    'no-margin',
                    'ui',
                    'header',
                    isValidLevel ? 'green' : 'red'
                ])}>
                    {textsCap.msgCrowdsaleAllocation} <b>{amtMultipliedXTX}</b> XTX
                </h3>
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
                            <div className='clickable' onClick={() => rxAmount.next(amountNext)}>
                                <b> {amountNext} </b>{blockchain}
                                <Icon {...{ name: 'arrow circle up', link: true }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
        rxSetState.next({message: { content }})
    }
    const inputs = [
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
            rxValue: new BehaviorSubject(0),
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
                    onChange: handleAmountChange,
                    placeholder: textsCap.amountPlaceholder,
                    rxValue: rxAmount,
                    required: true,
                    type: 'number',
                    width: 9,
                },
                {
                    className: 'selection fluid',
                    label: textsCap.blockchainLabel,
                    name: inputNames.blochchain,
                    onChange: handleAmountChange,
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

    return inputs
}