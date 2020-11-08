import React, { useEffect, useReducer, useState } from 'react'
import { Button } from 'semantic-ui-react'
import DataTable from '../../components/DataTable'
import { Message } from '../../components/Message'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { reducer, useRxSubject } from '../../services/react'
// import storage from '../../services/storage'
import PromisE from '../../utils/PromisE'
import client, { getUser, rxIsLoggedIn } from '../chat/ChatClient'
import RegistrationForm from '../chat/RegistrationForm'
import DAAForm from './DAAForm'
import KYCForm from './KYCForm'

const textsCap = translated({
    amountDeposited: 'amount deposited',
    blockchain: 'blockchain',
    despositAddress: 'deposit address',
    loadingMsg: 'loading',
    loginRequired: 'you must be registered and online to access this section',
    requestBtnTxt: 'request address',
    successHeader: 'KYC data submitted',
    successContent: 'you can now select your desired blockchain and request your personal deposit address',
    yourAddresses: 'your deposit addresses',
    youWillReceive: 'You will receive:',
}, true)[1]
// const MODULE_KEY = 'crowdsale'
// const rw = value => storage.settings.module(MODULE_KEY, value) //rw().kycDone || 
const BLOCKCHAINS = {
    BTC: 'Bitcoin',
    DOT: 'Polkadot',
    ETH: 'Ethereum',
}

export default function () {
    const [isLoggedIn] = useRxSubject(rxIsLoggedIn)
    const [state, setStateOrg] = useReducer(reducer, {
        data: [],
        depositAddresses: {},
        kycDone: false,
        loading: true,
    })
    const [setState] = useState(() => (...args) => setStateOrg.mounted && setStateOrg(...args))

    useEffect(() => {
        setStateOrg.mounted = true
        client.crowdsaleKYC
            .promise(true)
            .then(kycDone => {
                setState({
                    kycDone,
                    loading: false,
                    message: null,
                })
                kycDone && fetchDepositAddresses( state, setState )
            },
            err => setState({
                loading: false,
                message: {
                    content: `${err}`,
                    icon: true,
                    status: 'error',
                },
            }))
            
        return () => setStateOrg.mounted = false
    }, [setStateOrg])

    if (!isLoggedIn || state.loading) {
        const isLoading = state.loading || isLoggedIn === null
        return (
            <Message {...{
                header: isLoading
                    ? textsCap.loadingMsg
                    : textsCap.loginRequired,
                icon: true,
                status: isLoading
                    ? 'loading'
                    : 'error',
            }} />
        )
    }

    // show inline KYC form
    if (!state.kycDone) return (
        <div>
            <h3>{KYCForm.defaultProps.header}</h3>
            <h4>{KYCForm.defaultProps.subheader}</h4>
            <KYCForm {...{
                onSubmit: kycDone => {
                    if (!kycDone) return
                    setState({ kycDone })
                    const message = {
                        content: textsCap.successContent,
                        header: textsCap.successHeader,
                        icon: true,
                        status: 'success',
                    }
                    showDAAForm(state, setState, { message })
                },
                style: { maxWidth: 400 },
            }} />
        </div>
    )
                           
    return (
        <div>
            <h2>{textsCap.youWillReceive} 9999999 XTX</h2>
            <h4>{textsCap.yourAddresses}</h4>
            <DataTable {...{
                columns: tableColumns.map(column => {
                    if (column.key !== 'address') return column
                    column.content = ({ address, ticker }) => address || (
                        <Button {...{
                            content: textsCap.requestBtnTxt,
                            onClick: () => showDAAForm(
                                state,
                                setState,
                                { values: { blockchain: ticker } },
                            ),
                        }} />
                    )
                    return column
                }),
                data: state.data,
                searchable: false,
             }} />
        </div>
    )
}

const tableColumns = [
    { key: 'blockchain', title: textsCap.blockchain },
    {
        key: 'address',
        textAlign: 'center',
        title: textsCap.despositAddress,
    },
    {
        key: 'amount',
        textAlign: 'center',
        title: textsCap.amountDeposited,
    },
]

const fetchDepositAddresses = async (state, setState) => {
    let { depositAddresses = {} } = state
    const tickers = Object.keys(BLOCKCHAINS)
        .filter(ticker => !depositAddresses[ticker])
    const promise = PromisE.timeout(
        PromisE.all(
            tickers.map(chain =>
                client.crowdsaleDAA.promise(chain, '0x0')
            )
        ),
        5000,
    )
    try {
        setState({ loading: true, message: null })
        const results = await promise
        depositAddresses = tickers.reduce((obj, ticker, i) => {
            if (!results[i]) return obj
            obj[ticker] = results[i]
            return obj
        }, depositAddresses)
        const data = Object.keys(BLOCKCHAINS)
            .map(ticker => ({
                address: state.depositAddresses[ticker],
                blockchain: BLOCKCHAINS[ticker],
                ticker,
            }))
        setState({
            loading: false,
            data,
            depositAddresses,
        })
    } catch (err) {
        setState({
            loading: false,
            message: {
                header: `${err}`,
                content: err instanceof Error ? err.stack : ''
            },
        })
    }
}

const showDAAForm = (state, setState, formProps) => {
    // open deposit address allocation form
    showForm(DAAForm, {
        ...formProps,
        // on success load deposit addresses
        onSubmit: success => success && fetchDepositAddresses(
            state,
            setState,
        ),
    })
}