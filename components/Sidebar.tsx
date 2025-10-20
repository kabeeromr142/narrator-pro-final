import React from 'react';
import { Page, Plan } from '../types';
import { DashboardIcon, CreateIcon, StudioIcon, LibraryIcon, ProfileIcon, LogoIcon, MarketplaceIcon } from './icons';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  currentPlan: Plan;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  const activeClasses = 'bg-gray-800 text-amber-400 border-r-4 border-amber-400';
  const inactiveClasses = 'text-gray-400 hover:bg-gray-800 hover:text-amber-400';
  
  return (
    <li
      onClick={onClick}
      className={`flex items-center p-4 cursor-pointer transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
    >
      {icon}
      <span className="ml-4 font-semibold hidden md:block">{label}</span>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, currentPlan }) => {
  const navItems = [
    { page: Page.Dashboard, label: 'Dashboard', icon: <DashboardIcon className="w-6 h-6" /> },
    { page: Page.Create, label: 'Create', icon: <CreateIcon className="w-6 h-6" /> },
    { page: Page.Studio, label: 'Studio', icon: <StudioIcon className="w-6 h-6" /> },
    { page: Page.Library, label: 'Library', icon: <LibraryIcon className="w-6 h-6" /> },
    ...(currentPlan === 'Alpha' ? [{ page: Page.Marketplace, label: 'Marketplace', icon: <MarketplaceIcon className="w-6 h-6" /> }] : []),
    { page: Page.Profile, label: 'Profile', icon: <ProfileIcon className="w-6 h-6" /> },
  ];

  return (
    <nav className="hidden md:flex w-64 bg-black border-r border-gray-800 flex-col justify-between">
      <div>
        <div className="flex items-center justify-start p-4 border-b border-gray-800">
          <LogoIcon className="w-10 h-10 animate-golden-pulse" />
          <h1 className="text-xl font-black ml-2 text-amber-400">Narrator Pro</h1>
        </div>
        <ul>
          {navItems.map(item => (
            <NavItem
              key={item.page}
              icon={item.icon}
              label={item.label}
              isActive={activePage === item.page}
              onClick={() => setActivePage(item.page)}
            />
          ))}
        </ul>
      </div>
       <div className="p-4 border-t border-gray-800 text-center">
         <p className="text-xs text-gray-500">&copy; 2024 Narrator Pro. All rights reserved.</p>
      </div>
    </nav>
  );
};

export default Sidebar;
