'use client';

import { useUser } from '@/hooks/useUser';
import { useEffect, useState } from 'react';

export default function UserStorageTest() {
  const { user, loading, logout } = useUser();
  const [storageData, setStorageData] = useState<any>(null);

  useEffect(() => {
    // Check localStorage data
    const checkStorage = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('secure_place_user_session');
        if (stored) {
          try {
            setStorageData(JSON.parse(stored));
          } catch (e) {
            setStorageData({ error: 'Invalid JSON in storage' });
          }
        } else {
          setStorageData(null);
        }
      }
    };

    checkStorage();
    // Check storage every second for demo purposes
    const interval = setInterval(checkStorage, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const clearStorage = () => {
    localStorage.removeItem('secure_place_user_session');
    setStorageData(null);
  };

  if (loading) {
    return <div className="p-8">Loading user data...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔐 User localStorage Test</h1>
      
      {/* Current User State */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">Current User State (from useUser hook)</h2>
        {user ? (
          <div className="space-y-2">
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Full Name:</strong> {user.fullName}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Firm ID:</strong> {user.firmId || 'null'}</p>
          </div>
        ) : (
          <p className="text-red-600">No user logged in</p>
        )}
      </div>

      {/* localStorage Data */}
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">localStorage Data</h2>
        {storageData ? (
          <div className="space-y-2">
            <p><strong>Storage Key:</strong> secure_place_user_session</p>
            <p><strong>Timestamp:</strong> {new Date(storageData.timestamp).toLocaleString()}</p>
            <p><strong>Expires At:</strong> {new Date(storageData.expiresAt).toLocaleString()}</p>
            <div className="mt-3">
              <p><strong>User Data:</strong></p>
              <pre className="bg-white p-2 rounded text-sm overflow-auto">
                {JSON.stringify(storageData.user, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-orange-600">No data in localStorage</p>
        )}
      </div>

      {/* Test Actions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Test Actions</h2>
        <div className="space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            🔄 Refresh Page
          </button>
          
          <button
            onClick={clearStorage}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            🗑️ Clear Storage
          </button>
          
          {user && (
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              🚪 Logout
            </button>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 p-4 rounded-lg mt-6">
        <h3 className="text-lg font-semibold mb-2">🧪 Testing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>After login, user data should appear in both sections</li>
          <li>Click "Refresh Page" - data should persist</li>
          <li>Check browser DevTools → Application → Local Storage</li>
          <li>Click "Clear Storage" to manually remove data</li>
          <li>Click "Logout" to test proper cleanup</li>
        </ol>
      </div>
    </div>
  );
}