import { useState } from 'react';

export default function TestLogin() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1';
      console.log('API URL:', apiUrl);
      
      const response = await fetch(`${apiUrl}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@campus.com',
          password: 'admin123'
        })
      });
      
      const data = await response.json();
      setResult(JSON.stringify({
        apiUrl,
        status: response.status,
        ok: response.ok,
        data: data
      }, null, 2));
    } catch (error) {
      setResult(`Error: ${error.message}\nStack: ${error.stack}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Test API Campus Backend</h1>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <strong>API URL:</strong> {import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Test credentials:</strong> admin@campus.com / admin123
          </p>
        </div>

        <button
          onClick={testLogin}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Login'}
        </button>

        {result && (
          <pre className="mt-4 p-4 bg-gray-50 rounded-lg overflow-auto text-sm">
            {result}
          </pre>
        )}
      </div>
    </div>
  );
}
