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
import { chatSocket } from '../../services/socket';

type ViewMode = 'rooms' | 'dms';

const ChatPage: React.FC = () => {
  // const [viewMode, setViewMode] = useState<ViewMode>('rooms');
  const [viewMode, setViewMode] = useState<ViewMode>('dms'); // Only DMs
  
  // State for Rooms
  // const [rooms, setRooms] = useState<ChatRoom[]>([]);
  // const [loadingRooms, setLoadingRooms] = useState(true);
  // const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  // const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  
  // State for DMs
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingDMs, setLoadingDMs] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // const fetchRooms = useCallback(async () => {
  //   try {
  //     setLoadingRooms(true);
  //     setError(null);
  //     const response = await chatAPI.getRooms();
  //     setRooms(response.data);
  //   } catch (err) {
  //     setError('Failed to fetch chat rooms.');
  //     console.error(err);
  //   } finally {
  //     setLoadingRooms(false);
  //   }
  // }, []);

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
    fetchConversations();
    const handleConversationUpdate = () => {
      fetchConversations();
    };
    chatSocket.on('conversation_update', handleConversationUpdate);
    return () => {
      chatSocket.off('conversation_update', handleConversationUpdate);
    };
  }, [fetchConversations]);

  // const handleCreateRoom = async () => {
  //   const roomName = prompt('Enter a name for the new public room:');
  //   if (roomName && roomName.trim() !== '') {
  //     try {
  //       await chatAPI.createRoom({ name: roomName, type: 'public' });
  //       fetchRooms();
  //     } catch (err) {
  //       setError('Failed to create room. You may need to be logged in.');
  //       console.error(err);
  //     }
  //   }
  // };

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

  // const renderRoomsView = () => (
  //   <>
  //     <header className="flex justify-between items-center mb-8">
  //       <h1 className="text-4xl font-bold text-white flex items-center">
  //         Chat Rooms
  //       </h1>
  //       <Button onClick={handleCreateRoom} className="flex items-center">
  //         <PlusCircle className="mr-2" size={20} />
  //         Create Room
  //       </Button>
  //     </header>
  //     {loadingRooms ? (
  //       <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
  //     ) : rooms.filter(room => room.type === 'public').length === 0 ? (
  //       <div className="text-center py-16 bg-dark-800 rounded-lg">
  //         <p className="text-gray-400 mb-4">No public rooms available yet.</p>
  //         <Button onClick={handleCreateRoom}>
  //           <PlusCircle className="mr-2" size={20} />
  //           Create the First Room
  //         </Button>
  //       </div>
  //     ) : (
  //       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  //         {rooms.filter(room => room.type === 'public').map((room) => (
  //           <Card key={room.id} className="hover:shadow-primary-500/30 transition-shadow duration-300 cursor-pointer bg-dark-800" onClick={() => { setSelectedRoom(room); setIsRoomModalOpen(true); }}>
  //             <div className="p-6">
  //               <h2 className="text-2xl font-semibold text-white mb-2">{room.name}</h2>
  //               <p className="text-gray-400 mb-4">Public discussion room.</p>
  //               <div className="text-sm text-gray-500 flex items-center">
  //                 <Users className="mr-2" size={16} />
  //                 <span>Public</span>
  //               </div>
  //             </div>
  //           </Card>
  //         ))}
  //       </div>
  //     )}
  //   </>
  // );
  
  const renderDMsView = () => (
    <>
      <header className="flex justify-between items-center mb-4 flex-shrink-0">
        <h1 className="text-3xl font-bold text-white">Messages</h1>
        <Button onClick={() => setIsNewConversationModalOpen(true)} variant="ghost" size="icon">
          <MessageSquarePlus size={22} />
        </Button>
      </header>
      {loadingDMs ? (
        <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 bg-dark-800 rounded-lg">
          <p className="text-gray-400 mb-4">You have no conversations yet.</p>
          <Button onClick={() => setIsNewConversationModalOpen(true)}>
            <MessageSquarePlus className="mr-2" size={20} />
            Start a Conversation
          </Button>
        </div>
      ) : (
        <div className="bg-dark-800 rounded-lg shadow-lg flex-1 overflow-y-auto">
          <ul className="divide-y divide-dark-700">
            {conversations.map((convo) => (
              <li 
                key={convo.other_user_id} 
                className={`p-3 hover:bg-dark-700/50 transition-colors duration-200 cursor-pointer flex items-center space-x-4 ${selectedConversation?.other_user_id === convo.other_user_id ? 'bg-primary-900/40' : ''}`} 
                onClick={() => setSelectedConversation(convo)}
              >
                <div className="relative">
                <Avatar src={convo.other_user_avatar} size="lg" />
                  {convo.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-dark-800">
                      {convo.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h3 className={`font-semibold text-white truncate ${convo.unread_count > 0 ? 'font-bold' : ''}`}>{convo.other_user_username}</h3>
                    <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{new Date(convo.last_message_at).toLocaleDateString()}</p>
                  </div>
                  <p className={`text-sm text-gray-400 truncate ${convo.unread_count > 0 ? 'text-white' : ''}`}>{convo.last_message}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center mb-8 border-b border-dark-700">
          {/* <TabButton icon={MessageSquare} label="Rooms" isActive={viewMode === 'rooms'} onClick={() => { setViewMode('rooms'); setSelectedConversation(null); }} /> */}
          <TabButton icon={Mail} label="Direct Messages" isActive={viewMode === 'dms'} onClick={() => { setViewMode('dms'); }} />
        </div>
        {error && <div className="text-center text-red-500 mb-4">{error}</div>}
      </div>

      <div className="transition-opacity duration-300 flex-grow overflow-hidden">
        {/* {viewMode === 'rooms' && renderRoomsView()} */}
        {viewMode === 'dms' && (
          <div className="flex gap-6 h-full">
            <div className={`w-full lg:w-1/3 transition-all duration-300 flex flex-col ${selectedConversation ? 'hidden lg:block' : ''}`}>
              {renderDMsView()}
            </div>
            <div className={`w-full lg:w-2/3 transition-all duration-300 ${!selectedConversation ? 'hidden lg:block' : ''}`}>
              {selectedConversation ? (
                  <DirectMessageThread 
                    conversation={selectedConversation}
                    onClose={() => setSelectedConversation(null)}
                  />
              ) : (
                <div className="h-full flex flex-col justify-center items-center bg-dark-800 rounded-lg">
                    <Mail size={64} className="text-dark-600" />
                    <h2 className="mt-4 text-2xl font-bold text-gray-400">Select a conversation</h2>
                    <p className="mt-2 text-gray-500">Choose from your existing conversations on the left, or start a new one.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* {selectedRoom && (
        <ChatRoomModal
          isOpen={isRoomModalOpen}
          onClose={() => { setIsRoomModalOpen(false); setSelectedRoom(null); }}
          room={selectedRoom}
        />
      )} */}

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