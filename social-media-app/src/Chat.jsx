import React, { useState, useEffect, useRef } from 'react';
import { getSession, callApi, BaseUrl, BaseChatUrl } from './api';
import styles from './Chat.module.css';
import io from 'socket.io-client';

const Chat = () => {
  const [parsedToken, setParsedToken] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [usersMap, setUsersMap] = useState({}); // To map emails to user details
  const socket = useRef();

  useEffect(() => {
    const session = getSession('userSession');
    const token = parseJwt(session);
    setParsedToken(token);

    if (!token) {
      alert('Please log in to view chat options.');
      return;
    }

    fetchSocial();

    // Initialize WebSocket connection
    socket.current = io(BaseChatUrl, {
      auth: {
        token: `Bearer ${session}`
      }
    });

    socket.current.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.current.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

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

  const fetchSocial = () => {
    const token = getSession('userSession');
    const headers = { Authorization: `Bearer ${token}` };

    const followersUrl = BaseUrl + 'users/getfollowers';
    callApi('GET', followersUrl, null, (response) => {
      const [status, message] = response.split('::');
      if (status === '200') {
        try {
          const followersList = JSON.parse(message);
          setFollowers(followersList);
          updateUsersMap(followersList);
        } catch (error) {
          console.error('Error parsing followers:', error);
          setFollowers([]);
        }
      } else {
        console.error('Error fetching followers:', message);
        setFollowers([]);
      }
    }, headers);

    const followingUrl = BaseUrl + 'users/getfollowing';
    callApi('GET', followingUrl, null, (response) => {
      const [status, message] = response.split('::');
      if (status === '200') {
        try {
          const followingList = JSON.parse(message);
          setFollowing(followingList);
          updateUsersMap(followingList);
        } catch (error) {
          console.error('Error parsing following:', error);
          setFollowing([]);
        }
      } else {
        console.error('Error fetching following:', message);
        setFollowing([]);
      }
    }, headers);
  };

  const updateUsersMap = (users) => {
    const newUsersMap = { ...usersMap };
    users.forEach(user => {
      newUsersMap[user.email] = {
        fullName: user.fullName,
        profilePic: user.profilePic
      };
    });
    setUsersMap(newUsersMap);
  };

  const handleChatClick = (user) => {
    setSelectedUser(user);
    setIsChatOpen(true);
    fetchMessages(user.email);
    // Join the chat room based on user emails
    if (socket.current) {
      socket.current.emit('joinRoom', { userEmail: parsedToken.email, otherEmail: user.email });
    }
  };

  const handleBackClick = () => {
    setIsChatOpen(false);
    setSelectedUser(null);
    setMessages([]);
    if (socket.current) {
      socket.current.emit('leaveRoom', { userEmail: parsedToken.email });
    }
  };

  const fetchMessages = (otherEmail) => {
    setLoadingMessages(true);
    const token = getSession('userSession');
    const headers = { Authorization: `Bearer ${token}` };
    const messagesUrl = BaseChatUrl + `api/chat/messages/${otherEmail}`;

    callApi('GET', messagesUrl, null, (response) => {
      try {
        const messageData = JSON.parse(response);
        setMessages(messageData);
      } catch (error) {
        console.error('Error parsing messages:', error);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    }, headers);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedUser) return;

    const token = getSession('userSession');
    const headers = { Authorization: `Bearer ${token}` };
    const sendMessageUrl = BaseChatUrl + 'api/chat/send-message';
    const message = {
      receiverEmail: selectedUser.email,
      content: newMessage,
    };

    callApi('POST', sendMessageUrl, JSON.stringify(message), (response) => {
      try {
        const data = JSON.parse(response);
        if (data.message === 'Message sent successfully') {
          const newMsg = {
            ...message,
            senderEmail: parsedToken.email,
            timestamp: new Date().toISOString(),
          };
          setMessages(prevMessages => [...prevMessages, newMsg]);
          setNewMessage('');
        } else {
          alert(data.message);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }, headers);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Listen for new messages via WebSocket
  useEffect(() => {
    if (socket.current && isChatOpen && selectedUser) {
      socket.current.on('newMessage', (newMsg) => {
        if (
          (newMsg.senderEmail === parsedToken.email && newMsg.receiverEmail === selectedUser.email) ||
          (newMsg.senderEmail === selectedUser.email && newMsg.receiverEmail === parsedToken.email)
        ) {
          setMessages((prevMessages) => [...prevMessages, newMsg]);
        }
      });

      return () => {
        socket.current.off('newMessage');
      };
    }
  }, [isChatOpen, selectedUser, parsedToken]);

  return (
    <div className={styles.chatContainer}>
      {!isChatOpen ? (
        <div className={styles.userList}>
          <h3>Followers</h3>
          {followers.length === 0 && <p>No followers found</p>}
          {followers.map(user => (
            <div key={user.email} className={styles.userCard}>
              <img src={user.profilePic} alt={user.fullName} className={styles.userImage} />
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.fullName}</span>
                <button className={styles.chatButton} onClick={() => handleChatClick(user)}>
                  Chat
                </button>
              </div>
            </div>
          ))}
          <h3>Following</h3>
          {following.length === 0 && <p>No following found</p>}
          {following.map(user => (
            <div key={user.email} className={styles.userCard}>
              <img src={user.profilePic} alt={user.fullName} className={styles.userImage} />
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.fullName}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.chatInterface}>
          <div className={styles.chatHeader}>
            <button className={styles.backButton} onClick={handleBackClick}>
              ← Back
            </button>
            <h3>{selectedUser.fullName}</h3>
          </div>
          <div className={styles.messageArea}>
            {loadingMessages && <p>Loading messages...</p>}
            {!loadingMessages && messages.length === 0 && <p>No messages yet</p>}
            {!loadingMessages && messages.map((msg, index) => {
              const isMyMessage = msg.senderEmail === parsedToken?.email;
              const sender = isMyMessage ? parsedToken : usersMap[msg.senderEmail] || { fullName: 'Unknown', profilePic: 'default-profile.png' };
              return (
                <div
                  key={index}
                  className={`${styles.message} ${isMyMessage ? styles.sent : styles.received}`}
                >
                  {!isMyMessage && (
                    <img
                      src={sender.profilePic}
                      alt={sender.fullName}
                      className={styles.profilePic}
                    />
                  )}
                  <div className={`${styles.messageBubble} ${isMyMessage ? styles.sent : styles.received}`}>
                    {!isMyMessage && <div className={styles.senderName}>{sender.fullName}</div>}
                    <div className={styles.messageContent}>{msg.content}</div>
                    <div className={styles.messageTime}>{formatTime(msg.timestamp)}</div>
                  </div>
                  {isMyMessage && (
                    <img
                      src={parsedToken.profilePic || 'default-profile.png'}
                      alt={parsedToken.fullName || 'You'}
                      className={styles.profilePic}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className={styles.inputArea}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className={styles.messageInput}
            />
            <button className={styles.sendButton} onClick={handleSendMessage}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;