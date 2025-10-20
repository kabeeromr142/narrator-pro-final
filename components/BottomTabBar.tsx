import React from 'react';
import { Page, Plan } from '../types';
import { DashboardIcon, CreateIcon, StudioIcon, LibraryIcon, ProfileIcon, MarketplaceIcon } from './icons';

interface BottomTabBarProps {
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
  const activeClasses = 'text-amber-400';
  const inactiveClasses = 'text-gray-400';
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};


const BottomTabBar: React.FC<BottomTabBarProps> = ({ activePage, setActivePage, currentPlan }) => {
  const navItems = [
    { page: Page.Dashboard, label: 'Dashboard', icon: <DashboardIcon className="w-6 h-6" /> },
    { page: Page.Create, label: 'Create', icon: <CreateIcon className="w-6 h-6" /> },
    { page: Page.Studio, label: 'Studio', icon: <StudioIcon className="w-6 h-6" /> },
    { page: Page.Library, label: 'Library', icon: <LibraryIcon className="w-6 h-6" /> },
    ...(currentPlan === 'Alpha' ? [{ page: Page.Marketplace, label: 'Marketplace', icon: <MarketplaceIcon className="w-6 h-6" /> }] : []),
    { page: Page.Profile, label: 'Profile', icon: <ProfileIcon className="w-6 h-6" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex justify-around z-50">
      {navItems.map(item => (
        <NavItem
          key={item.page}
          icon={item.icon}
          label={item.label}
          isActive={activePage === item.page}
          onClick={() => setActivePage(item.page)}
        />
      ))}
    </nav>
  );
};

export default BottomTabBar;
