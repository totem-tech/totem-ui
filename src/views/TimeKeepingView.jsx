import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import {Divider} from 'semantic-ui-react'
import { FormInput } from '../components/FormBuilder'
import ProjectTimeKeepingList from '../lists/TimeKeepingList'
import TimeKeepingSummary from '../lists/TimeKeepingSummary'

class TimeKeepingView extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {showSummary: true}
    }

    render() {
        const { showSummary } = this.state
        return (
            <div>
                <FormInput
                    defaultChecked={showSummary}
                    label="Show summary"
                    name=""
                    onChange={(_, {checked}) => this.setState({showSummary: !!checked})}
                    toggle
                    type="checkbox"
                />
                <div style={showSummary ? {} : {marginTop: 15}}>
                    {showSummary ? <TimeKeepingSummary /> : <ProjectTimeKeepingList />}
                </div>
            </div>
        )
    }
}

export default TimeKeepingView