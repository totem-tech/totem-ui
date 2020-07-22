import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { isValidNumber, isFn } from '../utils/utils'
import { ss58Decode } from '../utils/convert'
import { round } from '../utils/number'
import { bond, convertTo, currencyDefault, getSelected } from '../services/currency'
import { getConnection } from '../services/blockchain'

function Currency(props) {
    const {
        address,
        className,
        decimalPlaces,
        EL,
        emptyMessage = '',
        onChange,
        prefix,
        style,
        suffix,
        unit,
        unitDisplayed: pUnitD,
        value: pVal,
    } = props
    const [unitDisplayed, setUnitDisplayed] = useState(pUnitD || getSelected())
    let [valueConverted, setValueConverted] = useState()
    let [error, setError] = useState()

    useEffect(() => {
        let mounted = true
        let unsubscribe = null
        let tieId = null
        const convertValue = async (value) => {
            value = parseInt(value)
            try {
                valueConverted = round(
                    !value ? 0 : await convertTo(value, unit, unitDisplayed),
                    decimalPlaces,
                )
                error = null
            } catch (err) {
                console.log('Currency conversion failed: ', { err })
                error = err
                valueConverted = null
            }
            setError(error)
            setValueConverted(valueConverted)
            unsubscribe && isFn(onChange) && onChange(valueConverted, error)
        }
        if (!isValidNumber(pVal) && ss58Decode(address)) {
            // subscribe to address balance change
            getConnection().then(async ({ api }) =>
                unsubscribe = await api.query.balances.freeBalance(address, convertValue)
            )
        } else {
            // convert and display value supplied
            convertValue(pVal)
        }

        // subscribe to default display unit changes
        if (!pUnitD) tieId = bond.tie(unit => setUnitDisplayed(unit))

        return () => {
            mounted = false
            unsubscribe && unsubscribe()
            tieId && bond.untie(tieId)
        }
    }, [unitDisplayed])

    return valueConverted === undefined ? emptyMessage : (
        <EL {...{
            className,
            style: { color: error ? 'red' : '', ...style },
            title: `${error}`,
        }}>
            {prefix}{valueConverted} {unitDisplayed}{suffix}
        </EL>
    )
}
Currency.propTypes = {
    // @address to retrieve balance from Totem chain.
    // Only used when value is not supplied.
    address: PropTypes.string,
    className: PropTypes.string,
    decimalPlaces: PropTypes.number,
    // @EL (optional) HTML element to use. Default: 'span'
    EL: PropTypes.string,
    emptyMessage: PropTypes.string,
    // @onChange is invoked whenever the account balance/value changes. 
    onChange: PropTypes.func,
    prefix: PropTypes.any,
    style: PropTypes.object,
    suffix: PropTypes.any,
    unit: PropTypes.string,
    unitDisplayed: PropTypes.string,
    value: PropTypes.number,
}
Currency.defaultProps = {
    decimalPlaces: 2,
    EL: 'span',
    unit: currencyDefault, // XTX
}
export default React.memo(Currency)