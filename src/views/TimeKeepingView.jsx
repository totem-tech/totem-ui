import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import TimeKeepingForm from '../forms/TimeKeeping'

class TimeKeepingView extends ReactiveComponent {
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div style={{maxWidth: 350}}>
                <TimeKeepingForm />
                {/* <h3> List or table showing the total hours worked per project, total blocks, percentage of hours worked over all hours for all projects. </h3> */}
            </div>
        )
    }
}

export default TimeKeepingView