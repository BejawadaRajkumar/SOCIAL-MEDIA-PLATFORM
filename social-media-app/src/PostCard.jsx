import React from 'react';
import styles from './PostCard.module.css';

const PostCard = ({ post }) => {
  return (
    <div className={styles.card}>
      <div className={styles.mediaContainer}>
        {/* Updated to use post.postType instead of post.type */}
        {post.postType === 'image' ? (
          <img src={post.url} alt={post.name} className={styles.media} />
        ) : (
          <video src={post.url} controls className={styles.media} />
        )}
      </div>
      <div className={styles.iconsContainer}>
        <div className={styles.icon}>👍</div>
        <div className={styles.icon}>💬</div>
        <div className={styles.icon}>📤</div>
      </div>
      <div className={styles.details}>
        <h3>{post.name}</h3>
        <p>{post.description}</p>
      </div>
    </div>
  );
};

export default PostCard;