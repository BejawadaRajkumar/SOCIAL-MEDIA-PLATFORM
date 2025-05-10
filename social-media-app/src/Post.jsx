import React, { useState } from 'react';
import { getSession, callApi, BasePostUrl } from './api';
import styles from './Post.module.css';

const Post = () => {
  const [showPostOptions, setShowPostOptions] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [postType, setPostType] = useState(null); // 'image' or 'video'
  const [postData, setPostData] = useState({
    name: '',
    description: '',
    file: null,
  });
  const [uploading, setUploading] = useState(false);

  const handleCreatePostClick = () => {
    setShowPostOptions(!showPostOptions);
  };

  const handleOptionClick = (type) => {
    setPostType(type);
    setShowModal(true);
    setShowPostOptions(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPostData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (postType === 'image' && !file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      if (postType === 'video' && !file.type.startsWith('video/')) {
        alert('Please select a video file.');
        return;
      }
      setPostData((prev) => ({ ...prev, file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!postData.name.trim() || !postData.description.trim() || !postData.file) {
      alert('Please fill in all fields and select a file.');
      return;
    }

    setUploading(true);

    try {
      const token = getSession('userSession');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      const headers = { Authorization: `Bearer ${token}` };
      const postUrl = BasePostUrl + 'api/posts';

      const formData = new FormData();

      if (postType === 'image') {
        // Upload image to Cloudinary
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', postData.file);
        cloudinaryFormData.append('upload_preset', 'sample'); // Replace with your preset

        const cloudinaryResponse = await fetch('https://api.cloudinary.com/v1_1/dyrotsqsv/image/upload', {
          method: 'POST',
          body: cloudinaryFormData,
        });

        if (!cloudinaryResponse.ok) {
          throw new Error('Failed to upload image to Cloudinary');
        }

        const cloudinaryData = await cloudinaryResponse.json();
        const url = cloudinaryData.secure_url;

        // Add postData as JSON string with URL
        formData.append('postData', JSON.stringify({
          postType,
          name: postData.name,
          description: postData.description,
          url,
        }));
      } else {
        // Video post: add postData and file to FormData
        formData.append('postData', JSON.stringify({
          postType,
          name: postData.name,
          description: postData.description,
        }));
        formData.append('file', postData.file);
      }

      callApi('POST', postUrl, formData, (response) => {
        try {
          const data = JSON.parse(response);
          if (data.message === 'Post created successfully') {
            alert('Post created successfully');
            setPostData({ name: '', description: '', file: null });
            setShowModal(false);
            setPostType(null);
          } else {
            alert(data.message || 'Error creating post');
          }
        } catch (error) {
          console.error('Error parsing response:', error);
          alert('Error creating post');
        }
      }, headers);
    } catch (error) {
      console.error('Error submitting post:', error);
      alert(`Error submitting post: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPostData({ name: '', description: '', file: null });
    setPostType(null);
  };

  return (
    <div className={styles.postContainer}>
      <button className={styles.createPostButton} onClick={handleCreatePostClick}>
        Create Post
      </button>
      {showPostOptions && (
        <div className={styles.postOptions}>
          <div
            className={styles.optionCard}
            onClick={() => handleOptionClick('image')}
          >
            <div className={styles.optionIcon}>🖼️</div>
            <span>Image Post</span>
          </div>
          <div
            className={styles.optionCard}
            onClick={() => handleOptionClick('video')}
          >
            <div className={styles.optionIcon}>🎥</div>
            <span>Short Video Post</span>
          </div>
        </div>
      )}
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Create {postType === 'image' ? 'Image' : 'Video'} Post</h3>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                value={postData.name}
                onChange={handleInputChange}
                placeholder="Post Name"
                className={styles.inputField}
                disabled={uploading}
              />
              <textarea
                name="description"
                value={postData.description}
                onChange={handleInputChange}
                placeholder="Description"
                className={styles.textareaField}
                disabled={uploading}
              />
              <input
                type="file"
                accept={postType === 'image' ? 'image/*' : 'video/*'}
                onChange={handleFileChange}
                className={styles.fileInput}
                disabled={uploading}
              />
              <div className={styles.modalButtons}>
                <button type="submit" className={styles.submitButton} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Submit'}
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCloseModal}
                  disabled={uploading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Post;