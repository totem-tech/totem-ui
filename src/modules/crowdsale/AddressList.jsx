// import React from 'react'
// import { Button } from 'semantic-ui-react'
// import DataTable from '../../components/DataTable'
// import { FormInput } from '../../components/FormInput'
// import LabelCopy from '../../components/LabelCopy'
// import { translated } from '../../services/language'
// import { showForm } from '../../services/modal'
// import { addToQueue, QUEUE_TYPES } from '../../services/queue'
// import { useRxSubject } from '../../services/react'
// import { setToast } from '../../services/toast'
// import { MOBILE, rxLayout } from '../../services/window'
// import CalculatorForm from './CalculatorForm'
// import { BLOCKCHAINS, crowdsaleData, rxCrowdsaleData } from './crowdsale'
// import DAAForm from './DAAForm'
// import { showFaqs } from './FAQ'
// import KYCViewForm from './KYCViewForm'

// const CACHE_DURATION_MS = 1000 * 60 * 30 // 30 minutes
// const textsCap = translated({
//     amountDeposited: 'amount deposited',
//     blockchain: 'blockchain',
//     blockchainExplorer: 'view in explorer',
//     calculatorBtnText: 'deposit award calculator',
//     despositAddress: 'pay-to address',
//     explorer: 'explorer',
//     faqs: 'FAQs',
//     requestBtnTxt: 'request address',
//     updateBalances: 'update balances',
//     viewCrowdsaleData: 'view registration data',
//     waitB4Check: 'please try again after',
//     whitelistAddress: 'whitelist address',
// }, true)[1]
// const explorerUrls = {
//     BTC: 'https://explorer.bitcoin.com/btc/search',
//     DOT: 'https://polkascan.io/polkadot/account',
//     ETH: 'https://etherscan.io/address',
// }
// // list of deposit addresses and balances using rxCrowdsaleData
// export default function AddressList(props) {
//     const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
//     const [state] = useRxSubject(rxCrowdsaleData, csData => {
//         const { depositAddresses: addresses = {}, deposits = {} } = csData || {}
//         const data = Object.keys(BLOCKCHAINS)
//             .map(chain => {
//                 const address = addresses[chain]
//                 let _action, _address
//                 if (address) {
//                     _address = (
//                         <FormInput {...{
//                             // fluid: true,
//                             inlineLabel: <LabelCopy content={null} maxLength={null} value={address} />,
//                             labelPosition: 'right',
//                             name: '_address',
//                             readOnly: true,
//                             style: {
//                                 background: 'transparent',
//                                 width: '100%',
//                             },
//                             title: null, // hides the "read only field" title
//                             type: 'text',
//                             value: address,
//                         }} />
//                     )
//                     _action = (
//                         <Button {...{
//                             as: 'a',
//                             href: `${explorerUrls[chain]}/${address}`,
//                             icon: 'world',
//                             // size: 'mini',
//                             target: '_blank',
//                             title: textsCap.blockchainExplorer,
//                         }} />
//                     )
//                 } else {
//                     _address = (
//                         <Button {...{
//                             content: chain === 'ETH'
//                                 ? textsCap.whitelistAddress
//                                 : textsCap.requestBtnTxt,
//                             onClick: () => showForm(DAAForm, { values: { blockchain: chain } }),
//                         }} />
//                     )
//                 }
//                 return [
//                     chain,
//                     {
//                         address,
//                         amount: address && `${deposits[chain] || 0.00} ${chain}`,
//                         blockchain: chain,
//                         _action,
//                         _address,
//                         _blockchain: BLOCKCHAINS[chain],
//                     },
//                 ]
//             })
//         return {
//             ...getTableProps(deposits, isMobile),
//             data: new Map(data),
//         }
//     })

//     return <DataTable {...{...props, ...state }} />
// }

// const getTableProps = (deposits, isMobile) => ({
//     columns: [
//         {
//             key: '_blockchain',
//             title: textsCap.blockchain,
//         },
//         {
//             key: '_address',
//             style: { whiteSpace: 'nowrap' },
//             // textAlign:,
//             title: textsCap.despositAddress,
//         },
//         {
//             key: 'amount',
//             textAlign: 'right',
//             title: textsCap.amountDeposited,
//         },
//         {
//             collapsing: true,
//             key: '_action',
//             textAlign: 'center',
//             title: textsCap.explorer,
//         },
//     ],
//     searchable: false,
//     // tableProps: {
//     //     basic: 'very',
//     //     celled: false,
//     //     compact: true,
//     //     sortable: false,   
//     //     unstackable: true,
//     // },
//     footerContent: (
//         <div style={{ float: !isMobile ? 'right' : 'left' }}>
//             {[
//                 {
//                     content: textsCap.viewCrowdsaleData,
//                     icon: 'eye',
//                     onClick: () => showForm(KYCViewForm),
//                 },
//                 {
//                     hidden: !deposits,
//                     content: textsCap.calculatorBtnText,
//                     icon: 'calculator',
//                     onClick: () => showForm(CalculatorForm, { deposits }),
//                 }, 
//                 {
//                     content: textsCap.updateBalances,
//                     icon: 'find',
//                     onClick: () => {
//                         const { lastChecked } = rxCrowdsaleData.value || {}
//                         const diffMS = (new Date() - new Date(lastChecked))
//                         const toastId = 'crowdsale-updateBalances' // prevent multiple toasts
//                         // tell user to wait x amount of minutes if previous check was in less than 30 minutes
//                         if (!!lastChecked && diffMS < CACHE_DURATION_MS) return setToast({
//                             content: `${textsCap.waitB4Check} ${Math.floor((CACHE_DURATION_MS - diffMS)/60000)} minutes`,
//                             status: 'warning',
//                         }, 3000, toastId)

//                         addToQueue({
//                             args: [false],
//                             func: 'crowdsaleCheckDeposits',  
//                             title: textsCap.updateBalances,
//                             type: QUEUE_TYPES.CHATCLIENT,
//                             then: (ok, result) => ok && crowdsaleData({
//                                 ...rxCrowdsaleData.value,
//                                 ...result,
//                             }),
//                         }, undefined, toastId)
//                     }
//                 },
//             ]
//                 .map((props, i) => {
//                     const btn = (
//                         <Button {...{
//                             ...props,
//                             fluid: isMobile,
//                             key: i,
//                             style: {
//                                 ...styles.capitalize,
//                                 margin: isMobile ? '3px 0' : '0 5px',
//                             },
//                         }} />
//                     )
//                     return !isMobile
//                         ? btn
//                         : <div key={i}>{btn}</div>
//                 })}
//         </div>
//     )
// })

// const styles = {
//     capitalize: { textTransform: 'capitalize' },
// }