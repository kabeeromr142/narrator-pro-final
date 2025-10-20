import React from 'react';
import { Page, Project, Plan } from '../types';
import { CreateIcon } from './icons';

interface DashboardProps {
  projects: Project[];
  setActivePage: (page: Page) => void;
  credits: number;
  currentPlan: Plan;
  selectProjectForStudio: (project: Project) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg shadow-lg">
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-amber-400 truncate">{value}</p>
    </div>
);

const ProjectPreviewCard: React.FC<{ project: Project; onClick: () => void; }> = ({ project, onClick }) => (
    <div 
      onClick={onClick}
      className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 group shadow-lg cursor-pointer transition-transform transform hover:-translate-y-1 hover:shadow-amber-500/20"
    >
        <div className="w-full h-40 bg-black flex items-center justify-center">
            <video src={project.videoUrl} className="w-full h-full object-cover" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()}/>
        </div>
        <div className="p-4">
            <h3 className="font-bold text-lg truncate text-white">{project.name}</h3>
            <p className="text-sm text-gray-400">{project.createdAt}</p>
            <p className="text-xs text-amber-400/80 font-mono truncate mt-1" title={project.copyrightTokenId}>
                {project.copyrightTokenId}
            </p>
        </div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ projects, setActivePage, credits, currentPlan, selectProjectForStudio }) => {
  const recentProjects = projects.slice(0, 3);
  
  const getCreditsDisplay = () => {
    if (currentPlan === 'Alpha') return 'Unlimited';
    return credits;
  }
  
  const lastProjectName = projects.length > 0 ? projects[0].name : 'N/A';
    
  return (
    <div className="space-y-8 animate-fadeIn">
        <header>
            <h1 className="text-4xl font-black text-white">Dashboard</h1>
            <p className="text-gray-400">Welcome back, Creator.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Remaining Credits" value={getCreditsDisplay()} />
            <StatCard title="Total Creations" value={projects.length} />
            <StatCard title="Last Project" value={lastProjectName} />
        </section>

        <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Recent Projects</h2>
                <button 
                  onClick={() => setActivePage(Page.Library)}
                  className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                >
                  View All
                </button>
            </div>
            {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recentProjects.map(p => <ProjectPreviewCard key={p.id} project={p} onClick={() => selectProjectForStudio(p)} />)}
                </div>
            ) : (
                <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-lg">
                    <h3 className="text-xl font-semibold text-white">No projects yet.</h3>
                    <p className="text-gray-400 mt-2">Ready to create something amazing?</p>
                </div>
            )}
        </section>
        
        <section className="text-center">
            <button 
                onClick={() => setActivePage(Page.Create)}
                className="bg-amber-500 text-black font-bold py-3 px-8 rounded-lg hover:bg-amber-400 transition-all transform hover:scale-105 shadow-lg btn-glow inline-flex items-center gap-2"
            >
                <CreateIcon className="w-6 h-6" />
                <span>Create New Project</span>
            </button>
        </section>
    </div>
  );
};

export default Dashboard;