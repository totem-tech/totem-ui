import React, { Component } from 'react'
import { newMessage } from '../utils/utils'
import { getUrlParam } from '../services/window'

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
        console.log({ error, info })
    }

    render() {
        const { debug, error, hasError } = this.state
        const { children } = this.props

        return !hasError ? children : newMessage({
            content: debug ? error.stack : undefined,
            header: !debug ? 'Something went wrong with this component' : error.message,
            status: 'error'
        })
    }
}