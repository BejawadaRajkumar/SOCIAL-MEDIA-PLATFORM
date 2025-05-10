import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { callApi } from './api';
import styles from './MailChange.module.css';

const MailChange = () => {
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Extract token from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const confirmationToken = params.get('token');
    if (confirmationToken) {
      setToken(confirmationToken);
    } else {
      setMessage('Invalid or missing confirmation token.');
    }
  }, [location]);

  // Handle Approve button click
  const handleApprove = () => {
    if (!token) {
      setMessage('No token provided.');
      return;
    }

    callApi("GET", `http://localhost:8057/users/confirm-email-change?token=${token}`, null, (response) => {
      const [status, msg] = response.split("::");
      if (status === "200") {
        setMessage('Email changed successfully. You will be redirected to the login page.');
        setTimeout(() => {
          navigate('/login'); // Adjust this to your login route
        }, 3000);
      } else {
        setMessage(msg);
      }
    });
  };

  // Handle Reject button click
  const handleReject = () => {
    if (!token) {
      setMessage('No token provided.');
      return;
    }

    const data = JSON.stringify({ token });
    callApi("POST", "http://localhost:8057/users/cancel-email-change", data, (response) => {
      const [status, msg] = response.split("::");
      if (status === "200") {
        setMessage('Email change request cancelled. You will be redirected to the login page.');
        setTimeout(() => {
          navigate('/'); // Adjust this to your login route
        }, 2000);
      } else {
        setMessage(msg);
      }
    });
  };

  return (
    <div className={styles.container}>
      <h2>Email Change Confirmation</h2>
      <p>Please confirm your email change request.</p>
      {message && <p className={styles.message}>{message}</p>}
      <div className={styles.buttonGroup}>
        <button
          className={`${styles.button} ${styles.approve}`}
          onClick={handleApprove}
          disabled={!token}
        >
          Approve
        </button>
        <button
          className={`${styles.button} ${styles.reject}`}
          onClick={handleReject}
          disabled={!token}
        >
          Reject
        </button>
      </div>
    </div>
  );
};

export default MailChange;