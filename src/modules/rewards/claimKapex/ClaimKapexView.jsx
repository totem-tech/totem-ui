import React, { useState } from 'react'
import { rxIsRegistered } from '../../../utils/chatClient'
import { useRxSubject }  from '../../../utils/reactHelper'
import Message, { statuses } from '../../../components/Message'
import ClaimKAPEXForm from './ClaimKapexForm'
import { statusCached } from './claimKapex'
import { translated } from '../../../utils/languageHelper'

let textsCap = {
	errSubmitted: 'your claim has been received!',
	errSubmittedDetails: 'make sure to remind your friends to submit their claim.', 
	errEnded: 'Claim period has ended!',
	errIneligible1: 'You are not eligible to claim KAPEX.',
	errIneligible2: 'Only users who previously participated in the rewards campaign are eligible.',
	errNotRegistered: 'please complete registration in the getting started module',
}
textsCap = translated(textsCap, true)[1]

const ClaimKapexView = props => {
	// check if user has already submitted or is inelligible. 
	// This is to avoid the heavy stuff the claim form needs to do when
	// user has already submitted or is inelligible to claim.
	const [isRegistered] = useRxSubject(rxIsRegistered)
	const [status] = useState(() => statusCached())
	const { eligible, endDate, submitted } = status || {}
	const now = new Date()
	const err = {
		icon: true,
		status: statuses.ERROR,
	}
	const message = !isRegistered
		? { ...err, content: textsCap.errNotRegistered }
		: submitted
			? {
				content: textsCap.errSubmittedDetails,
				header: textsCap.errSubmitted,
				icon: true,
				status: statuses.SUCCESS,
			}
			: !!endDate && now > new Date(endDate)
				? { ...err, content: textsCap.errEnded }
				: eligible === false
					? { ...err, content: `${textsCap.errIneligible1} ${textsCap.errIneligible2}` }
					: null
	return message
		? <Message {...message} />
		: <ClaimKAPEXForm {...props} />
}

export default React.memo(ClaimKapexView)