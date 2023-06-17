// import React, { useEffect } from 'react'
// import { Button, Step } from 'semantic-ui-react'
// import Message from '../../components/Message'
// import { translated } from '../../services/language'
// import { showForm } from '../../services/modal'
// import { iUseReducer, reducer, subjectAsPromise, usePromise, useRxSubject } from '../../services/react'
// import { MOBILE, rxLayout } from '../../utils/window'
// import client, { rxIsLoggedIn, rxIsRegistered } from '../chat/ChatClient'
// import RegistrationForm from '../chat/RegistrationForm'
// import { getDeposits } from './crowdsale'
// import AddressList from './AddressList'
// import DepositStats from './DepositStats'
// import KYCForm from './KYCForm'
// import { showFaqs } from './FAQ'
// import IdentityForm from '../identity/IdentityForm'
// import { DEFAULT_NAME, getAll } from '../identity/identity'
// import CountDown from './CountDown'
// import { rxBlockNumber } from '../../services/blockchain'

// const START_BLOCK = 1787748
// const END_BLOCK = 9999
// const textsCap = translated({
//     crowdsaleFAQ: 'crowdsale FAQ',
//     loading: 'loading',
//     loginRequired: 'you must be logged in and online to access this section',
//     stepAccountTitle: 'create account',
//     stepDepositTitle: 'deposit funds',
//     stepKYCTitle: 'register for crowdsale',
//     stepUnlockTitle: 'withdraw',
// }, true)[1]

// const promises = {
//     isRegistered: subjectAsPromise(rxIsRegistered, true)[0],
//     isLoggedIn: subjectAsPromise(rxIsLoggedIn, true)[0],
// }
// export default function () {
//     // checks if user is registered
//     const [isRegistered] = usePromise(promises.isRegistered)
//     const [isMobile] = useRxSubject(rxLayout, l => l === MOBILE)
//     const [currentBlock] = usePromise(subjectAsPromise(
//         rxBlockNumber,
//         b => b > 0 && b, // waits until block number is received
//     )[0])
//     // whether crowdsale is currently active
//     const [isActive, isCrowdsaleDone] = [true, false] // use block number to determine active
//     const [state, setState] = iUseReducer(reducer, {
//         kycDone: false,
//         loading: true,
//     })

//     // on load check if KYC is done and if yes retrieve deposits/balances
//     useEffect(() => {        
//         if (state.kycDone) return
//         (async () => {
//             let newState = {}
//             try {
//                 // wait until user logs in
//                 const loggedIn = await subjectAsPromise(rxIsLoggedIn, true)[0]
//                 // check if KYC done
//                 const kycDone = await client.crowdsaleKYC.promise(true)
//                 // retrieve any existing amounts deposited
//                 const { deposits = {}, lastChecked } = (kycDone && await getDeposits()) || {}
//                 newState = {
//                     ...state,
//                     deposits,
//                     kycDone,
//                     lastChecked,
//                     message: null, 
//                 }
//             } catch (err) {
//                 console.trace(err)
//                 newState = {
//                     message: {
//                         content: `${err}`,
//                         icon: true,
//                         status: 'error',
//                     }
//                 }
//             }
//             newState.loading = false
//             setState(newState)
//         })()
//     }, [])

//     let stepContent = ''
//     const loading = state.loading || !currentBlock
//     const activeIndex =!isRegistered
//         ? 0
//         : loading || !!state.message
//             ? -1
//             : !state.kycDone
//                 ? 1
//                 : isActive 
//                     ? 2
//                     : isCrowdsaleDone
//                         ? 3
//                         : -1
//     const showSteps = activeIndex >= 0 //&& (isActive || !!state.kycDone)
//     const progressSteps = showSteps && [
//         textsCap.stepAccountTitle,
//         textsCap.stepKYCTitle,
//         textsCap.stepDepositTitle,
//         textsCap.stepUnlockTitle,
//     ].map((title, i) => ({
//         active: activeIndex === i, 
//         completed: i < activeIndex,
//         description: null,
//         disabled: activeIndex !== i,
//         key: i,
//         style: { maxWidth: isMobile ? null : 450 },
//         title: (
//             <div className='title' style={{ textTransform: 'capitalize' }}>
//                 {title}
//             </div>
//         )
//     }))

//     switch (activeIndex) {
//         case -1:
//             const msgProps = state.message || {
//                 header: loading
//                     ? textsCap.loading
//                     : textsCap.loginRequired,
//                 icon: true,
//                 status: loading
//                     ? 'loading'
//                     : 'error',
//             }
//             stepContent = <Message {...msgProps} />
//             break
//         case 0: 
//             stepContent = getInlineForm(RegistrationForm, {
//                 onSubmit: success => {
//                     const identities = getAll()
//                     const ok = success && identities.length === 1 && identities[0].name === DEFAULT_NAME
//                     // prompt user to change default identity name if not already done so
//                     if (!ok) return
//                     showForm(IdentityForm, {
//                         values: {
//                             ...identities[0],
//                             name: '', // force update name
//                         },
//                     })
//                 }
//             })
//             break
//         case 1: 
//             stepContent = getInlineForm(KYCForm, {
//                 onSubmit: kycDone => kycDone && setState({ kycDone }),
//                 style: { maxWidth: 400 },
//             })
//             break
//         case 2:
//         case 3:
//             stepContent = <AddressList />
//             break
//     }
    
//     if (loading) return stepContent
    
//     return (
//         <div>            
//             <CountDown showProgress={true} />
//             {state.kycDone && (
//                 <Button {...{
//                     content: textsCap.crowdsaleFAQ,
//                     fluid: isMobile,
//                     // icon: 'question',
//                     onClick: () => showFaqs(),
//                 }} />
//             )}
//             {showSteps && (
//                 <Step.Group {...{
//                     items: progressSteps,
//                     fluid: true,
//                     ordered: true,
//                     stackable: 'tablet',
//                     style: {
//                         maxWidth: '100%',
//                         overflowX: 'auto',
//                     },
//                 }} />
//             )}

//             {state.kycDone && <DepositStats />}
//             {showSteps && stepContent}
//         </div>
//     )
// }

// const getInlineForm = (Form, props) => (
//     <div>
//         <h3>{Form.defaultProps.header}</h3>
//         <h4 style={{ color: 'grey', marginTop: 0 }}>
//             {Form.defaultProps.subheader}
//         </h4>
//         <Form {...props} />
//     </div>
// )