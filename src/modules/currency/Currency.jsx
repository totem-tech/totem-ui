import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { isValidNumber, isFn, isDefined } from '../../utils/utils'
import { unsubscribe, useRxSubject } from '../../services/react'
import { convertTo, currencyDefault, rxSelected } from './currency'

function Currency(props) {
    let {
        className,
        date,
        decimalPlaces,
        EL,
        emptyMessage,
        onChange,
        onClick,
        prefix,
        style,
        suffix,
        title,
        unit,
        unitROE,
        unitDisplayed,
        unitDisplayedROE,
        value,
    } = props
    const [selected] = !unit && !unitDisplayed
        ? []
        : useRxSubject(rxSelected)
    unit = unit || selected
    unitDisplayed = unitDisplayed || selected
    const isSame = unit === unitDisplayed
    let [valueConverted, setValueConverted] = useState(isSame ? value : undefined)
    let [error, setError] = useState()
    const [ticker, setTicker] = useState()
    const valuesToWatch = [
        date,
        unit,
        unitROE,
        unitDisplayed,
        unitDisplayedROE,
        value,
    ]

    useEffect(() => {
        if (!isValidNumber(value)) return () => { }
        let mounted = true
        const subscriptions = {}
        const convert = async (value) => {
            if (!mounted) return
            try {
                const [_, rounded, _2, _3, to] = await convertTo(
                    value || 0,
                    unit,
                    unitDisplayed,
                    decimalPlaces,
                    date || [unitROE, unitDisplayedROE]
                )
                error = null
                valueConverted = rounded
                mounted && setTicker([to.ticker])
            } catch (err) {
                error = err
                valueConverted = 0
            }

            if (!mounted) return
            setError(error)
            setValueConverted(valueConverted)
            isFn(onChange) && onChange(valueConverted, error)
        }

        // convert and display value supplied
        convert(value)

        return () => {
            mounted = false
            unsubscribe(subscriptions)
        }
    }, valuesToWatch)

    const content = !isDefined(valueConverted)
        ? (emptyMessage || '')
        : (
            <span>
                {prefix || ''}
                <span style={{ whiteSpace: 'nowrap' }}>
                    {valueConverted} {ticker}
                </span>
                {suffix || ''}
            </span>
        )
    return (
        <EL {...{
            className,
            onClick,
            style: {
                color: error
                    ? 'red'
                    : undefined,
                ...style
            },
            title: error
                ? `${error}`
                : title || title === null || !isDefined(value) || isSame
                    ? title
                    : `${value || 0} ${unit}`,
        }}>
            {content}
        </EL>
    )
}
Currency.propTypes = {
    className: PropTypes.string,
    decimalPlaces: PropTypes.number,
    // Valid format: YYYY-MM-DD
    date: PropTypes.string,
    // @EL (optional) HTML element to use. Default: 'span'
    EL: PropTypes.string,
    emptyMessage: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.element,
    ]),
    // @onChange is invoked whenever the account balance/value changes. 
    onChange: PropTypes.func,
    onClick: PropTypes.func,
    prefix: PropTypes.any,
    style: PropTypes.object,
    suffix: PropTypes.any,
    title: PropTypes.any,
    // (optional) specify the price (ratio of exchange) of the source currency
    // if not defined, will use latest price for the currency
    unit: PropTypes.string,
    unitROE: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
    // Display currency. Default: selected currency from currency service
    unitDisplayed: PropTypes.string,
    // (optional) specify the price (ratio of exchange) of the display currency
    // if not defined, will use latest price for the currency
    unitDisplayedROE: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
    value: PropTypes.number,
}
Currency.defaultProps = {
    EL: 'span',
    unit: currencyDefault, // TOTEM
}
export default React.memo(Currency)