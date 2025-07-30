import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import PortfolioContent from './components/PortfolioContent';
import ProfileSidebar from './components/ProfileSidebar';
import ThemeSwitcher from './components/ThemeSwitcher';

function App() {
  const defaultUsername = "devranbir";
  const [username, setUsername] = useState(defaultUsername);
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setShowUsernameInput(true);
      } else if (e.key === 'Escape') {
        setShowUsernameInput(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    if (showUsernameInput && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Add this line to select the text
    }
  }, [showUsernameInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUsername = inputRef.current?.value;
    if (newUsername) {
      setUsername(newUsername.trim());
      setShowUsernameInput(false);
    }
  };

  return (
    <div className="App">
      {showUsernameInput && (
        <div className="username-modal-overlay">
          <div className="username-modal">
            <form onSubmit={handleSubmit}>
              <div className="form-text">
                Hello visitor, you are viewing the git user {username}!
                <br />
                Switch to another GitHub user by entering their username in the input below.
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Enter GitHub username"
                defaultValue={username}
                onFocus={(e) => e.target.select()}
              />
              <div className="modal-buttons">
                <button type="submit">Switch User</button>
                <button type="button" onClick={() => setShowUsernameInput(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="user-switch">
        <button onClick={() => setShowUsernameInput(true)} className="switch-user-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="arcs"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
      </div>
      <div className="split-layout">
        <ProfileSidebar username={username} />
        <main>
          <PortfolioContent username={username} />
        </main>
      </div>
      <ThemeSwitcher />
    </div>
  );
}

export default App;