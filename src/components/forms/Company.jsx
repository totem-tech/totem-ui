import React from 'react'
import { ReactiveComponent } from 'oo7-react'
import FormBuilder from './FormBuilder'

class Company extends ReactiveComponent {
    constructor(props) {
        super(props)

        this.state = {
            message: {},
            success: false,
            inputs: [
                {
                    label: 'Company Name',
                    name: 'name',
                    type: 'text'
                },
                {
                    label: 'Registration Number',
                    name: 'regNumber',
                    type: 'text'
                },
                {
                    label: 'Country',
                    name: 'country',
                    type: 'text'
                }
            ]
        }
    }
}