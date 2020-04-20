import React, {Component} from 'react'
import DataTable from '../../components/DataTable'
import {showForm} from '../../services/modal'
import TaskForm from './Form'

export default (
    <div>
        <button className='ui button' onClick={()=> showForm(TaskForm, { size: 'tiny' })}>Create</button>
    </div>
)