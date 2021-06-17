import axios from 'axios'
import {FETCH_USER} from './types'

// redux expects us to return an action immediately, after an action is called
// redux thunk breaks that rule, it gives us the ability to dispatch an action
// manually whenever we require it.

// redux thunk will observe fetchuser , if it return a function than it
// passes dispatch function as an argument
// eg: it will dispatch an action after the axios makes a get request


// in arrow function we can delete the { bracket if we have only one expression
// async syntex

export const fetchUser = () =>  async dispatch => {
    const res = await axios.get('/api/current_user');
    dispatch({
        type : FETCH_USER,
        payload: res.data
    })
}

/*
// old syntex

export const fetchUser = () => {
   return function(dispatch){
       axios.get('/api/current_user')
       .then(res => dispatch(
           {
               type: FETCH_USER,
               payload: res
           }
       ));
   }
}

*/
