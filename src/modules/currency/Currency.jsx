import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { isValidNumber, isFn, isDefined } from '../../utils/utils'
import { subjectAsPromise, unsubscribe, useRxSubject } from '../../services/react'
import { convertTo, currencyDefault, rxSelected } from './currency'

function Currency (props) {
    let {
        className,
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

    useEffect(() => {
        if (!isValidNumber(value)) return () => { }
        let mounted = true
        const subscriptions = {}
        const convert = async (value) => {
            if (!mounted) return
            try {
                const [_, rounded, _2, from, to] = await convertTo(
                    value || 0,
                    unit,
                    unitDisplayed,
                    decimalPlaces,
                    unitROE,
                    unitDisplayedROE,
                )
                error = null
                valueConverted = rounded
                setTicker([to.ticker])
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
    }, [unit, unitDisplayed, value])

    const content = !isDefined(valueConverted) ? (emptyMessage || '') : (
        <span>{prefix || ''}{valueConverted} {ticker}{suffix || ''}</span>
    )
    return (
        <EL {...{
            className,
            onClick,
            style: { color: error ? 'red' : undefined, ...style },
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
    unit: PropTypes.string,
    // Display currency. Default: selected currency from currency service
    unitDisplayed: PropTypes.string,
    value: PropTypes.number,
}
Currency.defaultProps = {
    EL: 'span',
    unit: currencyDefault, // XTX
}
export default React.memo(Currency)