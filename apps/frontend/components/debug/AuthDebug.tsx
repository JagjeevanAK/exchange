'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuthStatus {
  authenticated: boolean;
  user: { id: string; email: string } | null;
}

export const AuthDebug = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await api.checkAuth();
        setAuthStatus(status);
      } catch {
        setAuthStatus({ authenticated: false, user: null });
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
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

  if (isLoading) return <div>Loading auth status...</div>;

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 space-y-2">
      <h3 className="font-bold">Authentication Debug</h3>
      <div>
        <strong>Authenticated:</strong> {authStatus?.authenticated ? 'Yes' : 'No'}
      </div>
      <div>
        <strong>User:</strong> {authStatus?.user?.email || 'None'}
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
