import React, { useEffect } from 'react';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { chatSocket } from '../../services/socket';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      chatSocket.connect();
      
      // Optional: Listen for connection and disconnection events for debugging
      chatSocket.on('connect', () => {
        console.log('Chat socket connected successfully:', chatSocket.id);
      });

      chatSocket.on('disconnect', () => {
        console.log('Chat socket disconnected.');
      });

    } else {
        chatSocket.disconnect();
    }

    return () => {
      chatSocket.off('connect');
      chatSocket.off('disconnect');
      chatSocket.disconnect();
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