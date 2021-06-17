// rendering layer control - react router

import React,{Component} from 'react'
import { BrowserRouter, Route } from 'react-router-dom'
import materializeCSS from 'materialize-css/dist/css/materialize.min.css';
import Header from './components/Header'
import {connect} from "react-redux";
import * as actions from './actions'
import Landing from './components/Landing'
import Main from './components/Main/dashboard/Main'
import Analytics from './components/Analytics'

const Dashboard = () => <> <Main/></>
const SurveyNew = () => <h2>SurveyNew</h2>

class App extends Component{
    // lifecycle method after the app inititally renders
    componentDidMount(){
        this.props.fetchUser();
    }
    render(){
        return(
            <div className="container">
            <BrowserRouter>
                <div>
                    <Header />
                    <Route exact path="/" component={Landing} />
                    <Route exact path="/xorai" component={Dashboard} />
                    <Route exact path="/xorai/new" component={SurveyNew} />
                    <Route exact path="/xorai/analytics" component={Analytics} />

                </div>
            </BrowserRouter>
        </div>
        )
    }
}
// connecting to redux store , 1st arg : mapstatetoprops-not used
// 2nd arg : actions

export default connect(null,actions)(App);