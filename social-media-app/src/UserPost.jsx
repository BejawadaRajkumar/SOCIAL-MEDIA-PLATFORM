import React, { useState } from 'react';
import PostCard from './PostCard';
import styles from './UserPost.module.css';

const UserPost = ({ posts = [] }) => {
  const [filter, setFilter] = useState('image');

  // Updated to use post.postType instead of post.type
  const filteredPosts = posts.filter(post => post.postType === filter);

  return (
    <div>
      <div className={styles.tabs}>
        <button
          className={filter === 'image' ? styles.activeTab : styles.tab}
          onClick={() => setFilter('image')}
        >
          Images
        </button>
        <button
          className={filter === 'video' ? styles.activeTab : styles.tab}
          onClick={() => setFilter('video')}
        >
          Videos
        </button>
      </div>
      <div className={styles.postsContainer}>
        {filteredPosts.length === 0 ? (
          <p>No {filter} posts yet.</p>
        ) : (
          filteredPosts.map(post => (
            // Updated key to post._id instead of post.id
            <PostCard key={post._id} post={post} />
          ))
        )}
      </div>
    </div>
  );
};

export default UserPost;