import React, { useEffect, useState, useRef, useCallback } from 'react';
import {animate} from 'animejs'; // Correct import for anime.js
import { 
  createHeaders, 
  getGitHubToken,
  setGitHubToken
} from '../services/github';
import './ProfileSidebar.css';

interface ProfileSidebarProps {
  username: string;
}

interface UserProfile {
  avatar_url: string;
  name: string;
  bio: string;
  blog: string;
  twitter_username: string;
  location: string;
  company: string;
}

interface CustomLink {
  icon: string;
  url: string;
  title: string;
  order: number;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ username }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [socialLinks, setSocialLinks] = useState<CustomLink[]>([]);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>(() => {
    const saved = localStorage.getItem('customLinks');
    return saved ? JSON.parse(saved) : [];
  });
  // Create a state for tracking saved links order
  const [savedLinkOrder, setSavedLinkOrder] = useState<{[url: string]: number}>(() => {
    const saved = localStorage.getItem('linkOrder');
    return saved ? JSON.parse(saved) : {};
  });
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const linksContainerRef = useRef<HTMLDivElement>(null);
  // Reference to track if we're currently dragging
  const isDragging = useRef(false);

  // Function to check if a link is valid and important
  const isImportantLink = useCallback((url: string): boolean => {
    // Filter out localhost, image/badge links, and invalid URLs
    if (!url || 
        url.includes('localhost') || 
        url.includes('camo.githubusercontent.com') ||
        url.includes('img.shields.io') ||
        url.includes('Animated-Fluent-Emojis') ||
        url.includes('raw.githubusercontent.com') ||
        (url.includes('#') && !url.startsWith('https://twitter.com/'))) {
      return false;
    }

    // Filter out GitHub links that don't match github.com/{username} or {username}.github.io
    if (url.includes('github.com/') && 
        !url.match(new RegExp(`github.com/${username}$`, 'i')) && 
        !url.match(new RegExp(`github.com/${username}/?$`, 'i'))) {
      return false;
    }

    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }, [username]);

  // Function to detect social media/important sites and assign appropriate icons
  const getLinkIcon = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/twitter.svg';
    } else if (lowerUrl.includes('github.com')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/github.svg';
    } else if (lowerUrl.includes('linkedin.com')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/linkedin.svg';
    } else if (lowerUrl.includes('instagram.com')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/instagram.svg';
    } else if (lowerUrl.includes('facebook.com')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/facebook.svg';
    } else if (lowerUrl.includes('medium.com')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/medium.svg';
    } else if (lowerUrl.includes('dev.to')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/dev.svg';
    } else if (lowerUrl.includes('stackoverflow.com')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/stack-overflow.svg';
    } else if (lowerUrl.includes('gitlab.com')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/gitlab.svg';
    } else if (lowerUrl.includes('bitbucket.org')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/bitbucket.svg';
    } else if (lowerUrl.includes('youtube.com/watch')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/solid/play.svg';
    } else if (
      lowerUrl.includes('youtube.com/c/') && lowerUrl.includes('sub_confirmation=1')
    ) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/solid/bell.svg';
    } else if (
      lowerUrl.includes('youtube.com/channel') ||
      lowerUrl.includes('youtube.com/c/') ||
      lowerUrl.includes('youtube.com/@')
    ) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/solid/user.svg';
    } else if (lowerUrl.includes('youtube.com')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/youtube.svg';
    } else if (lowerUrl.includes('discord.com') || lowerUrl.includes('discord.gg')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/discord.svg';
    } else if (lowerUrl.includes('devfolio.co')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/brands/dev.svg';
    } else if (lowerUrl.includes('unstop.com')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/solid/bolt.svg';
    } else if (lowerUrl.startsWith('mailto:') || lowerUrl.includes('@')) {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/solid/envelope.svg';
    } else {
      return 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/solid/globe.svg';
    }
  };

  // Function to save link order to localStorage
  const saveLinkOrder = useCallback((links: CustomLink[]) => {
    // Create a mapping of URL to order
    const orderMap: {[url: string]: number} = {};
    links.forEach((link, index) => {
      orderMap[link.url] = index;
    });
    
    // Save to localStorage
    localStorage.setItem('linkOrder', JSON.stringify(orderMap));
    setSavedLinkOrder(orderMap);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        const profileResponse = await fetch(`https://api.github.com/users/${username}`, {
          headers: createHeaders()
        });
        
        if (!profileResponse.ok) {
          if (profileResponse.status === 401 || profileResponse.status === 403) {
            const existingToken = getGitHubToken();
            
            if (existingToken) {
              console.warn('Existing GitHub token appears to be invalid or has insufficient permissions');
              localStorage.removeItem('github_token');
            }
            
            const envToken = typeof process !== 'undefined' && process.env?.REACT_APP_GITHUB_TOKEN;
            if (!envToken) {
              const token = prompt(
                'GitHub API rate limit exceeded or unauthorized.\n\n' +
                'Please enter your GitHub Personal Access Token (classic):\n' +
                '1. Go to https://github.com/settings/tokens\n' +
                '2. Click "Generate new token (classic)"\n' +
                '3. Give it a name and select "public_repo" scope\n' +
                '4. Copy and paste the token here'
              );
              
              if (token) {
                setGitHubToken(token);
                fetchUserProfile();
                return;
              }
            }
          }
          throw new Error(`GitHub API error: ${profileResponse.status} ${profileResponse.statusText}`);
        }
        
        const profileData = await profileResponse.json() as UserProfile;
        setProfile(profileData);
        
        const readmeResponse = await fetch(`https://api.github.com/repos/${username}/${username}/readme`, {
          headers: { ...createHeaders(), Accept: 'application/vnd.github.v3.html' }
        });
        
        if (readmeResponse.ok) {
          const readmeData = await readmeResponse.text();          
          // Extract links from profile and README
          let links: CustomLink[] = [];
          let order = 0;
          
          // Profile links
          if (profileData.blog && isImportantLink(profileData.blog)) {
            const url = profileData.blog.startsWith('http') 
              ? profileData.blog 
              : `https://${profileData.blog}`;
            
            links.push({
              icon: getLinkIcon(url),
              url,
              title: 'Website',
              order: savedLinkOrder[url] !== undefined ? savedLinkOrder[url] : order++
            });
          }
          
          if (profileData.twitter_username) {
            const url = `https://twitter.com/${profileData.twitter_username}`;
            links.push({
              icon: getLinkIcon(url),
              url,
              title: 'Twitter',
              order: savedLinkOrder[url] !== undefined ? savedLinkOrder[url] : order++
            });
          }
          
          const githubUrl = `https://github.com/${username}`;
          links.push({
            icon: getLinkIcon(githubUrl),
            url: githubUrl,
            title: 'GitHub',
            order: savedLinkOrder[githubUrl] !== undefined ? savedLinkOrder[githubUrl] : order++
          });

          // Extract links from README
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = readmeData;
          const readmeLinks = tempDiv.getElementsByTagName('a');
          
          Array.from(readmeLinks).forEach(link => {
            const url = link.href;
            
            if (url && 
                isImportantLink(url) && 
                !url.includes('https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis') &&
                !links.some(l => l.url === url)) {
              const title = link.textContent?.trim() || 'Link';
              
              links.push({ 
                icon: getLinkIcon(url),
                url,
                title,
                order: savedLinkOrder[url] !== undefined ? savedLinkOrder[url] : order++
              });
            }
          });
          
          // Combine with custom links, preserving their orders
          const savedCustomLinks = customLinks.map((link) => ({
            ...link,
            order: savedLinkOrder[link.url] !== undefined ? savedLinkOrder[link.url] : (1000 + link.order)
          }));

          // Sort all links by order
          const combinedLinks = [...links, ...savedCustomLinks].sort((a, b) => a.order - b.order);
          setSocialLinks(combinedLinks);
          
          // Save the initial order if there's no saved order yet
          if (Object.keys(savedLinkOrder).length === 0) {
            saveLinkOrder(combinedLinks);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username, customLinks, isImportantLink, savedLinkOrder, saveLinkOrder]);

  const addCustomLink = () => {
    const url = prompt('Enter the link URL:');
    const title = prompt('Enter the link title:');
    
    if (url && title) {
      const newUrl = url.startsWith('http') ? url : `https://${url}`;
      const newLink: CustomLink = {
        icon: getLinkIcon(newUrl),
        url: newUrl,
        title,
        order: socialLinks.length  // Put at the end by default
      };
      
      const updatedLinks = [...customLinks, newLink];
      setCustomLinks(updatedLinks);
      localStorage.setItem('customLinks', JSON.stringify(updatedLinks));
      
      // Add to social links
      const updatedSocialLinks = [...socialLinks, newLink];
      setSocialLinks(updatedSocialLinks);
      
      // Save the new order
      saveLinkOrder(updatedSocialLinks);
    }
  };

  const removeLink = (url: string) => {
    // Check if it's a custom link
    if (customLinks.some(link => link.url === url)) {
      const updatedLinks = customLinks.filter(link => link.url !== url);
      setCustomLinks(updatedLinks);
      localStorage.setItem('customLinks', JSON.stringify(updatedLinks));
    } else {
      // If it's a default link, add to hidden links in localStorage
      const hiddenLinks = JSON.parse(localStorage.getItem('hiddenLinks') || '[]');
      localStorage.setItem('hiddenLinks', JSON.stringify([...hiddenLinks, url]));
    }
    
    // Remove from displayed links
    const updatedSocialLinks = socialLinks.filter(link => link.url !== url);
    setSocialLinks(updatedSocialLinks);
    
    // Update the saved order
    saveLinkOrder(updatedSocialLinks);
  };

  // Dragging functionality with anime.js
  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Set draggable ghost image
    const dragIcon = document.createElement('div');
    dragIcon.className = "dragging-ghost";
    dragIcon.style.width = "40px";
    dragIcon.style.height = "40px";
    dragIcon.style.borderRadius = "50%";
    dragIcon.style.backgroundColor = "#f0f0f0";
    dragIcon.style.opacity = "0.8";
    document.body.appendChild(dragIcon);
    e.dataTransfer.setDragImage(dragIcon, 20, 20);
    
    // Set dragging state
    dragItem.current = index;
    isDragging.current = true;
    
    // Store the dragged item data
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
    
    // Highlight the dragged item
    if (linksContainerRef.current) {
      const linkElements = linksContainerRef.current.querySelectorAll('.social-link');
      animate(linkElements[index],{
        scale: 1.1,
        boxShadow: '0 0 10px rgba(66, 99, 235, 0.5)',
        duration: 300,
        easing: 'easeOutQuad'
      });
    }
    
    // Clean up the ghost element after drag starts
    setTimeout(() => {
      document.body.removeChild(dragIcon);
    }, 100);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (!isDragging.current || dragItem.current === index) return;
    
    dragOverItem.current = index;
    
    // Visual indication of drop target
    if (linksContainerRef.current && dragItem.current !== null && dragItem.current !== index) {
      const linkElements = linksContainerRef.current.querySelectorAll('.social-link');
      animate(linkElements[index],{
        translateY: [0, 5, 0],
        duration: 300,
        easing: 'easeOutQuad'
      });
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    // Set the target where item was dropped
    dragOverItem.current = index;
    
    // Handle the reordering
    handleDragEnd();
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newLinks = [...socialLinks];
      const draggedItem = newLinks[dragItem.current];
      
      // Remove the item from its original position
      newLinks.splice(dragItem.current, 1);
      
      // Insert at the new position
      newLinks.splice(dragOverItem.current, 0, draggedItem);
      
      // Update the order property
      newLinks.forEach((link, index) => {
        link.order = index;
      });
      
      // Update state and storage
      setSocialLinks(newLinks);
      
      // Save the new order to localStorage
      saveLinkOrder(newLinks);
      
      // Update custom links orders in localStorage if needed
      const updatedCustomLinks = customLinks.map(customLink => {
        const matchingLink = newLinks.find(link => link.url === customLink.url);
        return matchingLink ? { ...customLink, order: matchingLink.order } : customLink;
      });
      
      if (JSON.stringify(updatedCustomLinks) !== JSON.stringify(customLinks)) {
        setCustomLinks(updatedCustomLinks);
        localStorage.setItem('customLinks', JSON.stringify(updatedCustomLinks));
      }
      
      // Animate the reordering of items
      if (linksContainerRef.current) {
        const linkElements = linksContainerRef.current.querySelectorAll('.social-link');
        animate(linkElements,{
          translateX: [function(el: any, i: number) {
            return i === dragItem.current ? -20 : (i === dragOverItem.current ? 20 : 0);
          }, 0],
          scale: [function(el: any, i: number) {
            return i === dragItem.current ? 1.1 : 1;
          }, 1],
          boxShadow: [function(el: any, i: number) {
            return i === dragItem.current ? '0 0 10px rgba(66, 99, 235, 0.5)' : '0 0 0 rgba(0, 0, 0, 0)';
          }, '0 0 0 rgba(0, 0, 0, 0)'],
          duration: 400,
          easing: 'easeOutQuad'
        });
      }
    } else {
      // Reset styles if no actual reordering happened
      if (linksContainerRef.current && dragItem.current !== null) {
        const linkElements = linksContainerRef.current.querySelectorAll('.social-link');
        animate(linkElements[dragItem.current],{
          scale: 1,
          boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
          duration: 300,
          easing: 'easeOutQuad'
        });
      }
    }
    
    dragItem.current = null;
    dragOverItem.current = null;
  };

  useEffect(() => {
    if (!loading && profile) {
      // Animate elements when loaded
      animate('.profile-info',{
        opacity: [0, 1],
        translateY: [20, 0],
        easing: 'easeOutExpo',
        duration: 1000,
        delay: 300
      });

      animate('.avatar-container',{
        opacity: [0, 1],
        scale: [0.8, 1],
        easing: 'easeOutElastic(1, .6)',
        duration: 1200
      });

      animate('.social-link',{
        opacity: [0, 1],
        translateY: [10, 0],
        delay: function(el: any, i: number) { return 500 + (i * 100); },
        easing: 'easeOutQuad',
        duration: 800
      });

      animate('.decorative-svg',{
        opacity: [0, 1],
        scale: [0.5, 1],
        rotate: ['10deg', '0deg'],
        delay: function(el: any, i: number) { return 800 + (i * 150); },
        easing: 'easeOutElastic(1, .4)',
        duration: 1500
      });
    }
  }, [loading, profile]);

  // Add touch support for mobile devices
  useEffect(() => {
    if (!loading && linksContainerRef.current) {
      const linkElements = linksContainerRef.current.querySelectorAll('.social-link');
      
      const touchStartX = new Map<number, number>();
      const touchStartY = new Map<number, number>();
      
      linkElements.forEach((el, index) => {
        el.addEventListener('touchstart', (e: Event) => {
          const touchEvent = e as TouchEvent;
          if (touchEvent.touches.length === 1) {
            touchStartX.set(index, touchEvent.touches[0].clientX);
            touchStartY.set(index, touchEvent.touches[0].clientY);
            
            // Start long press timer for drag
            setTimeout(() => {
              if (touchStartX.has(index)) { // Check if touch is still active
                dragItem.current = index;
                isDragging.current = true;
                
                // Visual feedback
                animate(el, {
                  scale: 1.1,
                  boxShadow: '0 0 10px rgba(66, 99, 235, 0.5)',
                  duration: 300
                });
              }
            }, 500);
          }
        });
        
        el.addEventListener('touchmove', (e: Event) => {
          const touchEvent = e as TouchEvent;
          if (!isDragging.current || dragItem.current === null) return;
          
          touchEvent.preventDefault(); // Prevent scrolling while dragging
          
          const touch = touchEvent.touches[0];
          const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
          
          // Find if we're over another link element
          for (const element of elements) {
            if (element instanceof Element && element.classList.contains('social-link')) {
              const linkIndex = Array.from(linkElements).indexOf(element);
              if (linkIndex !== -1 && linkIndex !== dragItem.current) {
                dragOverItem.current = linkIndex;
                
                // Visual feedback
                animate(linkElements[linkIndex], {
                  translateY: [0, 5, 0],
                  duration: 300
                });
                break;
              }
            }
          }
        });
        
        el.addEventListener('touchend', () => {
          touchStartX.delete(index);
          touchStartY.delete(index);
          handleDragEnd();
        });
      });
    }
  }, [socialLinks, loading]);

  if (loading) {
    return (
      <div className="profile-sidebar loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="profile-sidebar">
      <div className="decorative-svg top-left">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4263EB" d="M40.7,-68.2C51.9,-60.5,59.5,-47.1,65.2,-33.6C70.9,-20.1,74.5,-6.4,73.2,6.9C71.9,20.2,65.6,33.2,56.4,43.8C47.1,54.5,34.8,62.8,21.3,67.4C7.8,72,-6.9,72.9,-20.6,69.1C-34.2,65.3,-46.7,57,-57.8,45.7C-68.9,34.5,-78.5,20.4,-80.6,5.2C-82.7,-10,-77.3,-26.3,-68.2,-39.8C-59.1,-53.3,-46.3,-64,-32.9,-69.9C-19.5,-75.8,-5.5,-77,8.7,-75.5C22.9,-74,36,-75.9,40.7,-68.2Z" transform="translate(100 100)" />
        </svg>
      </div>
      
      <div className="avatar-container">
        {profile?.avatar_url && (
          <img 
            src={profile.avatar_url} 
            alt={`${username}'s profile`} 
            className="avatar"
          />
        )}
      </div>
      
      <div className="profile-info">
        <h2>{profile?.name || username}</h2>
        {profile?.bio && <p className="bio">{profile.bio}</p>}
        
        <div className="profile-details">
          {profile?.location && (
            <div className="detail-item">
              <img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/solid/location-dot.svg" alt="Location" />
              <span>{profile.location}</span>
            </div>
          )}
          
          {profile?.company && (
            <div className="detail-item">
              <img src="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0-beta3/svgs/solid/building.svg" alt="Company" />
              <span>{profile.company}</span>
            </div>
          )}
        </div>
      </div>
      
      <div 
        className="social-links" 
        ref={linksContainerRef}
      >
        {socialLinks.map((link, index) => (
          <a 
            key={`${link.url}-${index}`}
            href={link.url} 
            target="_blank" 
            rel="noopener noreferrer"
            title={link.title}
            className="social-link"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            data-order={link.order}
          >
            <img src={link.icon} alt={link.url} />
            <button 
              className="remove-link" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeLink(link.url);
              }}
            >
              ×
            </button>
          </a>
        ))}
        <button className="add-link" onClick={addCustomLink} title="Add custom link">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M12 4c4.411 0 8 3.589 8 8s-3.589 8-8 8-8-3.589-8-8 3.589-8 8-8m0-2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5 9h-4V7h-2v4H7v2h4v4h2v-4h4v-2z"/>
          </svg>
        </button>
      </div>
      
      <div className="decorative-svg bottom-right">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="#FFC107" d="M47.1,-79.6C59.5,-71.9,67.1,-56.3,71.9,-41.1C76.7,-25.9,78.6,-13,77.4,-0.7C76.2,11.6,71.8,23.2,65.3,34.4C58.7,45.5,50,56.3,38.7,65.6C27.4,74.9,13.7,82.9,-0.5,83.7C-14.7,84.6,-29.4,78.3,-43,70.3C-56.6,62.2,-69.1,52.4,-75.9,39.4C-82.7,26.4,-83.8,10.2,-81.1,-5.5C-78.4,-21.2,-72,-36.5,-61.7,-47.7C-51.4,-59,-37.1,-66.4,-22.9,-72.4C-8.6,-78.3,5.5,-82.9,20.4,-82.5C35.2,-82.1,34.8,-87.3,47.1,-79.6Z" transform="translate(100 100)" />
        </svg>
      </div>
    </div>
  );
};

export default ProfileSidebar;