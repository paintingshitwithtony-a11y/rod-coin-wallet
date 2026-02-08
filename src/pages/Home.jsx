import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Home() {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    // Catch all errors
    const errorHandler = (event) => {
      console.error('ERROR:', event.message, event.stack);
      setErrors(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: event.message,
        stack: event.stack
      }]);
    };

    const rejectionHandler = (event) => {
      console.error('UNHANDLED REJECTION:', event.reason);
      setErrors(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: 'UNHANDLED REJECTION: ' + event.reason,
        stack: ''
      }]);
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  if (errors.length > 0) {
    return (
      <div style={{
        background: '#000',
        color: '#ff4444',
        padding: '20px',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxHeight: '100vh',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
      }}>
        <h1 style={{ color: '#ff6666', marginBottom: '20px' }}>ERRORS DETECTED:</h1>
        {errors.map((err, i) => (
          <div key={i} style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
            <strong>{err.time}</strong><br/>
            {err.message}<br/>
            {err.stack}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-white">ROD Wallet</h1>
        <p className="text-slate-400">Welcome to your secure wallet</p>
        <Link to={createPageUrl('Wallet')} className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
          Open Wallet
        </Link>
      </div>
    </div>
  );
}