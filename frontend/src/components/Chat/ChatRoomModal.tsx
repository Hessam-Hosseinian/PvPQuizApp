import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../../services/api';
import { ChatMessage, ChatRoom } from '../../types';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import Avatar from '../UI/Avatar';
import { Send, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ChatRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ChatRoom;
}

const ChatRoomModal: React.FC<ChatRoomModalProps> = ({ isOpen, onClose, room }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    try {
      const response = await chatAPI.getRoomMessages(room.id);
      setMessages(response.data);
    } catch (err) {
      setError('Failed to load messages. You might not be a member of this room.');
      console.error(err);
      // Attempt to join the room automatically if fetching fails
      try {
        await chatAPI.joinRoom(room.id);
        setError(null); // Clear previous error
        const response = await chatAPI.getRoomMessages(room.id);
        setMessages(response.data);
      } catch (joinErr) {
        console.error('Failed to auto-join room:', joinErr);
        setError('Failed to load messages. Please ensure you are logged in and have permission to join this room.');
      }
    } finally {
      setLoading(false);
    }
  }, [room.id]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchMessages();
      
      // Poll for new messages every 3 seconds
      const interval = setInterval(fetchMessages, 3000);
      
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    try {
      setNewMessage('');
      await chatAPI.sendMessage(room.id, { message: newMessage });
      fetchMessages(); // Refresh messages immediately after sending
    } catch (err) {
      console.error('Failed to send message:', err);
      // Optionally, re-add the message to the input for the user to try again
      setNewMessage(newMessage);
      setError('Failed to send message.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="bg-dark-800 rounded-lg shadow-xl p-0 flex flex-col h-[70vh]">
        <header className="flex justify-between items-center p-4 border-b border-dark-700">
          <h2 className="text-2xl font-bold text-white">{room.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.sender_id === user?.id ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar
                    src={msg.sender_avatar}
                    username={msg.sender_username}
                    size="md"
                  />
                  <div
                    className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                      msg.sender_id === user?.id
                        ? 'bg-primary-600 text-white rounded-br-none'
                        : 'bg-dark-700 text-gray-200 rounded-bl-none'
                    }`}
                  >
                    <p className="font-semibold text-sm mb-1">{msg.sender_username}</p>
                    <p>{msg.message}</p>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {new Date(msg.sent_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-dark-700">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-dark-700 border border-dark-600 rounded-full py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={loading || !!error}
            />
            <Button type="submit" variant="primary" className="rounded-full !p-3" disabled={!newMessage.trim()}>
              <Send size={20} />
            </Button>
          </form>
        </footer>
      </div>
    </Modal>
  );
};

export default ChatRoomModal; 