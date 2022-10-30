import React, { isValidElement, useCallback, useEffect, useState } from 'react'
import { Button, Icon, Step } from 'semantic-ui-react'
import { BehaviorSubject } from 'rxjs'
import uuid from 'uuid'
import chatClient, {
	getUser,
    rxIsLoggedIn,
    rxIsRegistered,
} from '../../../utils/chatClient'
import { bytesToHex } from '../../../utils/convert'
import PromisE from '../../../utils/PromisE'
import {
	subjectAsPromise,
    unsubscribe,
    useRxSubject,
} from '../../../utils/reactHelper'
import storage from '../../../utils/storageHelper'
import {
	BLOCK_DURATION_SECONDS,
    durationToSeconds,
} from '../../../utils/time'
import {
	arrUnique,
    deferred,
    isFn,
    isHex,
    isInteger,
    isObj,
    isStr,
    objClean,
    objToUrlParams,
    objWithoutKeys,
} from '../../../utils/utils'
import FAQ from '../../../components/FAQ'
import FormBuilder, { findInput } from '../../../components/FormBuilder'
import Message, { statuses } from '../../../components/Message'
import { setActiveExclusive, setContentProps } from '../../../services/sidebar'
import {
	getAll as getHistory,
    limit,
    rxHistory,
} from '../../history/history'
import identities, {
	rxIdentities,
    rxSelected,
} from '../../identity/identity'
import partners, { rxPartners } from '../../partner/partner'
import Embolden from '../../../components/Embolden'
import { MOBILE, rxLayout } from '../../../services/window'
import { listTypes } from '../../task/TaskList'
import ClaimKAPEXForm from './ClaimKapexForm'
import { statusCached } from './claimKapex'
import { translated } from '../../../utils/languageHelper'

let textsCap = {
	addIdentity: 'add identity shared by a friend',
	addSelf: 'add yourself as a team member by clicking on the "Add myself" button.',
	amountClaimable: 'amount transferred will not affect the amount claimable.',
	checkNotification: 'check your notification to see if your friend shared their identity with you and add their them as partner by clicking on "Add partner" button.',
	clickCreate: 'click on the "Create" button.',
	clickDuration: 'click on "Manually enter duration"',
	clickProceed: 'click on the "Proceed" button',
	clickRequest: 'click on the "Request" button.',
	clickStart: 'click on the "Start" button',
	clickSubmit: 'click on the "Submit" button',
	clickTimer: 'click on the "Timer" button.',
	clickToRefresh: 'click to refresh',
	clickViewTeam: 'click on the "Add/view team members" button.',
	continue: 'continue',
	createActivity: 'create an Activity',
	createTask: 'create a task',
	createTkRecord: 'create a timekeeping record',
	enterAmount: 'enter any amount you wish to send.',
	enterDuration: 'enter a duration greater or equal to three hours',
	enterDuration2: '03:00:00',
	enterFriendUserId: `Enter your friend's Totem User ID in the "User" field`,
	enterNameDesc: 'enter any name and description for the activity.',
	enterReason: 'select or enter a custom reason',
	errSubmitted: 'your claim has been received!',
	errSubmittedDetails: 'make sure to remind your friends to submit their claim.', 
	errEnded: 'Claim period has ended!',
	errIneligible: 'You are not eligible to claim KAPEX.',
	errInvalidTweetUrl: 'invalid Tweet URL',
	errRewardId404: 'reason: missing reward identity',
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
		:!!endDate && now > new Date(endDate)
			? { ...err, content: textsCap.errEnded }
			: eligible === false
				? { ...err, content: textsCap.errIneligible }
				: submitted
					? {
						content: textsCap.errSubmittedDetails,
						header: textsCap.errSubmitted,
						icon: true,
						status: statuses.SUCCESS,
					}
					: null

	return message
		? <Message {...message} />
		: <ClaimKAPEXForm {...props} />
}

export default React.memo(ClaimKapexView)