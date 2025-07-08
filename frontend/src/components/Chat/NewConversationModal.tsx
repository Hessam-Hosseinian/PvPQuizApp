import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { User } from '../../types';
import Modal from '../UI/Modal';
import LoadingSpinner from '../UI/LoadingSpinner';
import Avatar from '../UI/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { X } from 'lucide-react';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

const NewConversationModal: React.FC<NewConversationModalProps> = ({ isOpen, onClose, onSelectUser }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          setLoading(true);
          const response = await usersAPI.getUsers();
          // Filter out the current user from the list
          setUsers(response.data.filter((user: User) => user.id !== currentUser?.id));
          setError(null);
        } catch (err) {
          setError('Failed to fetch users.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchUsers();
    }
  }, [isOpen, currentUser?.id]);

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="bg-dark-800 rounded-lg shadow-xl flex flex-col h-[60vh]">
        <header className="flex justify-between items-center p-4 border-b border-dark-700">
          <h2 className="text-xl font-bold text-white">Start a new conversation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </header>

        <div className="p-4">
          <input
            type="text"
            placeholder="Search for a user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex-1 px-4 pb-4 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : (
            <ul>
              {filteredUsers.map(user => (
                <li
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className="flex items-center p-3 hover:bg-dark-700 rounded-md cursor-pointer transition-colors"
                >
                  <Avatar src={user.avatar} alt={user.username} size="md" />
                  <span className="ml-4 font-semibold text-white">{user.username}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NewConversationModal; 