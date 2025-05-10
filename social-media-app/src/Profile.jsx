import React, { useState, useEffect } from 'react';
import { getSession, callApi } from './api';
import styles from './profile.module.css';
import Post from './Post';
import UserPost from './UserPost';
import Settings from './Settings'; // Import the new Settings component

const Profile = () => {
  const [parsedToken, setParsedToken] = useState(null);
  const [activeTab, setActiveTab] = useState('Photos');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [posts, setPosts] = useState([]);

  // Fetch initial data and posts when the component mounts
  useEffect(() => {
    const session = getSession("userSession");
    const token = parseJwt(session);
    setParsedToken(token);
    fetchPosts();
  }, []);

  const fullName = parsedToken?.fullName || "Guest";
  const profilePic = parsedToken?.profilePic || 'https://i2.wp.com/get.wallhere.com/photo/Modi-narendra-modi-India-prime-minister-1588355.jpg';

  // Parse JWT token
  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Invalid token 🤯', error);
      return null;
    }
  }

  // Handle tab clicks and fetch data as needed
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === 'Followers') {
      fetchSocial();
    }
    if (tab === 'Photos') {
      fetchPosts();
    }
  };

  // Fetch followers and following data
  const fetchSocial = () => {
    setLoadingSocial(true);
    const token = getSession("userSession");
    const headers = { Authorization: `Bearer ${token}` };

    callApi("GET", "http://localhost:8057/users/getfollowers", null, (response) => {
      const [status, message] = response.split("::");
      if (status === "200") {
        try {
          const followersList = JSON.parse(message);
          setFollowers(followersList);
        } catch (error) {
          console.error("Error parsing followers:", error);
          setFollowers([]);
        }
      } else {
        console.error("Error fetching followers:", message);
        setFollowers([]);
      }
      setLoadingSocial(false);
    }, headers);

    callApi("GET", "http://localhost:8057/users/getfollowing", null, (response) => {
      const [status, message] = response.split("::");
      if (status === "200") {
        try {
          const followingList = JSON.parse(message);
          setFollowing(followingList);
        } catch (error) {
          console.error("Error parsing following:", error);
          setFollowing([]);
        }
      } else {
        console.error("Error fetching following:", message);
        setFollowing([]);
      }
    }, headers);
  };

  // Fetch user's posts from the backend
  const fetchPosts = () => {
    const token = getSession("userSession");
    const headers = { Authorization: `Bearer ${token}` };
    callApi("GET", "http://localhost:8090/api/posts", null, (response) => {
      try {
        const postsData = JSON.parse(response);
        setPosts(postsData);
      } catch (error) {
        console.error("Error parsing posts:", error);
        setPosts([]);
      }
    }, headers);
  };

  // Render content based on the active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'Photos':
        return (
          <>
            <Post />
            <UserPost posts={posts} />
          </>
        );
      case 'Followers':
        return (
          <div className={styles.tabContent}>
            <h3>Followers</h3>
            {loadingSocial && <p>Loading...</p>}
            {!loadingSocial && followers.length === 0 && <p>No followers found</p>}
            {!loadingSocial && followers.length > 0 && (
              <div className={styles.followersList}>
                {followers.map(follower => (
                  <div key={follower.email} className={styles.followerCard}>
                    <img
                      src={follower.profilePic}
                      alt={follower.fullName}
                      className={styles.followerImage}
                    />
                    <div className={styles.followerInfo}>
                      <span className={styles.followerName}>{follower.fullName}</span>
                      <span className={styles.followerEmail}>{follower.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <h3>Following</h3>
            {loadingSocial && <p>Loading...</p>}
            {!loadingSocial && following.length === 0 && <p>No following found</p>}
            {!loadingSocial && following.length > 0 && (
              <div className={styles.followersList}>
                {following.map(followed => (
                  <div key={followed.email} className={styles.followerCard}>
                    <img
                      src={followed.profilePic}
                      alt={followed.fullName}
                      className={styles.followerImage}
                    />
                    <div className={styles.followerInfo}>
                      <span className={styles.followerName}>{followed.fullName}</span>
                      <span className={styles.followerEmail}>{followed.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'Settings':
        return <Settings parsedToken={parsedToken} setParsedToken={setParsedToken} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.profile}>
      <div className={styles.profileHeader}>
        <img src={profilePic} alt="Profile" className={styles.profileImage} />
        <div className={styles.userInfo}>
          <h1 className={styles.username}>{fullName}</h1>
        </div>
      </div>
      <hr />
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'Photos' ? styles.tabActive : ''}`}
          onClick={() => handleTabClick('Photos')}
        >
          Posts
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'Followers' ? styles.tabActive : ''}`}
          onClick={() => handleTabClick('Followers')}
        >
          Followers
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'Settings' ? styles.tabActive : ''}`}
          onClick={() => handleTabClick('Settings')}
        >
          Settings
        </button>
      </div>
      {renderTabContent()}
    </div>
  );
};

export default Profile;