"use client"

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuthStatus {
    hasToken: boolean;
    token: string | null;
    isExpired: boolean | null;
}

export const AuthDebug = () => {
    const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
    const [testResult, setTestResult] = useState<string>('');

    useEffect(() => {
        const status = api.checkAuthStatus();
        setAuthStatus(status);
    }, []);

    const testApiCall = async () => {
        try {
            setTestResult('Testing...');
            const result = await api.getLatestCandle('BTC', '1m');
            setTestResult(`Success: ${JSON.stringify(result)}`);
        } catch (error) {
            setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    if (!authStatus) return <div>Loading auth status...</div>;

    return (
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 space-y-2">
            <h3 className="font-bold">Authentication Debug</h3>
            <div>
                <strong>Has Token:</strong> {authStatus.hasToken ? 'Yes' : 'No'}
            </div>
            <div>
                <strong>Token Preview:</strong> {authStatus.token || 'None'}
            </div>
            <div>
                <strong>Is Expired:</strong> {authStatus.isExpired === null ? 'N/A' : authStatus.isExpired ? 'Yes' : 'No'}
            </div>
            <button 
                onClick={testApiCall}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Test API Call
            </button>
            {testResult && (
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                    <strong>Test Result:</strong> <br />
                    <pre className="whitespace-pre-wrap">{testResult}</pre>
                </div>
            )}
        </div>
    );
};
