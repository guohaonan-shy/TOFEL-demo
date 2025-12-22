import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, BookOpen, BarChart2, LogOut } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface NavItemProps {
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, active, disabled, onClick }) => (
  <button 
    disabled={disabled}
    onClick={onClick}
    className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 ${
      disabled 
        ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed opacity-40' 
        : active 
          ? 'bg-gray-800 text-blue-400 border border-gray-700' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
    }`}
  >
    {icon}
  </button>
);

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  
  return (
    <div className="w-20 bg-gray-900 flex flex-col items-center py-8 z-30 h-screen fixed left-0 top-0 border-r border-gray-800">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-10 shadow-lg shadow-blue-500/30">
        <span className="text-white font-bold text-xl">T</span>
      </div>
      <nav className="flex-1 flex flex-col gap-6 w-full px-2">
        <NavItem icon={<Home size={20} />} disabled />
        <NavItem icon={<BookOpen size={20} />} active />
        <NavItem icon={<BarChart2 size={20} />} disabled />
      </nav>
      <div className="mt-auto pb-4 px-2 w-full">
        <button
          onClick={handleSignOut}
          className="w-full aspect-square rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-all duration-200"
          title="Sign out"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
