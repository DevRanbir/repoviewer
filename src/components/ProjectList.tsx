import React, { useEffect, useState, useRef, useMemo } from 'react';
import { animate } from 'animejs';
import ProjectCard from './ProjectCard';
import { 
  fetchUserRepositories, 
  checkRepoContents, 
  Repository, 
  detectProgrammingLanguages,
  checkForPackageJson
} from '../services/github';
import './ProjectList.css';

interface Project extends Repository {
  hasHtmlFile: boolean;
  primaryLanguage?: string;
  hasPackageJson: boolean;
  packageJsonHomepage: string | null;
}

interface ProjectListProps {
  username: string;
}

const ProjectList: React.FC<ProjectListProps> = ({ username }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const projectsRef = useRef<HTMLDivElement>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Get unique languages from projects
  const languages = useMemo(() => {
    const langSet = new Set<string>();
    projects.forEach(project => {
      if (project.language) {
        langSet.add(project.language);
      }
      if (project.primaryLanguage && project.primaryLanguage !== project.language) {
        langSet.add(project.primaryLanguage);
      }
    });
    return ['all', ...Array.from(langSet)].filter(Boolean);
  }, [projects]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch repositories
        const repos = await fetchUserRepositories(username);
        
        // Filter out repos with the same name as username (case-insensitive)
        const filteredRepos = repos.filter((repo: Repository) => 
          repo.name.toLowerCase() !== username.toLowerCase()
        );
        
        // Process repositories with additional information
        const enhancedRepos = await Promise.all(
          filteredRepos.map(async (repo: Repository) => {
            try {
              // Check for HTML files, languages, and package.json in parallel
              const [hasHtml, primaryLanguage, packageJsonInfo] = await Promise.all([
                checkRepoContents(username, repo.name),
                detectProgrammingLanguages(username, repo.name),
                checkForPackageJson(username, repo.name)
              ]);
              
              return {
                ...repo,
                hasHtmlFile: hasHtml,
                primaryLanguage: primaryLanguage || repo.language || 'Unknown',
                hasPackageJson: packageJsonInfo.hasPackageJson,
                packageJsonHomepage: packageJsonInfo.packageJsonHomepage
              };
            } catch (err) {
              console.warn(`Error processing repo ${repo.name}:`, err);
              return {
                ...repo,
                hasHtmlFile: false,
                primaryLanguage: repo.language || 'Unknown',
                hasPackageJson: false,
                packageJsonHomepage: null
              };
            }
          })
        );
        
        // Sort projects: pinned/featured first, then by last updated
        const sortedRepos = enhancedRepos.sort((a, b) => {
          // Check for pinned or featured topics
          const aFeatured = a.topics?.some(t => 
            t.includes('featured') || t.includes('portfolio') || t.includes('pinned')
          ) || false;
          
          const bFeatured = b.topics?.some(t => 
            t.includes('featured') || t.includes('portfolio') || t.includes('pinned')
          ) || false;
          
          if (aFeatured && !bFeatured) return -1;
          if (!aFeatured && bFeatured) return 1;
          
          // If both are featured or both are not, sort by last updated
          return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime();
        });
        
        setProjects(sortedRepos);
      } catch (err) {
        console.error('Error loading projects:', err);
        setError('Failed to load projects. GitHub API may be rate limited or unavailable.');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [username, retryCount]);

  // Filter projects based on language and search term
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesLanguage = 
        filter === 'all' || 
        project.language === filter || 
        project.primaryLanguage === filter;
      
      const matchesSearch = 
        !searchTerm || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (project.description && 
          project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (project.topics && 
          project.topics.some(topic => 
            topic.toLowerCase().includes(searchTerm.toLowerCase())
          ));
      
      return matchesLanguage && matchesSearch;
    });
  }, [projects, filter, searchTerm]);

  useEffect(() => {
    if (!loading && filteredProjects.length > 0 && projectsRef.current) {
      // Animate cards whenever filtered projects change
      animate('.project-card', {
        opacity: [0, 1],
        translateY: [20, 0],
        delay: function(el, i) {
          return i * 80; // Faster animation for better UX
        },
        easing: 'easeOutExpo',
        duration: 600
      });
    }
  }, [loading, filteredProjects]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="projects-loading">
        <div className="loading-wave">
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p>Loading projects for {username}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="projects-error">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>{error}</p>
        <p className="error-hint">You may need to provide a GitHub token if you're experiencing rate limiting</p>
        <button onClick={handleRetry} className="retry-button">Try Again</button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="projects-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          <line x1="12" y1="11" x2="12" y2="17"></line>
          <line x1="9" y1="14" x2="15" y2="14"></line>
        </svg>
        <p>No public repositories found for {username}.</p>
      </div>
    );
  }

  return (
    <div className="projects-container" ref={projectsRef}>
      <div className="projects-header">
        <div className="projects-search">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <div className="language-filter">
            {languages.map((lang) => (
              <button
                key={lang}
                className={`lang-btn ${filter === lang ? 'active' : ''}`}
                onClick={() => setFilter(lang)}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
        <div className="projects-stats">
          <span>{filteredProjects.length} of {projects.length} repositories</span>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="no-matches">
          <p>No projects match your current filters</p>
          <button onClick={() => { setFilter('all'); setSearchTerm(''); }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            // In the ProjectList component where ProjectCard is rendered:
            <ProjectCard
              key={project.id}
              name={project.name}
              description={project.description || 'No description available'}
              language={project.language || project.primaryLanguage || 'Unknown'}
              htmlUrl={project.html_url}
              homepage={project.homepage || undefined}
              topics={project.topics || []}
              username={username}
              hasHtmlFile={project.hasHtmlFile}
              updatedAt={project.updated_at}
              stargazers={project.stargazers_count}
              forks={project.forks_count}
              hasPackageJson={project.hasPackageJson}
              packageJsonHomepage={project.packageJsonHomepage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;