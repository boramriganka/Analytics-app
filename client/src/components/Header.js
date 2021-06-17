import React, { Component } from 'react'
import {connect} from 'react-redux';
import {Link} from 'react-router-dom'
class Header extends Component {
    renderContent(){
        switch(this.props.auth){
            case null:
                return;
            case false:
                return (
                    <li><a href="/auth/google">Login With Google</a></li>
                )
            default:
                return <li><a href="/api/logout">Logout</a></li>
        }
    }

    render() {
        
        return (
            <nav>
                <div className="nav-wrapper"
                 style={{
                     background:"#060b26",
                     padding : "0 1.5rem",
                     }}>
                    <Link
                    to={this.props.auth ?'/xorai':'/'} 
                    className=" left brand-logo"
                    >
                        Xorai
                
                    </Link>
                    <ul className="right">
                               {this.renderContent()}
                      </ul>
                      <ul>
                          <Link to="/analytics" className="right">
                              Analytics
                          </Link>
                      </ul>
                </div>
            </nav>
        )
    }
}

function mapStateToProps({auth}){
    return { auth };
}

export default connect(mapStateToProps)(Header);