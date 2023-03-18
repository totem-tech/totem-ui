import React from 'react'
import Message, { statuses } from '../../components/Message'
import { translated } from '../../utils/languageHelper'
import { useRxSubject } from '../../utils/reactHelper'
import { rxIsLoggedIn } from '../../utils/chatClient'
import { rxIsRegistered } from '../../utils/chatClient'
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
