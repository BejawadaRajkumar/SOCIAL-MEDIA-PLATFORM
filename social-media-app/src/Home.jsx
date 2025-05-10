import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, callApi } from './api';
import styles from './Home.module.css';

// Parse JWT token (reused from Reels.jsx)
const parseJwt = (token) => {
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
};

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [playing, setPlaying] = useState({});
  const [muted, setMuted] = useState({});
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const videoRefs = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    const token = getSession('userSession');
    if (!token) {
      navigate('/login');
      return;
    }
    const parsedToken = parseJwt(token);
    setCurrentUser(parsedToken);
    fetchPosts(token, skip);
  }, [skip, navigate]);

  const fetchPosts = (token, skipValue) => {
    const headers = { Authorization: `Bearer ${token}` };
    callApi('GET', `http://localhost:8090/api/home-posts?skip=${skipValue}`, null, (response) => {
      try {
        const postsData = JSON.parse(response);
        if (postsData.length < 5) setHasMore(false);
        setPosts(prev => [...prev, ...postsData]);

        const initialPlayingState = {};
        const initialMutedState = {};
        postsData.forEach(post => {
          initialPlayingState[post._id] = false;
          initialMutedState[post._id] = true;
        });
        setPlaying(prev => ({ ...prev, ...initialPlayingState }));
        setMuted(prev => ({ ...prev, ...initialMutedState }));

        const uniqueEmails = new Set(postsData.map(post => post.userEmail));
        postsData.forEach(post => {
          post.comments.forEach(comment => uniqueEmails.add(comment.userEmail));
        });
        fetchUserDetails([...uniqueEmails], headers);
      } catch (error) {
        console.error('Error parsing posts:', error);
        setPosts([]);
      }
    }, headers);
  };

  const fetchUserDetails = async (emails, headers) => {
    const usersMap = {};
    const promises = emails.map(email => {
      return new Promise((resolve) => {
        callApi('GET', `http://localhost:8057/users/search/${email}`, null, (response) => {
          const [status, message] = response.split("::");
          if (status === "200") {
            try {
              const users = JSON.parse(message);
              if (users.length > 0) {
                const user = users[0];
                usersMap[email] = {
                  fullName: user.fullName,
                  profilePic: user.profilePic || 'https://i2.wp.com/get.wallhere.com/photo/Modi-narendra-modi-India-prime-minister-1588355.jpg'
                };
              }
            } catch (error) {
              console.error(`Error parsing user for ${email}:`, error);
            }
          } else {
            console.error(`Error fetching user for ${email}:`, message);
          }
          resolve();
        }, headers);
      });
    });
    await Promise.all(promises);
    setUsers(prev => ({ ...prev, ...usersMap }));
  };

  const handleLike = (postId) => {
    const token = getSession('userSession');
    const headers = { Authorization: `Bearer ${token}` };
    callApi('POST', `http://localhost:8090/api/posts/${postId}/like`, null, (response) => {
      try {
        const updatedPost = JSON.parse(response);
        setPosts(posts.map(post => post._id === postId ? updatedPost : post));
      } catch (error) {
        console.error('Error liking post:', error);
      }
    }, headers);
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const token = getSession('userSession');
    const headers = { Authorization: `Bearer ${token}` };
    const data = JSON.stringify({ text: commentText });
    callApi('POST', `http://localhost:8090/api/posts/${selectedPostId}/comment`, data, (response) => {
      try {
        const updatedPost = JSON.parse(response);
        setPosts(posts.map(post => post._id === selectedPostId ? updatedPost : post));
        setCommentText('');
      } catch (error) {
        console.error('Error adding comment:', error);
      }
    }, headers);
  };

  const handleShare = (postId) => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert('Link copied to clipboard!'))
      .catch(err => {
        console.error('Failed to copy link:', err);
        alert('Failed to copy link. Please try again.');
      });
  };

  const openCommentModal = (postId) => {
    setSelectedPostId(postId);
    setShowCommentModal(true);
  };

  const togglePlay = (postId, e) => {
    e.stopPropagation();
    const video = videoRefs.current[postId];
    if (!video) return;

    if (playing[postId]) {
      video.pause();
      setPlaying(prev => ({ ...prev, [postId]: false }));
    } else {
      video.play().catch(e => console.error('Playback failed:', e));
      setPlaying(prev => ({ ...prev, [postId]: true }));
    }
  };

  const toggleMute = (postId, e) => {
    e.stopPropagation();
    const video = videoRefs.current[postId];
    if (!video) return;

    video.muted = !video.muted;
    setMuted(prev => ({ ...prev, [postId]: video.muted }));
  };

  const loadMorePosts = () => {
    setSkip(prev => prev + 5);
  };

  return (
    <div className={styles.homeContainer}>
      {posts.map(post => (
        <div key={post._id} className={styles.postItem}>
          <div className={styles.postHeader}>
            <div className={styles.postAvatar}>
              <img src={users[post.userEmail]?.profilePic} alt="Profile" />
            </div>
            <span className={styles.postUsername}>{users[post.userEmail]?.fullName || post.userEmail}</span>
          </div>
          <div className={styles.postContent}>
            {post.postType === 'image' ? (
              <img src={post.url} alt={post.name} className={styles.postImage} />
            ) : (
              <div className={styles.postVideoContainer}>
                <video
                  ref={el => { videoRefs.current[post._id] = el; }}
                  src={post.url}
                  className={styles.postVideo}
                  loop
                  playsInline
                  muted={muted[post._id]}
                  onClick={(e) => togglePlay(post._id, e)}
                />
                <div className={styles.videoControls}>
                  <div className={styles.soundButton} onClick={(e) => toggleMute(post._id, e)}>
                    {muted[post._id] ? (
                      <div className={styles.soundMutedIcon}></div>
                    ) : (
                      <div className={styles.soundOnIcon}></div>
                    )}
                  </div>
                  {!playing[post._id] && (
                    <div className={styles.playOverlay}>
                      <div className={styles.playIcon}></div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className={styles.postActions}>
              <div
                className={`${styles.actionItem} ${post.likes.includes(currentUser?.email) ? styles.disabled : ''}`}
                onClick={() => handleLike(post._id)}
              >
                <div className={styles.likeIcon}></div>
                <span>{post.likes.length}</span>
              </div>
              <div className={styles.actionItem} onClick={() => openCommentModal(post._id)}>
                <div className={styles.commentIcon}></div>
                <span>{post.comments.length}</span>
              </div>
              <div className={styles.actionItem} onClick={() => handleShare(post._id)}>
                <div className={styles.shareIcon}></div>
              </div>
            </div>
            <div className={styles.postCaption}>
              <p>{post.description || 'No description'}</p>
            </div>
          </div>
        </div>
      ))}
      {hasMore && (
        <button className={styles.loadMoreButton} onClick={loadMorePosts}>
          Load More
        </button>
      )}
      {showCommentModal && selectedPostId && (
        <div className={styles.commentModal} onClick={(e) => {
          if (e.target === e.currentTarget) setShowCommentModal(false);
        }}>
          <div className={styles.commentModalContent}>
            <button className={styles.closeButton} onClick={() => setShowCommentModal(false)}>X</button>
            <h3>Comments</h3>
            <div className={styles.commentsList}>
              {posts.find(post => post._id === selectedPostId).comments.map((comment, index) => (
                <div key={index} className={styles.comment}>
                  <span className={styles.commentUsername}>
                    {users[comment.userEmail]?.fullName || comment.userEmail}
                  </span>
                  <span className={styles.commentText}>{comment.text}</span>
                </div>
              ))}
            </div>
            <div className={styles.commentInputContainer}>
              <input
                type="text"
                className={styles.commentInput}
                placeholder="Add a comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className={styles.submitButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddComment();
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;