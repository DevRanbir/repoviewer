import React, { useEffect, useState, useRef } from 'react';
import { animate } from 'animejs';
import { 
  createHeaders, 
  setGitHubToken, 
  getGitHubToken,
  handleApiError
} from '../services/github';
import './ReadmeViewer.css';

interface ReadmeViewerProps {
  username: string;
}

const ReadmeViewer: React.FC<ReadmeViewerProps> = ({ username }) => {
  const [readme, setReadme] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const readmeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReadme = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the GitHub service to fetch the README
        const response = await fetch(
          `https://api.github.com/repos/${username}/${username}/readme`, 
          { 
            headers: {
              ...createHeaders(),
              Accept: 'application/vnd.github.v3.html'
            }
          }
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            try {
              // Use the handleApiError function from github.ts
              handleApiError(response);
              // If handleApiError doesn't throw (e.g., got a new token), retry
              fetchReadme();
              return;
            } catch (authError) {
              throw authError; // Re-throw if handleApiError throws
            }
          } else {
            throw new Error(`GitHub API error: ${response.status}`);
          }
        }
        
        // Process HTML to enhance it
        let processedHtml = await response.text();
        
        // Add target="_blank" to all links
        processedHtml = processedHtml.replace(
          /<a\s+(?![^>]*\btarget=(['"])_blank\1)[^>]*>/gi,
          (match) => match.replace(/<a\s/, '<a target="_blank" rel="noopener noreferrer" ')
        );
        
        // Add class to images for animations
        processedHtml = processedHtml.replace(
          /<img\s/gi,
          '<img class="readme-img" '
        );
        
        // Add classes to code blocks for syntax highlighting
        processedHtml = processedHtml.replace(
          /<pre>/gi,
          '<pre class="code-block">'
        );
        
        setReadme(processedHtml);
      } catch (error) {
        console.error('Error fetching README:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('404')) {
          setError('README not found. This user may not have a profile README.');
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
          // Try to get a token if we don't already have one
          const token = getGitHubToken();
          if (!token) {
            const newToken = prompt(
              'GitHub API rate limit exceeded or unauthorized.\n\n' +
              'Please enter your GitHub Personal Access Token (classic):\n' +
              '1. Go to https://github.com/settings/tokens\n' +
              '2. Click "Generate new token (classic)"\n' +
              '3. Give it a name and select "public_repo" scope\n' +
              '4. Copy and paste the token here'
            );
            
            if (newToken) {
              setGitHubToken(newToken);
              // Retry with the new token
              fetchReadme();
              return;
            }
          }
          
          setError('Authentication error. Please try logging in with a GitHub token.');
        } else {
          setError(`Failed to load README: ${errorMessage}`);
        }
        
        setReadme(`<div class="readme-error">${error instanceof Error ? error.message : 'README not found. This user may not have a profile README.'}</div>`);
      } finally {
        setLoading(false);
      }
    };

    fetchReadme();
  }, [username]);

  useEffect(() => {
    if (!loading && readmeRef.current) {
      // Animate readme content
      animate('.readme-content', {
        opacity: [0, 1],
        easing: 'easeOutSine',
        duration: 600
      });

      // Animate headers with staggered delay
      const headers = readmeRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headers.length > 0) {
        animate(headers, {
          opacity: [0, 1],
          translateY: [-15, 0],
          delay: (el, i) => i * 100 + 300,
          easing: 'easeOutElastic(1, .6)',
          duration: 1000
        });
      }

      // Animate images with fade and scale
      const images = readmeRef.current.querySelectorAll('.readme-img');
      if (images.length > 0) {
        animate(images, {
          opacity: [0, 1],
          scale: [0.9, 1],
          delay: (el, i) => i * 150 + 500,
          easing: 'easeOutSine',
          duration: 800
        });
      }

      // Animate code blocks with slide in
      const codeBlocks = readmeRef.current.querySelectorAll('.code-block');
      if (codeBlocks.length > 0) {
        animate(codeBlocks, {
          opacity: [0, 1],
          translateX: [-20, 0],
          delay: (el, i) => i * 150 + 200,
          easing: 'easeOutQuad',
          duration: 700
        });
      }
      
      // Animate list items with staggered delay
      const listItems = readmeRef.current.querySelectorAll('li');
      if (listItems.length > 0) {
        animate(listItems, {
          opacity: [0, 1],
          translateX: [-10, 0],
          delay: (el, i) => Math.min(i * 50, 1000) + 400,
          easing: 'easeOutQuad',
          duration: 600
        });
      }
    }
  }, [loading]);

  const loadingAnimation = () => {
    return (
      <div className="readme-loading">
        <div className="loading-spinner"></div>
        <p>Loading README...</p>
      </div>
    );
  };

  const errorDisplay = () => {
    return (
      <div className="readme-error">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>{error}</p>
        <p>Check if the user has created a profile README repository.</p>
      </div>
    );
  };

  return (
    <div className="readme-viewer" ref={readmeRef}>
      {loading ? (
        loadingAnimation()
      ) : error ? (
        errorDisplay()
      ) : (
        <div 
          className="readme-content" 
          dangerouslySetInnerHTML={{ __html: readme }}
        />
      )}
    </div>
  );
};

export default ReadmeViewer;