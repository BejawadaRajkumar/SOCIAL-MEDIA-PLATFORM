import React, { useState, useEffect } from 'react';
import { getSession, callApi } from './api';
import styles from './search.module.css';
import debounce from 'lodash/debounce';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = debounce((searchQuery) => {
    if (searchQuery.trim() === '') {
      setResults([]);
      return;
    }

    setLoading(true);
    const token = getSession("userSession");
    const headers = { Authorization: `Bearer ${token}` };

    callApi("GET", `http://localhost:8057/users/search/${encodeURIComponent(searchQuery)}`, null, (response) => {
      const [status, message] = response.split("::");
      if (status === "200") {
        try {
          const users = JSON.parse(message);
          setResults(users);
        } catch (error) {
          console.error("Error parsing search results:", error);
          setResults([]);
        }
      } else {
        console.error("Search error:", message);
        setResults([]);
      }
      setLoading(false);
    }, headers);
  }, 500);

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query]);

  const handleSearch = (e) => {
    setQuery(e.target.value);
  };

  const handleFollow = (targetEmail) => {
    const token = getSession("userSession");
    const data = JSON.stringify({ targetEmail });
    const headers = { Authorization: `Bearer ${token}` };

    callApi("POST", "http://localhost:8057/users/follow", data, (response) => {
      const [status, message] = response.split("::");
      if (status === "200") {
        setResults(results.map(user =>
          user.email === targetEmail ? { ...user, isFollowing: true } : user
        ));
        alert("Successfully followed user!");
      } else {
        alert(message);
      }
    }, headers);
  };

  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search by email or full name"
        className={styles.searchBar}
      />
      <h2 className={styles.exploreText}>Search and explore with worldwide users</h2>
      <div className={styles.results}>
        {loading && <p>Loading...</p>}
        {!loading && results.length === 0 && query && <p>No users found</p>}
        {results.map(user => (
          <div key={user.email} className={styles.userCard}>
            <img
              src={user.profilePic}
              alt={user.fullName}
              className={styles.userImage}
            />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.fullName}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
            <button
              className={styles.followButton}
              onClick={() => handleFollow(user.email)}
              disabled={user.isFollowing}
            >
              {user.isFollowing ? "Following" : "Follow"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Search;