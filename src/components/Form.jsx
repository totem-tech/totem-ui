import React from 'react'
import { Form } from 'semantic-ui-react'
import { useInverted } from '../services/window'

export default React.memo(props => <Form {...{ ...props, inverted: useInverted() }} />)