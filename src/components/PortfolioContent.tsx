import React, { useEffect, useState, useRef } from 'react';
import * as anime from 'animejs';
import { animate } from 'animejs';
import ProjectList from './ProjectList';
import ReadmeViewer from './ReadmeViewer';
import './PortfolioContent.css';

interface PortfolioContentProps {
  username: string;
}

const PortfolioContent: React.FC<PortfolioContentProps> = ({ username }) => {
  const [activeTab, setActiveTab] = useState<'readme' | 'projects'>('readme');
  const tabsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Animation for tab switching
  useEffect(() => {
    if (contentRef.current) {
      animate(contentRef.current, {
        opacity: [0, 1],
        translateX: [20, 0],
        easing: 'easeOutExpo',
        duration: 800
      });
    }
  }, [activeTab]);

  // Animation for initial load
  useEffect(() => {
    if (tabsRef.current) {
      animate('.tab',{
        opacity: [0, 1],
        translateY: [-20, 0],
        delay: anime.stagger(100),
        easing: 'easeOutElastic(1, .6)',
        duration: 1200
      });
    }
  }, []);

  const handleTabClick = (tab: 'readme' | 'projects') => {
    // Animation for tab indicator
    const activeTabElement = document.querySelector(`.tab[data-tab="${tab}"]`);
    if (activeTabElement) {
      animate('.tab-indicator',{
        left: activeTabElement.getBoundingClientRect().left - (tabsRef.current?.getBoundingClientRect().left || 0),
        width: activeTabElement.getBoundingClientRect().width,
        easing: 'easeInOutQuad',
        duration: 500
      });
    }
    setActiveTab(tab);
  };

  return (
    <div className="portfolio-content">
      <div className="tabs" ref={tabsRef}>
        <div className="tab-indicator"></div>
        <button 
          className={`tab ${activeTab === 'readme' ? 'active' : ''}`} 
          onClick={() => handleTabClick('readme')}
          data-tab="readme"
        >
          README
        </button>
        <button 
          className={`tab ${activeTab === 'projects' ? 'active' : ''}`} 
          onClick={() => handleTabClick('projects')}
          data-tab="projects"
        >
          Projects
        </button>
      </div>
      
      <div className="tab-content" ref={contentRef}>
        {activeTab === 'readme' ? (
          <ReadmeViewer username={username} />
        ) : (
          <ProjectList username={username} />
        )}
      </div>
    </div>
  );
};

export default PortfolioContent;