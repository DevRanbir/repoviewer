import React, { useEffect, useState, useCallback } from 'react';
import './RepoContentViewer.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RepoContentViewerProps {
  username: string;
  repoName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface RepoContent {
  type: string;
  name: string;
  path: string;
  sha: string;
  content?: string;
  encoding?: string;
  size?: number;
  url?: string;
}

interface Branch {
  name: string;
  commit: {
    sha: string;
  };
}

const RepoContentViewer: React.FC<RepoContentViewerProps> = ({
  username,
  repoName,
  isOpen,
  onClose
}) => {
  const [contents, setContents] = useState<RepoContent[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<RepoContent | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [showBranchSelector, setShowBranchSelector] = useState(false);

  const fetchBranches = useCallback(async () => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${username}/${repoName}/branches`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch branches');
      const data = await response.json();
      setBranches(data);
      
      // Set default branch if we don't have one yet
      if (currentBranch === 'main' && data.length > 0) {
        // Check if 'main' or 'master' exists, otherwise use the first branch
        const defaultBranch = data.find((b: Branch) => b.name === 'main') || 
                             data.find((b: Branch) => b.name === 'master') || 
                             data[0];
        setCurrentBranch(defaultBranch.name);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      // Don't set error state here to avoid blocking content display
    }
  }, [username, repoName, currentBranch]);

  const fetchRepoContents = useCallback(async () => {
    try {
      setLoading(true);
      setSelectedFile(null);
      setFileContent('');
      
      const response = await fetch(
        `https://api.github.com/repos/${username}/${repoName}/contents/${currentPath}?ref=${currentBranch}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Failed to fetch repository contents');
      const data = await response.json();
      const contents = Array.isArray(data) ? data : [data];
      setContents(contents);

      // Check for README file if we're at the root level and no file is selected
      if (currentPath === '' && !selectedFile) {
        const readmeFile = contents.find(item => 
          item.type === 'file' && 
          item.name.toLowerCase().startsWith('readme')
        );
        if (readmeFile) {
          fetchFileContent(readmeFile);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching contents');
    } finally {
      setLoading(false);
    }
  }, [username, repoName, currentPath, currentBranch]);

  useEffect(() => {
    if (isOpen) {
      fetchBranches();
      fetchRepoContents();
    }
  }, [isOpen, fetchBranches, fetchRepoContents]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('github_token');
    return {
      Accept: 'application/vnd.github.v3+json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  };


  const fetchFileContent = async (file: RepoContent) => {
    try {
      setLoading(true);
  
      let content = '';
  
      try {
        // Try to fetch the file details as JSON to check the encoding
        const response = await fetch(file.url!, {
          headers: getAuthHeaders()
        });
  
        if (!response.ok) {
          throw new Error(`Failed to fetch file details for ${file.name}`);
        }
  
        const data = await response.json();
  
        // Check if the content is base64 encoded
        if (data.encoding === 'base64' && data.content) {
          // Decode base64 content
          content = atob(data.content.replace(/\n/g, ''));
        } else if (typeof data.content === 'string') {
          // If not base64, assume it's plain text content directly in the 'content' field
          content = data.content;
        } else {
          content = `Could not decode or retrieve content for ${file.name}`;
          console.warn(`Unexpected content format for ${file.name}:`, data);
        }
      } catch (jsonError) {
        // If fetching as JSON fails, assume it's a plain text file
        console.warn(`Failed to parse response as JSON for ${file.name}. Assuming plain text.`);
        const textResponse = await fetch(file.url!, {
          headers: getAuthHeaders()
        });
        if (!textResponse.ok) {
          throw new Error(`Failed to fetch plain text content for ${file.name}`);
        }
        content = await textResponse.text();
      }
  
      setFileContent(content);
      setSelectedFile(file);
  
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error fetching or processing ${file.name}`);
      setSelectedFile(null);
    } finally {
      setLoading(false);
    }
  };
  

  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
  };

  const goBack = () => {
    if (error) {
      // Clear error state when going back from an error
      setError(null);
      // If we were trying to view a file, just clear the selection
      if (selectedFile) {
        setSelectedFile(null);
        setFileContent('');
      }
      // Otherwise, refresh the current directory contents
      else {
        fetchRepoContents();
      }
    } else if (selectedFile) {
      setSelectedFile(null);
      setFileContent('');
    } else {
      const newPath = currentPath.split('/').slice(0, -1).join('/');
      setCurrentPath(newPath);
    }
  };

  const handleItemClick = (item: RepoContent) => {
    if (item.type === 'dir') {
      navigateToFolder(item.path);
    } else {
      fetchFileContent(item);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleBranchSelector = () => {
    setShowBranchSelector(!showBranchSelector);
  };

  const changeBranch = (branchName: string) => {
    setCurrentBranch(branchName);
    setCurrentPath('');
    setSelectedFile(null);
    setFileContent('');
    setShowBranchSelector(false);
  };

  if (!isOpen) return null;

  const processMarkdownContent = (content: string) => {
    // Replace relative image paths with absolute GitHub URLs
    return content.replace(
      /!\[([^\]]*)\]\((?!http)([^)]*)\)/g,
      `![$1](https://raw.githubusercontent.com/${username}/${repoName}/${currentBranch}/$2)`
    );
  };

  const copyFileContent = () => {
    navigator.clipboard.writeText(fileContent);
  };

  const renderFileContent = () => {
    if (!selectedFile) return null;

    return (
      <div className="file-content">
        {selectedFile.name.toLowerCase().endsWith('.md') ? (
          <div className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ node, ...props }) => (
                  <img style={{ maxWidth: '100%' }} {...props} alt={props.alt || ''} />
                ),
                a: ({ node, ...props }) => (
                  <a 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    {...props}
                    aria-label={props.href || 'Link'}
                  >
                    {props.children || props.href}
                  </a>
                )
              }}
            >
              {processMarkdownContent(fileContent)}
            </ReactMarkdown>
          </div>
        ) : (
          <pre>
            <code>{fileContent}</code>
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="repo-content-viewer-overlay">
      <div className="repo-content-viewer">
        <div className="repo-content-header">
          <div className="header-content">
            <button 
              className="toggle-sidebar-button" 
              onClick={toggleSidebar}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                {isSidebarCollapsed ? (
                  <path d="M6 2.75A.75.75 0 016.75 2h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 016 2.75zm0 5A.75.75 0 016.75 7h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 016 7.75zm0 5A.75.75 0 016.75 12h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" />
                ) : (
                  <path d="M2.75 2a.75.75 0 000 1.5h10.5a.75.75 0 000-1.5H2.75zM2 7.75A.75.75 0 012.75 7h10.5a.75.75 0 010 1.5H2.75A.75.75 0 012 7.75zm0 5A.75.75 0 012.75 12h10.5a.75.75 0 010 1.5H2.75A.75.75 0 012 12.75z" />
                )}
              </svg>
            </button>
            <h2>{repoName}</h2>
            <div className="branch-selector">
              <button onClick={toggleBranchSelector} className="branch-button">
                <svg className="branch-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                  <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"></path>
                </svg>
                <span>{currentBranch}</span>
                <svg className="dropdown-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                  <path d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"></path>
                </svg>
              </button>
              {showBranchSelector && (
                <div className="branch-dropdown">
                  <ul>
                    {branches.map(branch => (
                      <li key={branch.commit.sha}>
                        <button 
                          onClick={() => changeBranch(branch.name)}
                          className={branch.name === currentBranch ? 'active' : ''}
                        >
                          <svg className="branch-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                            <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"></path>
                          </svg>
                          {branch.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {currentPath && <span className="path-indicator">/{currentPath}</span>}
          </div>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        
        <div className="repo-content-layout">
          <div className={`repo-content-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="content-navigation">
              {(currentPath || error) && (
                <button onClick={goBack} className="back-button">
                  <svg xmlns="http://www.w3.org/2000/svg" width="" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="arcs">
                  <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
                  </svg>
                  {!isSidebarCollapsed && <span>Back</span>}
                </button>
              )}
            </div>
            
            <div className="folder-contents">
              {loading ? (
                <div className="loading">Loading...</div>
              ) : error ? (
                <div className="error">
                  {error}
                  <button onClick={goBack} className="error-back-button">
                    Go back
                  </button>
                </div>
              ) : (
                <ul>
                  {contents.length === 0 ? (
                    <li className="empty-folder">This folder is empty</li>
                  ) : (
                    contents.map((item) => (
                      <li key={item.sha} className={`item ${item.type}`}>
                        <button onClick={() => handleItemClick(item)}>
                          {item.type === 'dir' ? (
                            <>
                              <svg className="icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                                <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z" />
                              </svg>
                              {!isSidebarCollapsed && (
                                <span>
                                  {item.name}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <svg className="icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                                <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25V1.75z" />
                              </svg>
                              {!isSidebarCollapsed && <span>{item.name}</span>}
                            </>
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
          
          <div className="content-display">
            {selectedFile ? (
              <div className="file-content">
                <h3>
                <button 
                  onClick={copyFileContent} 
                  className="copy-button"
                  title="Copy file contents"
                  aria-label="Copy file contents"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                    <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>
                    <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
                  </svg>
                </button>
                {selectedFile.name}
                </h3>
                {renderFileContent()}
              </div>
            ) : (
              <div className="empty-state">
                <p>Select a file to view its contents</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepoContentViewer;