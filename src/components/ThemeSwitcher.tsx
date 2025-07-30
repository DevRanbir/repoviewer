import React, { useState, useEffect, useRef } from 'react';
import {animate} from 'animejs';
import './ThemeSwitcher.css';

const themes = [
  { id: 'light', name: 'Light', icon: '☀️' },
  { id: 'dark', name: 'Dark', icon: '🌙' },
  { id: 'nature', name: 'Nature', icon: '🌿' },
  { id: 'ocean', name: 'Ocean', icon: '🌊' },
  { id: 'rose', name: 'Rose', icon:'🌹'},
  { id: 'purple', name: 'Purple', icon:'💜'},
];

const ThemeSwitcher: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('theme', themeId);
    toggleMenu();
  };

  const toggleMenu = () => {
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('light-theme', savedTheme);
  }, []);

  useEffect(() => {
    if (!menuRef.current) return;

    if (isOpen) {
      // Animate menu opening
      animate(menuRef.current,{
        opacity: [0, 1],
        translateY: ['-20px', '0px'],
        scale: [0.8, 1],
        duration: 300,
        easing: 'easeOutElastic(1, .6)',
        begin: () => {
          menuRef.current!.style.display = 'flex';
        }
      });

      // Animate toggle button
      animate(buttonRef,{
        rotate: 180,
        duration: 300,
        easing: 'easeInOutQuad'
      });
    } else {
      // Animate menu closing
      animate(menuRef.current,{
        opacity: [1, 0],
        translateY: ['0px', '-20px'],
        scale: [1, 0.8],
        duration: 200,
        easing: 'easeInQuad',
        complete: () => {
          menuRef.current!.style.display = 'none';
        }
      });

      // Animate toggle button back
      animate(buttonRef,{
        rotate: 0,
        duration: 300,
        easing: 'easeInOutQuad'
      });
    }
  }, [isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="theme-switcher">
      <button 
        ref={buttonRef}
        className="theme-toggle-button"
        onClick={toggleMenu}
        aria-label="Toggle theme menu"
      >
        <span className="theme-icon">{themes.find(t => t.id === currentTheme)?.icon || '🎨'}</span>
      </button>
      
      <div 
        ref={menuRef} 
        className="theme-options"
        style={{ display: 'none' }}
      >
        {themes.map((theme) => (
          <button
            key={theme.id}
            className={`theme-button ${currentTheme === theme.id ? 'active' : ''}`}
            onClick={() => handleThemeChange(theme.id)}
            title={theme.name}
          >
            <span className="theme-icon">{theme.icon}</span>
            <span className="theme-name">{theme.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSwitcher;