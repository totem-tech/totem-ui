import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Dropdown, Icon } from 'semantic-ui-react'
import { deferred } from '../../utils/utils'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { translated } from '../../services/language'
import { iUseReducer } from '../../services/react'
import { convertTo, getCurrencies, rxSelected } from './currency'
import { MOBILE, rxLayout } from '../../services/window'

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

/**
 * @name    Converter
 * @summary a simple currency converter that uses the latest available prices
 * 
 * @param   {Object} props 
 * 
 * @returns {Element}
 */
const Converter = props => {
    const [state] = iUseReducer(null, rxSetState => {
        const isMobile = rxLayout.value === MOBILE
        const currenciesPromise = getCurrencies()
        const rxFrom = new BehaviorSubject(rxSelected.value)
        const rxFromAmount = new BehaviorSubject(1)
        const rxTo = new BehaviorSubject()
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
        }, 200)

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
                                <div style={!isMobile ? null : {
                                    paddingBottom: 7,
                                    textAlign: 'center',
                                    width: '100%',
                                }}>
                                    <Icon {...{
                                        className: `no-margin clickable${isMobile ? ' rotated counterclockwise' : ''}`,
                                        name: 'exchange',
                                        onClick: () => {
                                            // on exchange icon click, switch the currencies and amounts
                                            const currency = rxTo.value
                                            const amount = rxToAmount.value
                                            rxTo.next(rxFrom.value)
                                            rxFrom.next(currency)
                                            rxFromAmount.next(amount)
                                        },
                                        size: 'big',
                                        style: {
                                            paddingTop: 5,
                                            margin: 'auto'
                                        },
                                    }} />
                                </div>
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
                            style: !isMobile ? null : { marginBottom: 10},
                            type: 'text',
                        },
                    ],
                },
            ]
        }
        // pre-fill values if supplied in the props
        fillValues(state.inputs, props.values)

        const setDropdowns = () => {
            currenciesPromise.then(currencies => {
                const options = currencies.map(({ currency, type }) => ({
                    text: currency,
                    title: type,
                    value: currency,
                }))
                
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
                            style: { minWidth: 120, paddingRight: 0 },
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