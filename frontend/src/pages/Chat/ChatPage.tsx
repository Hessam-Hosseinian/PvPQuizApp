import React, { useState, useEffect, useCallback } from 'react';
import { chatAPI } from '../../services/api';
import { ChatRoom, Conversation, User } from '../../types';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { MessageSquare, PlusCircle, Users, Mail, MessageSquarePlus } from 'lucide-react';
import ChatRoomModal from '../../components/Chat/ChatRoomModal';
import Avatar from '../../components/UI/Avatar';
import DirectMessageThread from '../../components/Chat/DirectMessageThread';
import NewConversationModal from '../../components/Chat/NewConversationModal';

type ViewMode = 'rooms' | 'dms';

const ChatPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('rooms');
  
  // State for Rooms
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  
  // State for DMs
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingDMs, setLoadingDMs] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      setError(null);
      const response = await chatAPI.getRooms();
      setRooms(response.data);
    } catch (err) {
      setError('Failed to fetch chat rooms.');
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      setLoadingDMs(true);
      setError(null);
      const response = await chatAPI.getConversations();
      setConversations(response.data);
    } catch (err) {
      setError('Failed to fetch conversations.');
      console.error(err);
    } finally {
      setLoadingDMs(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'rooms') {
      fetchRooms();
    } else {
      fetchConversations();
    }
  }, [viewMode, fetchRooms, fetchConversations]);

  const handleCreateRoom = async () => {
    const roomName = prompt('Enter a name for the new public room:');
    if (roomName && roomName.trim() !== '') {
      try {
        await chatAPI.createRoom({ name: roomName, type: 'public' });
        fetchRooms();
      } catch (err) {
        setError('Failed to create room. You may need to be logged in.');
        console.error(err);
      }
    }
  };

  const handleSelectUser = (user: User) => {
    // Create a temporary conversation object to open the thread
    const newConversation: Conversation = {
      other_user_id: user.id,
      other_user_username: user.username,
      other_user_avatar: user.avatar,
      last_message: `Starting conversation with ${user.username}`,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    };
    setSelectedConversation(newConversation);
    setIsNewConversationModalOpen(false);
  };

  const renderRoomsView = () => (
    <>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white flex items-center">
          Chat Rooms
        </h1>
        <Button onClick={handleCreateRoom} className="flex items-center">
          <PlusCircle className="mr-2" size={20} />
          Create Room
        </Button>
      </header>
      {loadingRooms ? (
        <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.filter(room => room.type === 'public').map((room) => (
            <Card key={room.id} className="hover:shadow-primary-500/30 transition-shadow duration-300 cursor-pointer" onClick={() => { setSelectedRoom(room); setIsRoomModalOpen(true); }}>
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-white mb-2">{room.name}</h2>
                <p className="text-gray-400 mb-4">Public discussion room.</p>
                <div className="text-sm text-gray-500 flex items-center">
                  <Users className="mr-2" size={16} />
                  <span>Public</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
  
  const renderDMsView = () => (
    <>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white flex items-center">
          Direct Messages
        </h1>
        <Button onClick={() => setIsNewConversationModalOpen(true)} className="flex items-center">
          <MessageSquarePlus className="mr-2" size={20} />
          New Message
        </Button>
      </header>
      {loadingDMs ? (
        <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">You have no conversations yet.</p>
          <Button onClick={() => setIsNewConversationModalOpen(true)}>
            <MessageSquarePlus className="mr-2" size={20} />
            Start a Conversation
          </Button>
        </div>
      ) : (
        <div className="bg-dark-800 rounded-lg shadow-lg">
          <ul className="divide-y divide-dark-700">
            {conversations.map((convo) => (
              <li key={convo.other_user_id} className="p-4 hover:bg-dark-700/50 transition-colors duration-200 cursor-pointer flex items-center space-x-4" onClick={() => setSelectedConversation(convo)}>
                <div className="relative">
                  <Avatar src={convo.other_user_avatar} username={convo.other_user_username} size="lg" />
                  {convo.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {convo.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-semibold text-white">{convo.other_user_username}</h3>
                    <p className="text-xs text-gray-500">{new Date(convo.last_message_at).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{convo.last_message}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex items-center justify-center mb-8 border-b border-dark-700">
        <TabButton icon={MessageSquare} label="Rooms" isActive={viewMode === 'rooms'} onClick={() => { setViewMode('rooms'); setSelectedConversation(null); }} />
        <TabButton icon={Mail} label="Direct Messages" isActive={viewMode === 'dms'} onClick={() => { setViewMode('dms'); }} />
      </div>

      {error && <div className="text-center text-red-500 mb-4">{error}</div>}

      <div className="transition-opacity duration-300">
        {viewMode === 'rooms' && renderRoomsView()}
        {viewMode === 'dms' && (
          <div className="flex gap-6">
            <div className={`w-full lg:w-1/3 transition-all duration-300 ${selectedConversation ? 'hidden lg:block' : ''}`}>
              {renderDMsView()}
            </div>
            {selectedConversation && (
              <div className="w-full lg:w-2/3">
                <DirectMessageThread 
                  conversation={selectedConversation}
                  onClose={() => setSelectedConversation(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {selectedRoom && (
        <ChatRoomModal
          isOpen={isRoomModalOpen}
          onClose={() => { setIsRoomModalOpen(false); setSelectedRoom(null); }}
          room={selectedRoom}
        />
      )}

      <NewConversationModal
        isOpen={isNewConversationModalOpen}
        onClose={() => setIsNewConversationModalOpen(false)}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
};

const TabButton: React.FC<{icon: React.ElementType, label: string, isActive: boolean, onClick: () => void}> = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 font-semibold border-b-2 transition-all duration-200 ${
      isActive
        ? 'border-primary-500 text-primary-400'
        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
    }`}
  >
    <Icon size={20} />
    <span>{label}</span>
  </button>
);

export default ChatPage; 