import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../../services/api';
import { ChatMessage, Conversation } from '../../types';
import LoadingSpinner from '../UI/LoadingSpinner';
import Avatar from '../UI/Avatar';
import Button from '../UI/Button';
import { Send, ArrowLeft, MessageSquare, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DirectMessageThreadProps {
  conversation: Conversation;
  onClose: () => void;
}

const DirectMessageThread: React.FC<DirectMessageThreadProps> = ({ conversation, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await chatAPI.getDirectMessages(conversation.other_user_id);
      setMessages(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load messages.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [conversation.other_user_id]);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    try {
      const messageToSend = newMessage;
      const replyToId = replyToMessage?.id;
      
      setNewMessage('');
      setReplyToMessage(null);

      await chatAPI.sendDirectMessage({
        recipient_id: conversation.other_user_id,
        message: messageToSend,
        reply_to_id: replyToId,
      });
      await fetchMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
      setNewMessage(newMessage); // Re-add message to input
      setError('Failed to send message.');
    }
  };

  return (
    <div className="bg-dark-800 rounded-lg shadow-xl flex flex-col h-[75vh]">
      <header className="flex items-center p-4 border-b border-dark-700">
        <Button variant="ghost" size="icon" className="mr-2 lg:hidden" onClick={onClose}>
          <ArrowLeft size={20} />
        </Button>
        <Avatar src={conversation.other_user_avatar} alt={conversation.other_user_username} size="md" />
        <h2 className="text-xl font-bold text-white ml-3">{conversation.other_user_username}</h2>
      </header>

      <div className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
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
                  <div className="absolute top-1 right-1 flex items-center">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6"
                        onClick={() => setReplyToMessage(msg)}
                    >
                        <MessageSquare size={14} />
                    </Button>
                  </div>
                  
                  {msg.replied_message_text && (
                    <div className="border-l-2 border-primary-400 pl-2 mb-2 text-sm opacity-80 bg-black/10 p-2 rounded-md">
                        <p className="font-bold">{msg.replied_message_sender === user?.username ? "You" : msg.replied_message_sender}</p>
                        <p className="truncate">{msg.replied_message_text}</p>
                    </div>
                   )}

                  <p className="pr-6">{msg.message}</p>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <footer className="p-4 border-t border-dark-700 mt-auto">
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
            placeholder={`Message ${conversation.other_user_username}`}
            className="flex-1 bg-dark-700 border border-dark-600 rounded-full py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={loading || !!error}
          />
          <Button type="submit" variant="primary" className="rounded-full !p-3" disabled={!newMessage.trim()}>
            <Send size={20} />
          </Button>
        </form>
      </footer>
    </div>
  );
};

export default DirectMessageThread; 