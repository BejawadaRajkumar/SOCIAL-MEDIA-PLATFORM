import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import styles from './Reels.module.css';
import { getSession, callApi, setSession } from './api';

// Parse JWT token (reused from Profile component)
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

const Reels = () => {
    const { id } = useParams(); // Extract reel ID from URL
    const [reels, setReels] = useState([]);
    const [users, setUsers] = useState({});
    const [currentUser, setCurrentUser] = useState(null);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [selectedReelId, setSelectedReelId] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [playing, setPlaying] = useState({});
    const [muted, setMuted] = useState({});
    
    // Refs for video elements
    const videoRefs = useRef({});

    useEffect(() => {
        const token = getSession('userSession');
        const parsedToken = parseJwt(token);
        setCurrentUser(parsedToken);

        const fetchReels = async () => {
            const headers = { Authorization: `Bearer ${token}` };
            const url = id ? `http://localhost:8090/api/posts/${id}` : 'http://localhost:8090/api/reels';
            callApi('GET', url, null, (response) => {
                try {
                    const reelsData = JSON.parse(response);
                    const reelsArray = id ? [reelsData] : reelsData; // Single reel wrapped in array
                    setReels(reelsArray);
                    
                    // Initialize playing and muted states for each reel
                    const initialPlayingState = {};
                    const initialMutedState = {};
                    reelsArray.forEach(reel => {
                        initialPlayingState[reel._id] = false;
                        initialMutedState[reel._id] = true; // Default muted
                    });
                    setPlaying(initialPlayingState);
                    setMuted(initialMutedState);
                    
                    const uniqueEmails = new Set(reelsArray.map(reel => reel.userEmail));
                    reelsArray.forEach(reel => {
                        reel.comments.forEach(comment => uniqueEmails.add(comment.userEmail));
                    });
                    fetchUserDetails([...uniqueEmails], headers);
                } catch (error) {
                    console.error('Error parsing reels:', error);
                    setReels([]);
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
            setUsers(usersMap);
        };

        fetchReels();
        
        // Setup Intersection Observer to play videos when they're visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const reelId = entry.target.dataset.reelId;
                if (entry.isIntersecting) {
                    setPlaying(prev => {
                        const newState = {...prev};
                        Object.keys(newState).forEach(id => {
                            newState[id] = id === reelId;
                        });
                        return newState;
                    });
                    if (videoRefs.current[reelId]) {
                        videoRefs.current[reelId].play().catch(e => console.error("Playback failed:", e));
                    }
                } else {
                    if (videoRefs.current[reelId]) {
                        videoRefs.current[reelId].pause();
                    }
                }
            });
        }, { threshold: 0.7 });
        
        setTimeout(() => {
            const reelElements = document.querySelectorAll(`.${styles.reelItem}`);
            reelElements.forEach(el => observer.observe(el));
        }, 1000);
        
        return () => {
            observer.disconnect();
        };
    }, [id]); // Depend on id to refetch when route changes

    const handleLike = (reelId) => {
        const token = getSession('userSession');
        const headers = { Authorization: `Bearer ${token}` };
        callApi('POST', `http://localhost:8090/api/posts/${reelId}/like`, null, (response) => {
            try {
                const updatedReel = JSON.parse(response);
                setReels(reels.map(reel => reel._id === reelId ? updatedReel : reel));
            } catch (error) {
                console.error('Error liking reel:', error);
            }
        }, headers);
    };

    const handleAddComment = () => {
        if (!commentText.trim()) return;
        const token = getSession('userSession');
        const headers = { Authorization: `Bearer ${token}` };
        const data = JSON.stringify({ text: commentText });
        callApi('POST', `http://localhost:8090/api/posts/${selectedReelId}/comment`, data, (response) => {
            try {
                const updatedReel = JSON.parse(response);
                setReels(reels.map(reel => reel._id === selectedReelId ? updatedReel : reel));
                setCommentText('');
            } catch (error) {
                console.error('Error adding comment:', error);
            }
        }, headers);
    };

    const handleShare = (reelId) => {
        const shareUrl = `${window.location.origin}/reel/${reelId}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                alert('Link copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy link:', err);
                alert('Failed to copy link. Please try again.');
            });
    };

    const openCommentModal = (reelId) => {
        setSelectedReelId(reelId);
        setShowCommentModal(true);
    };
    
    const togglePlay = (reelId, e) => {
        e.stopPropagation();
        const video = videoRefs.current[reelId];
        if (!video) return;
        
        if (playing[reelId]) {
            video.pause();
            setPlaying(prev => ({ ...prev, [reelId]: false }));
        } else {
            video.play().catch(e => console.error("Playback failed:", e));
            setPlaying(prev => ({ ...prev, [reelId]: true }));
        }
    };
    
    const toggleMute = (reelId, e) => {
        e.stopPropagation();
        const video = videoRefs.current[reelId];
        if (!video) return;
        
        video.muted = !video.muted;
        setMuted(prev => ({ ...prev, [reelId]: video.muted }));
    };

    return (
        <div className={styles.reelsContainer}>
            {reels.map(reel => (
                <div 
                    key={reel._id} 
                    className={styles.reelItem} 
                    data-reel-id={reel._id}
                    onClick={(e) => togglePlay(reel._id, e)}
                >
                    <div className={styles.reelVideoContainer}>
                        <div className={styles.reelControls}>
                            <div className={styles.reelUser}>
                                <div className={styles.reelAvatar}>
                                    <img src={users[reel.userEmail]?.profilePic} alt="Profile" />
                                </div>
                                <span className={styles.reelUsername}>{users[reel.userEmail]?.fullName || reel.userEmail}</span>
                            </div>
                            <div className={styles.soundButton} onClick={(e) => toggleMute(reel._id, e)}>
                                {muted[reel._id] ? (
                                    <div className={styles.soundMutedIcon}></div>
                                ) : (
                                    <div className={styles.soundOnIcon}></div>
                                )}
                            </div>
                        </div>
                        
                        <video 
                            ref={el => { videoRefs.current[reel._id] = el; }}
                            src={reel.url} 
                            className={styles.reelVideo}
                            loop
                            playsInline
                            muted={muted[reel._id]}
                        />
                        
                        {!playing[reel._id] && (
                            <div className={styles.playOverlay}>
                                <div className={styles.playIcon}></div>
                            </div>
                        )}
                        
                        <div className={styles.reelSideActions}>
                            <div className={`${styles.actionItem} ${reel.likes.includes(currentUser?.email) ? styles.disabled : ''}`} onClick={(e) => {
                                e.stopPropagation();
                                handleLike(reel._id);
                            }}>
                                <div className={styles.likeIcon}></div>
                                <span>{reel.likes.length}</span>
                            </div>
                            <div className={styles.actionItem} onClick={(e) => {
                                e.stopPropagation();
                                openCommentModal(reel._id);
                            }}>
                                <div className={styles.commentIcon}></div>
                                <span>{reel.comments.length}</span>
                            </div>
                            <div className={styles.actionItem} onClick={(e) => {
                                e.stopPropagation();
                                handleShare(reel._id);
                            }}>
                                <div className={styles.shareIcon}></div>
                            </div>
                        </div>
                        
                        <div className={styles.reelCaption}>
                            <p>{reel.description || "No description"}</p>
                            <div className={styles.originalAudio}>
                                <div className={styles.musicIcon}></div>
                                <span>{users[reel.userEmail]?.fullName || reel.userEmail} · Original audio</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            {showCommentModal && selectedReelId && (
                <div className={styles.commentModal} onClick={(e) => {
                    if (e.target === e.currentTarget) setShowCommentModal(false);
                }}>
                    <div className={styles.commentModalContent}>
                        <button className={styles.closeButton} onClick={() => setShowCommentModal(false)}>X</button>
                        <h3>Comments</h3>
                        <div className={styles.commentsList}>
                            {reels.find(reel => reel._id === selectedReelId).comments.map((comment, index) => (
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

export default Reels;