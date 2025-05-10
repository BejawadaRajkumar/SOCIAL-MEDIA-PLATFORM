import React, { useState } from 'react';
import { getSession, callApi, setSession } from './api';
import styles from './profile.module.css';

const Settings = ({ parsedToken, setParsedToken }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newFullName, setNewFullName] = useState(parsedToken?.fullName || '');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailChangeMessage, setEmailChangeMessage] = useState('');

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

  // Handle profile picture file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    uploadToCloudinary(file);
  };

  // Upload profile picture to Cloudinary
  const uploadToCloudinary = async (file) => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "sample");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dyrotsqsv/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      console.log("Uploaded Profile Pic URL 👉", data.secure_url);
      updateProfilePic(data.secure_url);
    } catch (err) {
      console.error("Upload Error 😞", err);
    } finally {
      setUploading(false);
    }
  };

  // Update profile picture in the backend
  const updateProfilePic = (url) => {
    const token = getSession("userSession");
    const data = JSON.stringify({ profilePic: url });
    const headers = { Authorization: `Bearer ${token}` };

    callApi("POST", "http://localhost:8057/users/updateprofilepic", data, (response) => {
      const [status, message] = response.split("::");
      if (status === "200") {
        const newToken = message.split("New token: ")[1];
        setSession("userSession", newToken, 1);
        const newParsedToken = parseJwt(newToken);
        setParsedToken(newParsedToken);
        alert("Profile picture updated successfully!");
      } else {
        alert(message);
      }
    }, headers);
  };

  // Toggle edit modal visibility
  const toggleEditModal = () => {
    setShowEditModal(!showEditModal);
    if (!showEditModal) {
      setNewFullName(parsedToken?.fullName || '');
    }
  };

  // Handle full name input change
  const handleNameChange = (e) => {
    setNewFullName(e.target.value);
  };

  // Update full name in the backend
  const updateFullName = () => {
    if (!newFullName.trim()) {
      alert("Full name cannot be empty!");
      return;
    }

    const token = getSession("userSession");
    const data = JSON.stringify({ fullName: newFullName.trim() });
    const headers = { Authorization: `Bearer ${token}` };

    callApi("POST", "http://localhost:8057/users/updatefullname", data, (response) => {
      const [status, message] = response.split("::");
      if (status === "200") {
        const newToken = message.split("New token: ")[1];
        setSession("userSession", newToken, 1);
        const newParsedToken = parseJwt(newToken);
        setParsedToken(newParsedToken);
        setShowEditModal(false);
        alert("Full name updated successfully!");
      } else {
        alert(message);
      }
    }, headers);
  };

  // Toggle email change modal visibility
  const toggleEmailModal = () => {
    setShowEmailModal(!showEmailModal);
    setEmailChangeMessage('');
  };

  // Handle new email input change
  const handleNewEmailChange = (e) => {
    setNewEmail(e.target.value);
  };

  // Request email change
  const requestEmailChange = () => {
    if (!newEmail.trim()) {
      setEmailChangeMessage("Email cannot be empty.");
      return;
    }

    const token = getSession("userSession");
    const data = JSON.stringify({ newEmail: newEmail.trim() });
    const headers = { Authorization: `Bearer ${token}` };

    callApi("POST", "http://localhost:8057/users/request-email-change", data, (response) => {
      const [status, message] = response.split("::");
      if (status === "200") {
        setEmailChangeMessage("Confirmation email sent to your new email address.");
        setShowEmailModal(false);
      } else {
        setEmailChangeMessage(message);
      }
    }, headers);
  };

  // Handle account closure request
  const handleCloseAccount = () => {
    alert("Account closure request submitted. This feature is not yet implemented.");
  };

  return (
    <div className={styles.tabContent}>
      <h3>Settings</h3>
      <div className={styles.settingsSection}>
        <h4>Profile Settings</h4>
        <button
          className={styles.editProfilePic}
          onClick={() => document.getElementById("fileInput").click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Add/Edit Profile Pic"}
        </button>
        <input
          type="file"
          id="fileInput"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <button
          className={styles.editProfilePic}
          onClick={toggleEditModal}
        >
          Edit Profile
        </button>
      </div>
      <div className={styles.settingsSection}>
        <h4>Email</h4>
        <input
          type="text"
          value={parsedToken?.email || ''}
          readOnly
          className={`${styles.inputField} ${styles.uneditableInput}`}
          placeholder="Email"
        />
        <button
          className={styles.editProfilePic}
          onClick={toggleEmailModal}
        >
          Change Email
        </button>
      </div>
      <div className={styles.dangerZone}>
        <h4>Danger Zone</h4>
        <button
          className={styles.editProfilePic}
          onClick={handleCloseAccount}
        >
          Request Account Closure
        </button>
      </div>
      {showEditModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Edit Profile</h3>
            <input
              type="text"
              value={newFullName}
              onChange={handleNameChange}
              placeholder="Full Name"
              className={styles.inputField}
            />
            <div className={styles.modalButtons}>
              <button
                className={styles.modalButton}
                onClick={updateFullName}
              >
                Save
              </button>
              <button
                className={styles.modalButton}
                onClick={toggleEditModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showEmailModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Change Email</h3>
            <input
              type="email"
              value={newEmail}
              onChange={handleNewEmailChange}
              placeholder="New Email"
              className={styles.inputField}
            />
            {emailChangeMessage && <p className={styles.message}>{emailChangeMessage}</p>}
            <div className={styles.modalButtons}>
              <button
                className={styles.modalButton}
                onClick={requestEmailChange}
              >
                Submit
              </button>
              <button
                className={styles.modalButton}
                onClick={toggleEmailModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;