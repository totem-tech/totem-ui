import React, { Component } from 'react'
import { translated } from '../utils/languageHelper'
import { Message } from '../utils/reactjs'
import { getUrlParam } from '../utils/window'

const texts = translated({
	errorMsg: 'Something went wrong with this component',
})[0]

export default class ErrorBoundary extends Component {
	constructor(props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error) {
		// Update state so the next render will show the fallback UI.
		return {
			debug: getUrlParam('debug') === 'true',
			error,
			hasError: true,
		}
	}

	componentDidCatch(error, info) {
		// You can also log the error to an error reporting service
		console.error('ErrorBoundary', { error, info })
	}

	render() {
		const {
			debug,
			error,
			hasError
		} = this.state
		const {
			children,
			Container = 'div',
			...props
		} = this.props

		return !hasError && children || (
			<Container {...props}>
				<Message {...{
					content: !!debug && error.stack,
					header: !debug
						? texts.errorMsg
						: error.message,
					status: 'error',
					style: { whiteSpace: 'pre-wrap' },
				}} />
			</Container>
		)
	}
}
