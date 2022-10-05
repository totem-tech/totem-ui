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
import ClaimKAPEXForm from './ClaimKAKEX'
import ReferralCard from './ReferralCard'
import { useRewards } from './rewards'
import RewardsProgress from './RewardsProgress'
import SignupCard from './SignupCard'
import SocialCard from './SocialCard'

let textsCap = translated(
	{
		errIneligibleToMigrate: 'You are not eligible to claim $KAPEX!',
		migrateRewards: 'claim $KAPEX',
		notRegistered:
			'please complete registration in the getting started module',
		signupDesc: 'reward you received when you signed up',
		signupHeader: 'signup reward',
	},
	true
)[1]

// invoke without arguments to retrieve saved value
const cacheEligible = eligible =>
	storage.cache('rewards', 'KAPEXClaimEligible', eligible) || null
const cacheSubmitted = submitted =>
	storage.cache('rewards', 'KAPEXClaimSubmitted', submitted) || null

export default function RewardsView() {
	const [isLoggedIn] = useRxSubject(rxIsLoggedIn)
	const rewards = useRewards()
	const { socialRewards, signupReward, referralRewards } = rewards
	const [isLoading, setLoading] = useState(false)
	const [isEligible, setIsEligible] = useState(cacheEligible())
	const [claimSubmitted, setClaimSubmitted] = useState(cacheSubmitted())
	const modalId = 'migrate-rewards'

	useEffect(() => {
		const init = async () => {
			const eligible =
				isEligible !== false &&
				(await chatClient.rewardsClaimKAPEX.promise({
					checkEligible: true,
				}))
			setIsEligible(eligible)
			cacheEligible(eligible)
			if (!eligible) return

			const submitted = await chatClient.rewardsClaimKAPEX.promise({
				checkSubmitted: true,
			})
			setClaimSubmitted(submitted)
			submitted && cacheSubmitted(submitted)
		}

		if (isLoggedIn && !claimSubmitted) {
			setLoading(true)
			init().finally(() => setLoading(false))
		}
	}, [isLoggedIn])

	return !isLoggedIn ? (
		textsCap.notRegistered
	) : (
		<div>
			<RewardsProgress {...{ rewards }} />
			{/* Claim KAPEX button */}
			{/* <Button
				{...{
					color: (claimSubmitted && 'green') || undefined,
					content: textsCap.migrateRewards,
					disabled: claimSubmitted,
					icon: {
						name:
							isEligible === false
								? 'warning sign'
								: claimSubmitted
								? 'check circle'
								: 'play',
					},
					loading: isLoading,
					onClick: async () => {
						try {
							if (isEligible === false)
								throw new Error(textsCap.errIneligibleToMigrate)

							showForm(
								ClaimKAPEXForm,
								{
									onSubmit: success => {
										if (!success) return
										setClaimSubmitted(true)
									},
								},
								modalId
							)
						} catch (err) {
							confirm(
								{
									content: (
										<span
											style={{
												color: 'red',
												fontWeight: 'bold',
											}}
										>
											{`${err}`.replace('Error: ', '')}
										</span>
									),
									confirmButton: null,
									size: 'mini',
								},
								modalId
							)
						}
					},
					size: 'big',
					style: {
						background: 'deeppink',
						color: 'white',
						marginTop: 15,
					},
				}}
			/> */}
			<SignupCard {...{ signupReward }} />
			<SocialCard {...{ socialRewards }} />
			<ReferralCard {...{ referralRewards }} />
		</div>
	)
}
