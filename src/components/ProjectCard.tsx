import React, { useRef, useState } from 'react';
import './ProjectCard.css';
import RepoContentViewer from './RepoContentViewer';

interface ProjectCardProps {
  name: string;
  description: string;
  language: string;
  htmlUrl: string;
  homepage?: string;
  topics: string[];
  username: string;
  hasHtmlFile: boolean;
  updatedAt: string;
  stargazers: number;
  forks: number;
  hasPackageJson?: boolean;
  packageJsonHomepage: string | null | undefined;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  name,
  description,
  language,
  htmlUrl,
  homepage,
  topics,
  username,
  hasHtmlFile,
  hasPackageJson,
  packageJsonHomepage,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isRepoViewerOpen, setIsRepoViewerOpen] = useState(false);
  
  // Function to check if a website URL exists based on GitHub Pages pattern or package.json
  const getGitHubPagesUrl = () => {
    if (homepage) return homepage.trim().replace(/`/g, '');
    if (packageJsonHomepage) return packageJsonHomepage.trim().replace(/`/g, '');
    if (hasHtmlFile) return `https://${username}.github.io/${name}/`;
    return null;
  };
  
  const gitHubPagesUrl = getGitHubPagesUrl();
  

  return (
    <>
      <div className="project-card" ref={cardRef}>
        <h3>{name}</h3>
        <p>{description}</p>
        <div className="project-info">
          {language && (
            <span className="language" data-language={language}>{language}</span>
          )}
          <div className="topics">
            {topics.slice(0, 3).map((topic) => (
              <span key={topic} className="topic">{topic}</span>
            ))}
            {topics.length > 3 && (
              <span className="topic">+{topics.length - 3}</span>
            )}
          </div>
        </div>
        <div className="project-actions">
          <a 
            href={htmlUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="github-button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px' }}>
              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            GitHub
          </a>
          {gitHubPagesUrl && (
            <a
              href={gitHubPagesUrl}
              target="_blank" 
              rel="noopener noreferrer"
              className="demo-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Live Web
            </a>
          )}
          <button
            onClick={() => setIsRepoViewerOpen(true)}
            className="view-contents-button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '6px' }}>
              <path fillRule="evenodd" d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25V2.75A1.75 1.75 0 0014.25 1H1.75zM1.5 2.75a.25.25 0 01.25-.25h12.5a.25.25 0 01.25.25v10.5a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V2.75zM11.75 3a.75.75 0 00-.75.75v7.5a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75zm-8.25.75a.75.75 0 011.5 0v5.5a.75.75 0 01-1.5 0v-5.5z"></path>
            </svg>
            View Contents
          </button>
        </div>
      </div>

      <RepoContentViewer
        username={username}
        repoName={name}
        isOpen={isRepoViewerOpen}
        onClose={() => setIsRepoViewerOpen(false)}
      />
    </>
  );
};

export default ProjectCard;