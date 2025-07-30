import axios from 'axios';


export interface Repository {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
}

export interface RepoContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink';
  size: number;
  download_url: string | null;
}

const GITHUB_API_BASE = 'https://api.github.com';

// Function to get GitHub token from environment or local storage
export const getGitHubToken = (): string | null => {
  // Check for environment variable in a type-safe way
  const envToken = typeof process !== 'undefined' && process.env?.REACT_APP_GITHUB_TOKEN
    ? process.env.REACT_APP_GITHUB_TOKEN
    : null;
  
  return envToken || localStorage.getItem('github_token');
};

// Function to set GitHub token in local storage
export const setGitHubToken = (token: string): void => {
  localStorage.setItem('github_token', token);
};

// Function to create headers with current token
export const createHeaders = (): Record<string, string> => {
  const token = getGitHubToken();
  return token
    ? {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    : {
        'Accept': 'application/vnd.github.v3+json'
      };
};

// Helper function to handle API response errors
export const handleApiError = (response: Response): void => {
  if (response.status === 401 || response.status === 403) {
    // Check if we already have a token before prompting
    const existingToken = getGitHubToken();
    
    if (existingToken) {
      // If we already have a token and still getting auth errors, it's likely invalid
      console.warn('Existing GitHub token appears to be invalid or has insufficient permissions');
      localStorage.removeItem('github_token');
    }
    
    // Now check again if we have a token in environment variables before prompting
    const envToken = typeof process !== 'undefined' && process.env?.REACT_APP_GITHUB_TOKEN;
    if (envToken) {
      console.warn('Environment token exists but may have insufficient permissions');
      // Don't prompt if we have an env token - it can't be changed by the user
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    // Prompt for new token only if we don't have one or the existing one is invalid
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
    }
  }
  
  throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
};

export const checkForPackageJson = async (username: string, repoName: string): Promise<{ hasPackageJson: boolean, packageJsonHomepage: string | null }> => {
  try {
    // First, fetch all branches
    const branchesResponse = await fetch(
      `${GITHUB_API_BASE}/repos/${username}/${repoName}/branches`,
      { headers: createHeaders() }
    );
    
    if (!branchesResponse.ok) {
      throw new Error(`Failed to fetch branches: ${branchesResponse.status}`);
    }
    
    const branches = await branchesResponse.json();
    
    // Check package.json in each branch
    for (const branch of branches) {
      try {
        const response = await fetch(
          `${GITHUB_API_BASE}/repos/${username}/${repoName}/contents/package.json?ref=${branch.name}`,
          { headers: createHeaders() }
        );
        
        if (response.ok) {
          const data = await response.json();
          const content = JSON.parse(atob(data.content));
          
          if (content.homepage) {
            return {
              hasPackageJson: true,
              packageJsonHomepage: content.homepage.trim().replace(/`/g, '')
            };
          }
        }
      } catch (branchError) {
        console.warn(`Error checking package.json in branch ${branch.name}:`, branchError);
        // Continue checking other branches
      }
    }
    
    // If we've checked all branches and found nothing
    return {
      hasPackageJson: false,
      packageJsonHomepage: null
    };
    
  } catch (error) {
    console.warn('Error checking for package.json:', error);
    return {
      hasPackageJson: false,
      packageJsonHomepage: null
    };
  }
};

export const fetchUserRepositories = async (username: string): Promise<Repository[]> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=100`, {
      headers: createHeaders()
    });
    
    if (!response.ok) {
      handleApiError(response);
      
      if (response.status === 401 || response.status === 403) {
        return fetchUserRepositories(username);
      }
      
      return [];
    }
    
    const repos = await response.json() as Repository[];
    return repos;
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw error;
  }
};

/**
 * Get details for a specific repository
 */
// Update the getRepositoryDetails function's error handling
export const getRepositoryDetails = async (
  username: string, 
  repoName: string
): Promise<Repository | null> => {
  try {
    const response = await axios.get<Repository>(
      `${GITHUB_API_BASE}/repos/${username}/${repoName}`,
      { headers: createHeaders() }
    );
    
    return response.data;
  } catch (error) {
    
    // Handle other errors
    console.error('Error fetching repository details:', error);
    return null;
  }
};

export const checkRepoContents = async (username: string, repoName: string): Promise<boolean> => {
  try {
    // First check for index.html in root
    const rootResponse = await fetch(
      `${GITHUB_API_BASE}/repos/${username}/${repoName}/contents/index.html`,
      { headers: createHeaders() }
    );
    
    if (rootResponse.ok) {
      return true;
    }
    
    // If no index.html in root, check all files for HTML extension
    const contentsResponse = await fetch(
      `${GITHUB_API_BASE}/repos/${username}/${repoName}/contents`,
      { headers: createHeaders() }
    );
    
    if (!contentsResponse.ok) {
      return false;
    }
    
    const contents = await contentsResponse.json() as RepoContentItem[];
    
    // Check if any file has .html extension
    return contents.some((item) => 
      item.type === 'file' && item.name.toLowerCase().endsWith('.html')
    );
  } catch (error) {
    console.error(`Error checking repo ${repoName} contents:`, error);
    return false;
  }
};

// Function to fetch repository contents at a path
export const fetchRepoContents = async (
  username: string, 
  repoName: string, 
  path: string = ''
): Promise<RepoContentItem[]> => {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${username}/${repoName}/contents/${path}`,
      { headers: createHeaders() }
    );
    
    if (!response.ok) {
      handleApiError(response);
      return []; // Fallback empty array
    }
    
    const contents = await response.json() as RepoContentItem[] | RepoContentItem;
    
    // GitHub API returns either an array or a single object depending on if path is a directory or file
    return Array.isArray(contents) ? contents : [contents];
  } catch (error) {
    console.error('Error fetching repository contents:', error);
    throw error;
  }
};

// Detect what programming language files are in a repo to determine terminal behavior
export const detectProgrammingLanguages = async (
  username: string, 
  repoName: string
): Promise<string> => {
  try {
    const contents = await fetchRepoContents(username, repoName);
    
    const fileExtensions = contents
      .filter((item) => item.type === 'file')
      .map((file) => {
        const parts = file.name.split('.');
        return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
      })
      .filter((ext): ext is string => ext !== null);
    
    const languageMap: Record<string, string> = {
      'py': 'Python',
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'JavaScript',
      'tsx': 'TypeScript',
      'html': 'HTML',
      'css': 'CSS',
      'cpp': 'C++',
      'c': 'C',
      'h': 'C',
      'hpp': 'C++',
      'java': 'Java',
      'rs': 'Rust',
      'go': 'Golang',
      'rb': 'Ruby',
      'php': 'PHP',
      'cs': 'C#',
      'swift': 'Swift',
      'kt': 'Kotlin'
    };
    
    // Count occurrences of each language
    const languageCounts: Record<string, number> = {};
    
    fileExtensions.forEach((ext) => {
      const language = languageMap[ext];
      if (language) {
        languageCounts[language] = (languageCounts[language] || 0) + 1;
      }
    });
    
    // Find the most common language
    let primaryLanguage = '';
    let maxCount = 0;
    
    Object.entries(languageCounts).forEach(([language, count]) => {
      if (count > maxCount) {
        primaryLanguage = language;
        maxCount = count;
      }
    });
    
    return primaryLanguage;
  } catch (error) {
    console.error('Error detecting programming languages:', error);
    return '';
  }
};

