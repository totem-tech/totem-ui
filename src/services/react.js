// placeholder for reusable React utility functions that doesn't doesn't specifically fit anywhere else

// for use with useReducer hook on a functional component to imitate the behaviour of `setState()` of a class component
export const reducer = (oldState = {}, newState = {}) => ({ ...oldState, ...newState })