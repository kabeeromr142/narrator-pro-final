import React, { useState } from 'react';
import { Plan, Invoice } from '../types';

interface BillingProps {
    currentPlan: Plan;
    onPlanChange: (plan: Plan) => void;
}

const planDetails = {
    Freemium: {
        price: '$0',
        period: '/ forever',
        features: ['5 Free Low-Res Generations', 'Standard Quality (720p)', 'C2PA Watermark'],
        cta: 'Your Current Plan',
        style: 'border-gray-700',
    },
    Pro: {
        price: '$19',
        period: '/ month',
        features: ['50 Credits/Month', 'High Quality (1080p)', 'No Watermark', 'Priority Support'],
        cta: 'Upgrade to Pro',
        style: 'border-gray-500',
    },
    Alpha: {
        price: '$99',
        period: '/ month',
        features: ['Unlimited 4K Generations', 'Token Marketplace Access', 'Royalty Auto-Payouts', 'Dedicated Support'],
        cta: 'Upgrade to Alpha',
        style: 'border-amber-500',
    }
}

const mockInvoices: Invoice[] = [
    { id: 'inv_1', date: 'Oct 1, 2024', amount: '$19.00', status: 'Paid', pdfUrl: '#' },
    { id: 'inv_2', date: 'Sep 1, 2024', amount: '$19.00', status: 'Paid', pdfUrl: '#' },
    { id: 'inv_3', date: 'Aug 1, 2024', amount: '$19.00', status: 'Paid', pdfUrl: '#' },
];

const Billing: React.FC<BillingProps> = ({ currentPlan, onPlanChange }) => {
    const [isLoading, setIsLoading] = useState<Plan | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Hardcoded user ID as per Profile component for the simulation
    const MOCK_USER_ID = 'np-usr-c12e3f4a-5b6c-7d8e-9f0a-1b2c3d4e5f67';

    const handleSelectPlan = async (plan: Plan) => {
        if (plan === currentPlan || isLoading) return;
        
        setIsLoading(plan);
        setError(null);

        try {
            // NOTE: In a real app, this URL would come from a config/env file.
            // This endpoint is based on the user-provided FastAPI snippet.
            const response = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    user_id: MOCK_USER_ID, 
                    plan: plan.toLowerCase(), // Backend expects "pro" or "alpha"
                    success_url: window.location.href, // Redirect back to this page on success
                    cancel_url: window.location.href,  // Or a dedicated cancel page
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to initialize payment.');
            }

            const { url } = await response.json();
            if (url) {
                // Redirect user to Stripe's secure checkout page
                window.location.href = url;
            } else {
                throw new Error('Could not retrieve checkout URL.');
            }

        } catch (e) {
            const err = e as Error;
            console.error('Stripe checkout error:', err);
            setError(err.message || 'An unexpected error occurred. Please try again.');
            setIsLoading(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <header className="mb-8">
                <h1 className="text-4xl font-black text-white">Subscription & Billing</h1>
                <p className="text-gray-400">Manage your plan and view your billing history.</p>
            </header>

            {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg mb-6 flex justify-between items-center animate-fadeIn">
                    <span><strong>Error:</strong> {error}</span>
                    <button onClick={() => setError(null)} className="bg-red-500/50 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center">&times;</button>
                </div>
            )}

            {/* Subscription Plans */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {Object.keys(planDetails).map(planKey => {
                    const plan = planDetails[planKey as Plan];
                    const isCurrent = currentPlan === planKey;
                    const isProcessing = isLoading === planKey;

                    return (
                        <div key={planKey} className={`bg-gray-900 border-2 rounded-lg p-6 flex flex-col shadow-lg ${isCurrent ? plan.style + ' ring-4 ring-amber-500/50' : plan.style}`}>
                            <h2 className={`text-2xl font-bold ${isCurrent ? 'text-amber-400' : 'text-white'}`}>{planKey}</h2>
                            <p className="mt-2">
                                <span className="text-4xl font-black text-white">{plan.price}</span>
                                <span className="text-gray-400">{plan.period}</span>
                            </p>
                            <ul className="mt-6 space-y-3 text-gray-300 flex-grow">
                                {plan.features.map(feat => (
                                    <li key={feat} className="flex items-start">
                                        <span className="text-green-400 mr-2">✓</span> {feat}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => handleSelectPlan(planKey as Plan)}
                                disabled={isCurrent || !!isLoading}
                                className={`w-full mt-8 font-bold py-3 px-4 rounded-lg transition-colors duration-200 ${
                                    isCurrent ? 'bg-gray-700 text-gray-400 cursor-default' : 
                                    isProcessing ? 'bg-amber-700 text-white animate-pulse' :
                                    'bg-amber-500 text-black hover:bg-amber-400 disabled:bg-gray-600'
                                }`}
                            >
                                {isProcessing ? 'Redirecting...' : (isCurrent ? 'Current Plan' : plan.cta)}
                            </button>
                        </div>
                    );
                })}
            </section>
            
            {/* Billing History */}
            <section>
                 <h2 className="text-3xl font-bold text-white mb-4">Billing History</h2>
                 <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                    <table className="min-w-full">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Invoice</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {mockInvoices.map(invoice => (
                                <tr key={invoice.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{invoice.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{invoice.amount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${invoice.status === 'Paid' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <a href={invoice.pdfUrl} className="text-amber-400 hover:text-amber-300">Download</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </section>
        </div>
    );
};

export default Billing;
