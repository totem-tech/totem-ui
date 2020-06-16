import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { runtime } from 'oo7-substrate'
import { isBond, isDefined, isValidNumber } from '../utils/utils'
import { ss58Decode } from '../utils/convert'
import { round } from '../utils/number'
import { bond, convertTo, currencyDefault, getSelected } from '../services/currency'

export default class Currency extends Component {
    constructor(props) {
        super(props)
        this.state = {
            error: undefined,
            value: undefined,
            valueConverted: undefined,
        }
        this.originalSetState = this.setState
        this.setState = (s, cb) => this._mounted && this.originalSetState(s, cb)
    }

    componentWillMount = async () => {
        this._mounted = true
        let { address, value } = this.props
        const isNum = isValidNumber(value)
        if (!isNum && ss58Decode(address)) {
            value = runtime.balances.balance(address)
        }
        if (isBond(value)) {
            this.bond = value
            this.tieId = this.bond.tie(value => this.convert(parseInt(value)))
        }
        this.tieIdCurrency = bond.tie(() => this.convert(isNum ? value : this.state.value))
    }

    componentWillUnmount() {
        this._mounted = false
        this.bond && this.bond.untie(this.tieId)
        bond.untie(this.tieIdCurrency)
    }

    componentWillReceiveProps(props) {
        const { address, value } = props
        const { value: oldValue } = this.state
        if (value !== oldValue) this.convert(value)
        if (address && !oldValue) this.componentWillUnmount() | this.componentWillMount()
    }

    convert = async (value) => {
        let { decimalPlaces, unit, unitDisplayed } = this.props
        let { error, valueConverted } = this.state
        unit = unit || currencyDefault
        unitDisplayed = unitDisplayed || getSelected()

        // conversion not required
        if (!isValidNumber(value)) return
        if (unit === unitDisplayed) return this.setState({
            error: undefined,
            value,
            valueConverted: round(value, decimalPlaces),
        })

        try {
            valueConverted = !value ? 0 : await convertTo(value, unit, unitDisplayed)
            error = undefined
        } catch (err) {
            console.log('Currency conversion failed: ', { err })
            error = err
            valueConverted = 0
        }
        this.setState({
            error,
            value,
            valueConverted: round(valueConverted, decimalPlaces),
        })
    }

    render = () => {
        const { className, prefix, style, suffix, unitDisplayed } = this.props
        const { error, valueConverted } = this.state
        return !valueConverted ? '' : (
            <span {...{
                className,
                style: { color: error ? 'red' : '', ...style },
                title: error,
            }}>
                {prefix}{valueConverted} {unitDisplayed || getSelected()}{suffix}
            </span>
        )
    }
}
Currency.propTypes = {
    // @address to retrieve balance from Totem chain.
    // Only used when value is not supplied.
    address: PropTypes.string,
    className: PropTypes.string,
    decimalPlaces: PropTypes.number,
    style: PropTypes.object,
    unit: PropTypes.string,
    unitDisplayed: PropTypes.string,
    value: PropTypes.any, // number or bond
}
Currency.defaultProps = {
    decimalPlaces: 2
}