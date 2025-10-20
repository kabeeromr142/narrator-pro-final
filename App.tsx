import React, { useState, useEffect } from 'react';
import { Page, Project, Plan } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Create from './components/Create';
import Studio from './components/Studio';
import Library from './components/Library';
import Profile from './components/Profile';
import BottomTabBar from './components/BottomTabBar';
import Billing from './components/Billing';
import Marketplace from './components/Marketplace';
import { LogoIcon } from './components/icons';

const AgeGateModal: React.FC<{ onConfirm: () => void }> = ({ onConfirm }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm animate-fadeIn">
        <div className="bg-gray-900 border border-amber-500 rounded-lg shadow-2xl p-8 w-full max-w-md text-center">
            <LogoIcon className="w-20 h-20 mx-auto mb-4 animate-golden-pulse" />
            <h2 className="text-3xl font-bold text-amber-400">Welcome to Narrator Pro</h2>
            <p className="text-gray-300 mt-4">This platform is intended for users who are 18 years of age or older.</p>
            <p className="text-gray-400 mt-2">Please confirm you meet this requirement to continue.</p>
            <button
                onClick={onConfirm}
                className="mt-8 w-full bg-amber-500 text-black font-bold py-3 px-6 rounded-lg hover:bg-amber-400 transition-transform transform hover:scale-105 shadow-lg btn-glow"
            >
                I am 18 or older
            </button>
        </div>
    </div>
);

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.Dashboard);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectForStudio, setSelectedProjectForStudio] = useState<Project | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan>('Freemium');
  const [credits, setCredits] = useState(5);
  const [showAgeGate, setShowAgeGate] = useState(false);

  useEffect(() => {
    const ageConfirmed = localStorage.getItem('ageConfirmed');
    if (!ageConfirmed) {
      setShowAgeGate(true);
    }
  }, []);

  const handleAgeConfirm = () => {
    localStorage.setItem('ageConfirmed', 'true');
    setShowAgeGate(false);
  };
  
  const addProject = (project: Project) => {
    const newProject = { ...project, isListed: false };
    setProjects(prevProjects => [newProject, ...prevProjects]);
    if(currentPlan === 'Freemium'){
        setCredits(prev => Math.max(0, prev - 1));
    }
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prevProjects => prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSelectedProjectForStudio(updatedProject); // also update the selected project in studio
  };
  
  const updateProjectListing = (projectId: string, price: number | null) => {
    setProjects(prevProjects => prevProjects.map(p => {
        if (p.id === projectId) {
            return { ...p, isListed: price !== null, priceSol: price ?? undefined };
        }
        return p;
    }));
  };
  
  const handlePurchase = (projectId: string) => {
      // In a real app, this would involve a complex transaction.
      // Here, we'll just unlist the item to simulate a purchase.
      updateProjectListing(projectId, null);
  };

  const handleSelectProjectForStudio = (project: Project) => {
      setSelectedProjectForStudio(project);
      setActivePage(Page.Studio);
  };

  const handlePlanChange = (newPlan: Plan) => {
    setCurrentPlan(newPlan);
    if(newPlan === 'Pro') setCredits(50);
    if(newPlan === 'Alpha') setCredits(Infinity); // Represent unlimited
    if(newPlan === 'Freemium') setCredits(5);
    // If user downgrades from Alpha, move them off the marketplace page
    if (newPlan !== 'Alpha' && activePage === Page.Marketplace) {
        setActivePage(Page.Dashboard);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case Page.Dashboard:
        return <Dashboard projects={projects} setActivePage={setActivePage} credits={credits} currentPlan={currentPlan} selectProjectForStudio={handleSelectProjectForStudio} />;
      case Page.Create:
        return <Create addProject={addProject} credits={credits} currentPlan={currentPlan} setActivePage={setActivePage} />;
      case Page.Studio:
        return <Studio project={selectedProjectForStudio} updateProject={updateProject} />;
      case Page.Library:
        return <Library projects={projects} selectProjectForStudio={handleSelectProjectForStudio} updateProjectListing={updateProjectListing} />;
      case Page.Marketplace:
         if (currentPlan !== 'Alpha') {
            // Redirect to billing if not on Alpha plan
            return <Billing currentPlan={currentPlan} onPlanChange={handlePlanChange} />;
        }
        return <Marketplace projects={projects.filter(p => p.isListed)} onPurchase={handlePurchase} />;
      case Page.Profile:
        return <Profile currentPlan={currentPlan} setActivePage={setActivePage} />;
       case Page.Billing:
        return <Billing currentPlan={currentPlan} onPlanChange={handlePlanChange} />;
      default:
        return <Dashboard projects={projects} setActivePage={setActivePage} credits={credits} currentPlan={currentPlan} selectProjectForStudio={handleSelectProjectForStudio}/>;
    }
  };

  return (
    <div className="flex h-screen bg-black text-gray-200">
      {showAgeGate && <AgeGateModal onConfirm={handleAgeConfirm} />}
      <Sidebar activePage={activePage} setActivePage={setActivePage} currentPlan={currentPlan} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-20 md:pb-8">
        {renderPage()}
      </main>
      <BottomTabBar activePage={activePage} setActivePage={setActivePage} currentPlan={currentPlan} />
    </div>
  );
};

export default App;