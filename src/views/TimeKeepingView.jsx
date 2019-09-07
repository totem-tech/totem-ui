import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import TimeKeepingForm from '../forms/TimeKeeping'
import { showForm } from '../services/modal'
import ProjectTimeKeepingList from '../lists/TimeKeepingList'

class TimeKeepingView extends ReactiveComponent {
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <ProjectTimeKeepingList />
        )
    }
}

export default TimeKeepingView