
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../services/firebase';
import { HomeIcon, UserCircleIcon, LogoutIcon } from './icons';

interface LayoutProps {
  children: React.ReactNode;
}

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/auth');
    };

    const navItems = [
        { path: '/', icon: <HomeIcon />, name: 'Dashboard' },
        { path: '/profile', icon: <UserCircleIcon />, name: 'Profile' },
    ];

    return (
        <div className="w-64 bg-gray-900/80 backdrop-blur-sm border-r border-gray-700 flex flex-col p-4 text-white">
            <div className="flex items-center mb-10 p-2">
                <span className="text-3xl font-logo text-indigo-400">markit</span>
            </div>
            <nav className="flex-grow">
                <ul>
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <li key={item.name}>
                                <Link to={item.path} className={`flex items-center p-3 my-2 rounded-lg transition-colors ${isActive ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                                    {item.icon}
                                    <span className="ml-4">{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <div>
                <button onClick={handleLogout} className="flex items-center w-full p-3 my-2 rounded-lg transition-colors text-gray-400 hover:bg-red-500/20 hover:text-red-400">
                    <LogoutIcon />
                    <span className="ml-4">Logout</span>
                </button>
            </div>
        </div>
    );
};


const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-800 text-white">
      <Sidebar />
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">{children}</main>
    </div>
  );
};

export default Layout;
