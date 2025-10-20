import React from 'react';
import { Plan, Page } from '../types';

interface ProfileProps {
    currentPlan: Plan;
    setActivePage: (page: Page) => void;
}

const Profile: React.FC<ProfileProps> = ({ currentPlan, setActivePage }) => {
    const user = {
        name: 'Sultan',
        email: 'sultan@narrator.pro',
        uid: 'np-usr-c12e3f4a-5b6c-7d8e-9f0a-1b2c3d4e5f67'
    };

    return (
        <div className="max-w-2xl mx-auto">
            <header className="mb-8">
                <h1 className="text-4xl font-black text-white">Profile & Settings</h1>
                <p className="text-gray-400">Manage your account and preferences.</p>
            </header>

            <div className="space-y-6 bg-gray-900 border border-gray-800 p-8 rounded-lg">
                <div className="flex items-center space-x-4">
                     <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center">
                        <span className="text-4xl font-black text-black">S</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                        <p className="text-gray-400">{user.email}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400">Email Address</label>
                    <input 
                        type="email"
                        readOnly
                        value={user.email}
                        className="w-full mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400">User ID (UID)</label>
                    <input 
                        type="text"
                        readOnly
                        value={user.uid}
                        className="w-full mt-1 p-3 bg-gray-800 border border-amber-500 ring-2 ring-amber-500/30 rounded-lg font-mono text-gray-300"
                    />
                    <p className="text-xs text-gray-500 mt-1">This ID is used to verify ownership of your creations.</p>
                </div>

                <div className="flex justify-between items-center bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Current Plan</label>
                         <p className="text-lg font-bold py-1 px-3 rounded-full bg-amber-500/10 text-amber-400 inline-block mt-1">{currentPlan}</p>
                    </div>
                    <button 
                        onClick={() => setActivePage(Page.Billing)}
                        className="text-sm font-semibold text-black bg-amber-500 px-4 py-2 rounded-lg hover:bg-amber-400 transition"
                    >
                        Manage Subscription
                    </button>
                </div>

                 <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-400">Language</label>
                    <select id="language" name="language" className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-800 border-gray-700 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md text-white">
                        <option>English</option>
                        <option selected>Malayalam</option>
                        <option>Arabic</option>
                    </select>
                </div>

                <div className="border-t border-gray-800 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Security</h3>
                    <button className="w-full md:w-auto bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition">
                        Change Password
                    </button>
                     <p className="text-xs text-gray-500 mt-2">Two-Factor Authentication is currently <span className="text-green-400">Enabled</span>.</p>
                </div>
            </div>
        </div>
    );
};

export default Profile;