import React, { Component } from 'react'
import { connect } from 'react-redux';
import { Link } from 'react-router-dom'
import Navbar from './Nav/Navbar';
class Header extends Component {
    renderContent() {
        switch (this.props.auth) {
            case null:
                return;
            case false:
                return (
                    <li><a 
                    style={{
                        textDecoration: "none",
                        outline: "none"
                    }} 
                    href="/auth/google"
                    >Login With Google
                    </a>
                    </li>
                )
            default:
                return <li><a style={{
                    textDecoration: "none",
                    outline: "none"
                }} href="/api/logout">Logout</a></li>
        }
    }

    render() {

        return (
            <nav>
                <div className="nav-wrapper"
                    style={{
                        background: "#060b26",
                        padding: "0 1.5rem",
                    }}>
                    <Link
                        to={this.props.auth ? '/xorai' : '/'}
                        className=" left brand-logo"
                        style={{
                            textDecoration: "none",
                            outline: "none"
                        }}
                    >
                        Xorai

                    </Link>
                    <ul className="right">
                        {this.renderContent()}
                    </ul>
                    <ul>
                        <Link 
                        style={{
                            textDecoration: "none",
                            outline: "none"
                        }} 
                        to="/xorai/analytics" 
                        className="right">
                            Analytics
                        </Link>
                    </ul>
                </div>
            </nav>
        )
    }
}

function mapStateToProps({ auth }) {
    return { auth };
}

export default connect(mapStateToProps)(Header);