import React from 'react'
import { Button } from 'semantic-ui-react'
import DataTable from '../../components/DataTable'
import LabelCopy from '../../components/LabelCopy'
import { translated } from '../../services/language'
import { showForm } from '../../services/modal'
import { addToQueue, QUEUE_TYPES } from '../../services/queue'
import { useRxSubject } from '../../services/react'
import { setToast } from '../../services/toast'
import CalculatorForm from './CalculatorForm'
import { BLOCKCHAINS, crowdsaleData, rxCrowdsaleData } from './crowdsale'
import DAAForm from './DAAForm'
import { showFaqs } from './FAQ'
// import KYCViewForm from './KYCViewForm'

const CACHE_DURATION_MS = 1000 * 60 * 30 // 30 minutes
const textsCap = translated({
    amountDeposited: 'amount deposited',
    blockchain: 'blockchain',
    blockchainExplorer: 'view in explorer',
    calculator: 'calculator',
    despositAddress: 'pay to address',
    faqs: 'FAQs',
    requestBtnTxt: 'request address',
    updateBalances: 'update balances',
    // viewCrowdsaleData: 'view crowdsale data',
    waitB4Check: 'please try again after',
    whitelistAddress: 'whitelist address',
}, true)[1]
const explorerUrls = {
    BTC: 'https://explorer.bitcoin.com/btc/search',
    DOT: 'https://polkascan.io/polkadot/account',
    ETH: 'https://etherscan.io/address',
}
// list of deposit addresses and balances using rxCrowdsaleData
export default function AddressList(props) {
    const [state] = useRxSubject(rxCrowdsaleData, csData => {
        const { depositAddresses: addresses = {}, deposits = {} } = csData || {}
        const data = Object.keys(BLOCKCHAINS)
            .map(chain => {
                const address = addresses[chain]
                const _address = address
                    ? (
                        <span>
                            <LabelCopy
                                maxLength={null}
                                value={address}
                            />
                            <Button {...{
                                as: 'a',
                                href: `${explorerUrls[chain]}/${address}`,
                                icon: 'world',
                                size: 'mini',
                                target: '_blank',
                                title: textsCap.blockchainExplorer,
                            }} />
                        </span>
                    ) : (
                        <Button {...{
                            content: chain === 'ETH'
                                ? textsCap.whitelistAddress
                                : textsCap.requestBtnTxt,
                            onClick: () => showForm(DAAForm, { values: { blockchain: chain } }),
                        }} />
                    )
                return [
                    chain,
                    {
                        address,
                        amount: address && `${deposits[chain] || 0.00} ${chain}`,
                        blockchain: chain,
                        _address,
                        _blockchain: BLOCKCHAINS[chain],
                    },
                ]
            })
        return {
            ...getTableProps(deposits),
            data: new Map(data),
        }
    })

    return <DataTable {...{...props, ...state }} />
}

const getTableProps = deposits => ({
    columns: [
        { key: '_blockchain', title: textsCap.blockchain },
        {
            key: 'amount',
            textAlign: 'center',
            title: textsCap.amountDeposited,
        },
        {
            key: '_address',
            style: { whiteSpace: 'nowrap' },
            textAlign: 'center',
            title: textsCap.despositAddress,
        },
    ],
    searchable: false,
    tableProps: {
        basic: 'very',
        celled: false,
        compact: true,
        unstackable: true,
    },
    topLeftMenu: [
        {
            content: textsCap.faqs,
            icon: 'info',
            onClick: () => showFaqs(),
        },
        // {
        //     content: textsCap.viewCrowdsaleData,
        //     icon: 'eye',
        //     onClick: () => showForm(KYCViewForm),
        // },
        {
            content: textsCap.updateBalances,
            icon: 'find',
            onClick: () => {
                const { lastChecked } = rxCrowdsaleData.value || {}
                const diffMS = (new Date() - new Date(lastChecked))
                const toastId = 'crowdsale-updateBalances' // prevent multiple toasts
                // tell user to wait x amount of minutes if previous check was in less than 30 minutes
                if (!!lastChecked && diffMS < CACHE_DURATION_MS) return setToast({
                    content: `${textsCap.waitB4Check} ${Math.floor((CACHE_DURATION_MS - diffMS)/60000)} minutes`,
                    status: 'warning',
                }, 3000, toastId)

                addToQueue({
                    args: [false],
                    func: 'crowdsaleCheckDeposits',  
                    title: textsCap.updateBalances,
                    type: QUEUE_TYPES.CHATCLIENT,
                    then: (ok, result) => ok && crowdsaleData({
                        ...rxCrowdsaleData.value,
                        ...result,
                    }),
                }, undefined, toastId)
            }
        },
        {
            hidden: !deposits,
            content: textsCap.calculator,
            icon: 'calculator',
            onClick: () => showForm(CalculatorForm, { deposits }),
        },
    ],
})