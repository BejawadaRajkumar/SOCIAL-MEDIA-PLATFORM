import React, { Component } from 'react';
import './Dashboard.css';
import axios from 'axios';
import { getSession } from './api';
import Profile from './Profile';
import Search from './Search';
import Chat from './Chat';
import Reels from './Reels';
import Home from './Home';
class Dashboard extends Component {
    state = {
        selectedMenu: 'Home',
        fullName: 'Loading...'
    };

    componentDidMount() {
        this.fetchFullName();
    }

    fetchFullName = async () => {
        const token = getSession("userSession");
        console.log("📦 Token fetched from cookie:", token);

        if (!token || token.split('.').length !== 3) {
            console.warn("🚫 Invalid token format or missing token");
            this.setState({ fullName: "Session Expired" });
            return;
        }

        try {
            const response = await axios.get('http://localhost:8057/users/getfullname', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const [status, message] = response.data.split("::");
            if (status === "200") {
                this.setState({ fullName: message });
            } else {
                console.error('❌ Failed to fetch full name:', message);
                this.setState({ fullName: "Session Expired" });
            }
        } catch (error) {
            console.error('❌ Failed to fetch full name:', error);
            this.setState({ fullName: "Session Expired" });
        }
    };

    handleMenuClick = (menu) => {
        this.setState({ selectedMenu: menu });
    };

    handleLogout = () => {
        document.cookie = "userSession=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = '/';
    };

    renderContent = () => {
        const { selectedMenu } = this.state;
        switch (selectedMenu) {
            case 'Home':
                return <Home/>;
            case 'Profile':
                return <Profile/>;
            case 'Chat':
                return <Chat/>;
            case 'Reels':
                return <Reels/>;
            case 'Search':
                return <Search/>;
            default:
                return <div>Select a menu option</div>;
        }
    };

    render() {
        const { selectedMenu, fullName } = this.state;

        return (
            <div className='dashboard'>
                <div className='header'>
                    <div className="logo-container">
                        <img className="logoicon" src="/logoicon.png" alt="Logo" />
                        <label className="logo-text">Circle Up</label>
                    </div>
                    <div className="user-info">
                        <span> {fullName}</span>
                    </div>
                </div>

                <div className='menu'>
                    {['Home', 'Search', 'Chat', 'Reels', 'Profile'].map(menu => (
                        <button
                            key={menu}
                            className={`menu-button ${selectedMenu === menu ? 'active' : ''}`}
                            onClick={() => this.handleMenuClick(menu)}
                        >
                            <img src={`/${menu.toLowerCase()}.png`} alt={menu} className="menu-icon-img" /> {menu}
                        </button>
                    ))}
                    <div className="logout-section" onClick={this.handleLogout}>
                        <img src="/logout.png" alt="Logout" className="menu-icon-img" /> Logout
                    </div>
                </div>

                <div className='outlet'>
                    {this.renderContent()}
                </div>
            </div>
        );
    }
}

export default Dashboard;