
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-center">
        <h1 className="text-7xl font-logo text-indigo-400 animate-pulse">markit</h1>
        <p className="text-gray-400 mt-2">Loading your canvas...</p>
      </div>
    </div>
  );
};

export default SplashScreen;
