import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Dropdown, Icon } from 'semantic-ui-react'
import { deferred } from '../../utils/utils'
import FormBuilder, { findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { iUseReducer } from '../../services/react'
import { convertTo, getCurrencies, rxSelected } from './currency'

const textsCap = translated({
    amount: 'amount',
    select: 'select',
}, true)[1]
const inputNames = {
    amountFrom: 'amountFrom',
    amountTo: 'amountTo',
    from: 'from',
    to: 'to',
    group: 'group',
}

const Converter = props => {
    const [state] = iUseReducer(null, rxSetState => {
        const currenciesPromise = getCurrencies()
        const rxFrom = new BehaviorSubject(rxSelected.value)
        const rxFromAmount = new BehaviorSubject(1)
        const rxTo = new BehaviorSubject('USD')
        const rxToAmount = new BehaviorSubject()
        const updateToAmount = deferred(async () => {
            // not enough data for conversion
            if (!rxFromAmount.value || !rxTo.value || !rxFrom.value) return

            const newAmount = await convertTo(
                rxFromAmount.value,
                rxFrom.value,
                rxTo.value,
            )
            rxToAmount.next(`${newAmount[1]}`)
        }, 100)
        const state = {
            submitText: null,
            inputs: [
                {
                    inline: true,
                    name: 'group',
                    type: 'group',
                    inputs: [
                        {
                            labelPosition: 'right',
                            name: inputNames.from,
                            onChange: updateToAmount,
                            placeholder: textsCap.amount,
                            rxValue: rxFromAmount,
                            type: 'number',
                        },
                        {
                            content: (
                                <Icon {...{
                                    className: 'no-margin clickable',
                                    name: 'exchange',
                                    onClick: () => {
                                        const from = rxFrom.value
                                        const fromAmount = rxFromAmount
                                        rxFrom.next(rxTo.value)
                                        rxTo.next(from)
                                        rxFromAmount.next(rxToAmount.value)
                                        setDropdowns()
                                        console.log(rxFrom.value, rxTo.value)
                                        updateToAmount()
                                    },
                                    size: 'big',
                                    style: { paddingTop: 5 },
                                }} />
                            ),
                            name: 'exchangeIcon',
                            type: 'html',
                        },
                        {
                            labelPosition: 'right',
                            name: inputNames.to,
                            placeholder: textsCap.amount,
                            readOnly: true,
                            rxValue: rxToAmount,
                            type: 'text',
                        },
                    ],
                },
            ]
        }

        const setDropdowns = () => {
            currenciesPromise.then(currencies => {
                const options = currencies.map(({ ISO }) => ({ text: ISO, value: ISO }))
                const style = { minWidth: 95, paddingRight: 0 }
                
                                        console.log('set', rxFrom.value, rxTo.value)
                const getDD = (from = true) => {
                    const rx = from ? rxFrom : rxTo
                    return (
                        <Dropdown {...{
                            defaultValue: rx.value,
                            icon: (
                                <Icon {...{
                                    name: 'dropdown',
                                    style: {
                                        marginRight: 0,
                                        marginLeft: 0,
                                    }
                                }} />
                            ),
                            key: rx.value,
                            onChange: (_, { value }) => {
                                rx.next(value)
                                updateToAmount()
                            },
                            lazyLoad: true,
                            openOnFocus: true,
                            options,
                            placeholder: textsCap.select,
                            selection: true,
                            search: true,
                            style,
                        }} />
                    )
                }
                findInput(state.inputs, inputNames.from).inlineLabel = getDD(true)
                findInput(state.inputs, inputNames.to).inlineLabel = getDD(false)
                rxSetState.next({...state})
            })
        }
        setDropdowns()
        return state
    })
    

    return <FormBuilder {...{ ...props, ...state }} />
}

export default Converter