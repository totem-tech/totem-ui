import React from 'react'
import { ReactiveComponent } from 'oo7-react'

export default class ErrorBoundary extends ReactiveComponent {
    constructor(props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true }
    }

    componentDidCatch(error, info) {
        // You can also log the error to an error reporting service
        console.log({ error, info })
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return <h1>Something went wrong with this component.</h1>
        }

        return this.props.children
    }
}