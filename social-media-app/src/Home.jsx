import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSession, callApi } from './api';
import styles from './Home.module.css';

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
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const token = getSession('userSession');
    if (!token) {
      navigate('/login');
      return;
    }
    console.log('Token used:', token);
    const parsedToken = parseJwt(token);
    setCurrentUser(parsedToken);
    if (id) {
      fetchSpecificPost(token, id);
    }
  }, [id, navigate]);

  useEffect(() => {
    const token = getSession('userSession');
    if (!id && token) {
      fetchPosts(token, skip);
    }
  }, [skip, id, navigate]);

  const fetchSpecificPost = (token, postId) => {
    const headers = { Authorization: `Bearer ${token}` };
    callApi('GET', `http://localhost:8090/api/posts/${postId}`, null, (response) => {
      console.log('Raw response for specific post:', response);
      try {
        const postData = JSON.parse(response);
        if (postData.postType === 'image') {
          setPosts([postData]);
          setHasMore(false);
          const uniqueEmails = new Set([postData.userEmail]);
          postData.comments.forEach(comment => uniqueEmails.add(comment.userEmail));
          fetchUserDetails([...uniqueEmails], headers);
        } else {
          console.log('Requested post is not an image');
          setPosts([]);
        }
      } catch (error) {
        console.error('Error parsing specific post:', error);
        setPosts([]);
      }
    }, headers);
  };

  const fetchPosts = (token, skipValue) => {
    const headers = { Authorization: `Bearer ${token}` };
    callApi('GET', `http://localhost:8090/api/home-posts?skip=${skipValue}`, null, (response) => {
      console.log('Raw response from /api/home-posts:', response);
      try {
        const postsData = JSON.parse(response);
        if (!Array.isArray(postsData)) {
          console.error('Response is not an array:', postsData);
          setPosts([]);
          return;
        }
        const imagePosts = postsData.filter(post => post.postType === 'image');
        if (imagePosts.length < 5) setHasMore(false);
        setPosts(prev => [...prev, ...imagePosts]);

        const uniqueEmails = new Set(imagePosts.map(post => post.userEmail));
        imagePosts.forEach(post => {
          post.comments.forEach(comment => uniqueEmails.add(comment.userEmail));
        });
        fetchUserDetails([...uniqueEmails], headers);
      } catch (error) {
        console.error('Error parsing posts response:', error);
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
            <img src={post.url} alt={post.name} className={styles.postImage} />
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
              {posts.find(post => post._id === selectedPostId)?.comments.map((comment, index) => (
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