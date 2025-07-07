import React, { useEffect } from 'react';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { socket } from '../../services/socket';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      socket.connect();
      
      // Optional: Listen for connection and disconnection events for debugging
      socket.on('connect', () => {
        console.log('Socket connected successfully:', socket.id);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected.');
      });

    } else {
        socket.disconnect();
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [user]);

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