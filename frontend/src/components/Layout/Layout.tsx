import React from 'react';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-dark-900">
      {user && <Header />}
      <main className={user ? 'pt-0' : ''}>
        {children}
      </main>
    </div>
  );
};

export default Layout;