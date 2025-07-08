import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../../services/api';
import { ChatMessage, ChatRoom } from '../../types';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import Avatar from '../UI/Avatar';
import { Send, X, MessageSquare, Pencil, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { chatSocket } from '../../services/socket';

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
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: number; text: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getRoomMessages(room.id);
      setMessages(response.data);
    } catch (err) {
      setError('Failed to load messages. You might not be a member of this room.');
      console.error(err);
      // Auto-join logic can be simplified or removed if join is handled elsewhere
      try {
        await chatAPI.joinRoom(room.id);
        setError(null);
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
      fetchMessages();

      // Connect to socket events
      chatSocket.emit('join_room', { room_id: room.id });

      const handleNewMessage = (newMessage: ChatMessage) => {
        // Ensure message is for this room before adding
        if (newMessage.room_id === room.id) {
            setMessages((prevMessages) => [...prevMessages, newMessage]);
        } else {
        }
      };
      
      const handleJoinedSuccess = (data: { room_id: string }) => {
      };
      
      const handleMessageUpdate = (updatedMessage: ChatMessage) => {
        if (updatedMessage.room_id === room.id) {
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === updatedMessage.id ? { ...msg, message: updatedMessage.message, is_edited: true } : msg
              )
            );
        }
      };

      const handleError = (error: { error: string }) => {
        console.error('Socket error:', error);
        setError(`A server error occurred: ${error.error}`);
      };

      chatSocket.on('joined_room_success', handleJoinedSuccess);
      chatSocket.on('new_room_message', handleNewMessage);
      chatSocket.on('message_updated', handleMessageUpdate);
      chatSocket.on('error', handleError);

      // Cleanup on close
      return () => {
        chatSocket.emit('leave_room', { room_id: room.id });
        chatSocket.off('joined_room_success', handleJoinedSuccess);
        chatSocket.off('new_room_message', handleNewMessage);
        chatSocket.off('message_updated', handleMessageUpdate);
        chatSocket.off('error', handleError);
      };
    }
  }, [isOpen, room.id, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartEdit = (message: ChatMessage) => {
    setEditingMessage({ id: message.id, text: message.message });
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleSaveEdit = () => {
    if (!editingMessage || editingMessage.text.trim() === '') return;
    
    chatSocket.emit('edit_message', {
      message_id: editingMessage.id,
      new_text: editingMessage.text,
    });

    setEditingMessage(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user) return;

    try {
      // Message is sent via WebSocket, not HTTP POST
      chatSocket.emit('send_room_message', {
        room_id: room.id,
        message: newMessage,
        reply_to_id: replyToMessage?.id,
      });

      setNewMessage('');
      setReplyToMessage(null);
      // No need to call fetchMessages, the socket listener will update the state
    } catch (err) {
      console.error('Failed to send message via socket:', err);
      setError('Failed to send message.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
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
                  className={`flex items-start gap-3 group ${
                    msg.sender_id === user?.id ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar
                    src={msg.sender_avatar}
                    alt={msg.sender_username}
                    size="md"
                  />
                  <div
                    className={`relative max-w-xs md:max-w-md p-3 rounded-lg ${
                      msg.sender_id === user?.id
                        ? 'bg-primary-600 text-white rounded-br-none'
                        : 'bg-dark-700 text-gray-200 rounded-bl-none'
                    }`}
                  >
                    <div className="absolute top-1 right-1 flex items-center gap-1">
                      {msg.sender_id === user?.id && !editingMessage && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6"
                            onClick={() => handleStartEdit(msg)}
                        >
                            <Pencil size={14} />
                        </Button>
                      )}
                      <Button 
                          variant="ghost" 
                          size="icon" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6"
                          onClick={() => setReplyToMessage(msg)}
                      >
                          <MessageSquare size={14} />
                      </Button>
                    </div>

                    <p className="font-semibold text-sm mb-1">{msg.sender_username}</p>

                    {msg.replied_message_text && (
                      <div className="border-l-2 border-primary-400 pl-2 mb-2 text-sm opacity-80 bg-black/10 p-2 rounded-md">
                          <p className="font-bold">{msg.replied_message_sender === user?.username ? "You" : msg.replied_message_sender}</p>
                          <p className="truncate">{msg.replied_message_text}</p>
                      </div>
                    )}
                    
                    {editingMessage?.id === msg.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editingMessage.text}
                          onChange={(e) => setEditingMessage({ ...editingMessage, text: e.target.value })}
                          className="w-full bg-dark-600 border border-dark-500 rounded-md p-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                            <X size={14} className="mr-1" /> Cancel
                          </Button>
                          <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                            <Check size={14} className="mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="pr-6">{msg.message}</p>
                        <p className="text-xs text-gray-400 mt-1 text-right">
                          {msg.is_edited && <span className="italic">edited </span>}
                          {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-dark-700">
          {replyToMessage && (
              <div className="bg-dark-700 p-2 rounded-t-lg flex justify-between items-center text-sm mb-2">
                  <div className='border-l-2 border-primary-500 pl-2'>
                      <p className="font-bold text-primary-400">Replying to {replyToMessage.sender_username}</p>
                      <p className="text-gray-300 truncate">{replyToMessage.message}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setReplyToMessage(null)} className="w-8 h-8">
                      <X size={16} />
                  </Button>
              </div>
          )}
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