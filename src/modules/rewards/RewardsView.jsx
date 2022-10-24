import React, { useEffect, useState } from 'react'
import { Button, Icon } from 'semantic-ui-react'
import FAQ from '../../components/FAQ'
import Message, { statuses } from '../../components/Message'
import { translated } from '../../services/language'
import { closeModal, confirm, showForm } from '../../services/modal'
import { useRxSubject } from '../../services/react'
import chatClient, { rxIsLoggedIn } from '../../utils/chatClient'
import PromisE from '../../utils/PromisE'
import storage from '../../utils/storageHelper'
import { isBool } from '../../utils/utils'
import { rxIsRegistered } from '../chat/ChatClient'
import ClaimKAPEXView from './ClaimKAKEX'
import ReferralCard from './ReferralCard'
import { useRewards } from './rewards'
import RewardsProgress from './RewardsProgress'
import SignupCard from './SignupCard'
import SocialCard from './SocialCard'

const textsCap = translated({
	errIneligibleToMigrate: 'You are not eligible to claim $KAPEX!',
	migrateRewards: 'claim $KAPEX',
	notRegistered: 'please complete registration in the getting started module',
	loadingMsg: 'signing in',
	signupDesc: 'reward you received when you signed up',
	signupHeader: 'signup reward',
}, true)[1]

// // invoke without arguments to retrieve saved value
// const cacheEligible = eligible =>
// 	storage.cache('rewards', 'KAPEXClaimEligible', eligible) || null
// const cacheSubmitted = submitted =>
// 	storage.cache('rewards', 'KAPEXClaimSubmitted', submitted) || null

export default function RewardsView(props) {
	const [isLoggedIn] = useRxSubject(rxIsLoggedIn)
	const rewards = useRewards()
	const { socialRewards, signupReward, referralRewards } = rewards

	return !isLoggedIn
		? rxIsRegistered.value
			? <Message {...{
				content: textsCap.loadingMsg,
				icon: true,
				status: statuses.LOADING,
			}} />
			: <div {...props}>{textsCap.notRegistered}</div>
		: (
			<div {...props}>
				<RewardsProgress {...{ rewards }} />
				<SignupCard {...{ signupReward }} />
				<SocialCard {...{ socialRewards }} />
				<ReferralCard {...{ referralRewards }} />
			</div>
		)
}
