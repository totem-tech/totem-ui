import React from 'react'
import { BehaviorSubject } from 'rxjs'
import { Icon } from 'semantic-ui-react'
import FormBuilder, { fillValues, findInput } from '../../components/FormBuilder'
import { convertTo, rxSelected } from './currency'
import { translated } from '../../utils/languageHelper'
import { iUseReducer } from '../../utils/reactjs'
import { deferred } from '../../utils/utils'
import { MOBILE, rxLayout } from '../../utils/window'
import CurrencyDropDown from './CurrencyDropdown'

const textsCap = translated({
    amount: 'amount',
    header: 'currency converter',
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
        window.rxFrom = rxFrom

        const state = {
            submitText: null,
            inputs: [
                {
                    inline: true,
                    name: 'group',
                    type: 'group',
                    inputs: [
                        {
                            input: <input style={{ minWidth: 120 }} />,
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
                                            const from = rxFrom.value || ''
                                            const to = rxTo.value || ''
                                            rxTo.next(from)
                                            rxFrom.next(to)
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
                            input: <input style={{ minWidth: 120 }} />,
                            labelPosition: 'right',
                            name: inputNames.to,
                            placeholder: textsCap.amount,
                            readOnly: true,
                            rxValue: rxToAmount,
                            style: !isMobile ? null : { marginBottom: 10 },
                            type: 'text',
                        },
                    ],
                },
            ]
        }
        // pre-fill values if supplied in the props
        fillValues(state.inputs, props.values)


        const fromIn = findInput(state.inputs, inputNames.from)
        const toIn = findInput(state.inputs, inputNames.to)
        fromIn.inlineLabel = (
            <CurrencyDropDown {...{
                autoHideName: true,
                onChange: updateToAmount,
                rxValue: rxFrom,
                secondary: true,
            }} />
        )
        toIn.inlineLabel = (
            <CurrencyDropDown {...{
                autoHideName: true,
                onChange: updateToAmount,
                rxValue: rxTo,
                secondary: true,
            }} />
        )
        return state
    })


    return <FormBuilder {...{ ...props, ...state }} />
}
Converter.defaultProps = {
    closeText: null,
    header: textsCap.header,
}
export default React.memo(Converter)