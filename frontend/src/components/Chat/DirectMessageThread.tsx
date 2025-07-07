import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../../services/api';
import { ChatMessage, Conversation } from '../../types';
import LoadingSpinner from '../UI/LoadingSpinner';
import Avatar from '../UI/Avatar';
import Button from '../UI/Button';
import { Send, ArrowLeft, MessageSquare, X, Pencil, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { socket } from '../../services/socket';

// ===========================
// Helper Components
// ===========================

const ReadReceipt: React.FC<{ isRead?: boolean }> = ({ isRead }) => {
    if (isRead) {
        return <CheckCheck size={16} className="text-blue-400" />;
    }
    return <Check size={16} className="text-gray-400" />;
};

const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1 text-sm text-primary-400 h-5">
        <span>typing</span>
        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce"></div>
    </div>
);

const AutoGrowTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
  
    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [props.value]);
  
    return <textarea ref={textareaRef} {...props} />;
};


// ===========================
// Main Component
// ===========================

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
  const [editingMessage, setEditingMessage] = useState<{ id: number; text: string } | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await chatAPI.getDirectMessages(conversation.other_user_id);
      setMessages(response.data);
      setError(null);
      // After fetching, mark all messages from the other user as read
      socket.emit('mark_messages_as_read', { other_user_id: conversation.other_user_id });
    } catch (err) {
      setError('Failed to load messages.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [conversation.other_user_id]);

  // Main Effect for Socket Listeners
  useEffect(() => {
    fetchMessages();

    // --- Message Handlers ---
    const handleNewMessage = (newMessage: ChatMessage) => {
      const { other_user_id } = conversation;
      const my_id = user?.id;
      
      const isMyMessage = newMessage.sender_id === my_id && newMessage.recipient_id === other_user_id;
      const isTheirMessage = newMessage.sender_id === other_user_id && newMessage.recipient_id === my_id;

      if (isMyMessage || isTheirMessage) {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        if (isTheirMessage) {
            setIsOtherUserTyping(false); // Stop typing indicator when message arrives
            socket.emit('mark_messages_as_read', { other_user_id: conversation.other_user_id });
        }
      }
    };
    
    const handleMessageUpdate = (updatedMessage: ChatMessage) => {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === updatedMessage.id ? { ...msg, message: updatedMessage.message, is_edited: true } : msg
          )
        );
    };

    const handleMessagesRead = (data: { reader_id: number }) => {
        if (data.reader_id === conversation.other_user_id) {
            setMessages(prevMessages => 
                prevMessages.map(msg => 
                    msg.sender_id === user?.id ? { ...msg, is_read: true } : msg
                )
            );
        }
    };

    // --- Typing Handlers ---
    const handleUserTyping = (data: { user_id: number }) => {
        if (data.user_id === conversation.other_user_id) {
            setIsOtherUserTyping(true);
        }
    };
    const handleUserStoppedTyping = (data: { user_id: number }) => {
        if (data.user_id === conversation.other_user_id) {
            setIsOtherUserTyping(false);
        }
    };

    const handleError = (error: { error: string }) => {
      console.error('Socket error:', error);
      setError(`A server error occurred: ${error.error}`);
    };

    // --- Register Listeners ---
    socket.on('new_direct_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdate);
    socket.on('messages_read', handleMessagesRead);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);
    socket.on('error', handleError);

    // --- Cleanup ---
    return () => {
      socket.off('new_direct_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdate);
      socket.off('messages_read', handleMessagesRead);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('error', handleError);
    };
  }, [fetchMessages, conversation, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    // Emit 'typing' event
    socket.emit('typing', { recipient_id: conversation.other_user_id });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set a new timeout to emit 'stop_typing'
    typingTimeoutRef.current = window.setTimeout(() => {
      socket.emit('stop_typing', { recipient_id: conversation.other_user_id });
    }, 2000); // 2 seconds of inactivity
  };


  const handleStartEdit = (message: ChatMessage) => {
    setEditingMessage({ id: message.id, text: message.message });
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleSaveEdit = () => {
    if (!editingMessage || editingMessage.text.trim() === '') return;
    
    socket.emit('edit_message', {
      message_id: editingMessage.id,
      new_text: editingMessage.text,
    });

    setEditingMessage(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('stop_typing', { recipient_id: conversation.other_user_id });

    socket.emit('send_direct_message', {
      recipient_id: conversation.other_user_id,
      message: newMessage,
      reply_to_id: replyToMessage?.id,
    });

    setNewMessage('');
    setReplyToMessage(null);
  };

  return (
    <div className="bg-dark-900 rounded-lg shadow-xl flex flex-col h-[75vh] md:h-full">
      <header className="flex items-center p-3 border-b border-dark-700 bg-dark-800 rounded-t-lg">
        <Button variant="ghost" size="icon" className="mr-2 lg:hidden" onClick={onClose}>
          <ArrowLeft size={20} />
        </Button>
        <Avatar src={conversation.other_user_avatar} alt={conversation.other_user_username} size="md" />
        <div className="ml-3">
          <h2 className="text-xl font-bold text-white">{conversation.other_user_username}</h2>
          {isOtherUserTyping && <TypingIndicator />}
        </div>
      </header>

      <div className="flex-1 p-4 overflow-y-auto bg-dark-800/50 bg-[url('/src/assets/chat-bg.png')] bg-blend-soft-light">
        {loading ? (
          <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 group ${
                  msg.sender_id === user?.id ? 'flex-row-reverse' : 'justify-start'
                }`}
              >
                {/* We don't need to show avatar for every message, but for simplicity let's keep it */}
                <Avatar
                  src={msg.sender_avatar}
                  alt={msg.sender_username}
                  size="sm"
                  className="mb-1"
                />
                <div
                  className={`relative max-w-sm md:max-w-lg px-4 py-2 rounded-xl ${
                    msg.sender_id === user?.id
                      ? 'bg-primary-600 text-white rounded-br-none'
                      : 'bg-dark-700 text-gray-200 rounded-bl-none'
                  }`}
                >
                  {/* Hover Actions: Edit & Reply */}
                  <div className={`absolute top-0 flex items-center gap-1 ${msg.sender_id === user?.id ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'}`}>
                    {msg.sender_id === user?.id && !editingMessage && (
                        <Button 
                            variant="ghost" size="icon" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 bg-dark-600 hover:bg-dark-500"
                            onClick={() => handleStartEdit(msg)}
                        > <Pencil size={14} /> </Button>
                    )}
                    <Button 
                        variant="ghost" size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 bg-dark-600 hover:bg-dark-500"
                        onClick={() => setReplyToMessage(msg)}
                    > <MessageSquare size={14} /> </Button>
                  </div>
                  
                  {/* Reply Snippet */}
                  {msg.replied_message_text && (
                    <div className="border-l-2 border-primary-400/70 pl-2 mb-2 text-sm opacity-90 bg-black/20 p-2 rounded-md">
                        <p className="font-bold text-primary-300">{msg.replied_message_sender === user?.username ? "You" : msg.replied_message_sender}</p>
                        <p className="truncate">{msg.replied_message_text}</p>
                    </div>
                   )}
                   
                   {/* Message Content */}
                   {editingMessage?.id === msg.id ? (
                     <div className="mt-2 w-72">
                        <AutoGrowTextarea
                         value={editingMessage.text}
                         onChange={(e) => setEditingMessage({ ...editingMessage, text: e.target.value })}
                         className="w-full bg-dark-600 border border-dark-500 rounded-md p-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                         rows={2}
                       />
                       <div className="flex justify-end gap-2 mt-2">
                         <Button variant="secondary" size="sm" onClick={handleCancelEdit}> <X size={14} className="mr-1" /> Cancel </Button>
                         <Button variant="primary" size="sm" onClick={handleSaveEdit}> <Check size={14} className="mr-1" /> Save </Button>
                       </div>
                     </div>
                   ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <div className="flex items-center justify-end gap-1.5 text-xs text-gray-300/80 mt-1 pl-4">
                        {msg.is_edited && <span className="italic text-xs">edited</span>}
                        <span>{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.sender_id === user?.id && <ReadReceipt isRead={msg.is_read} />}
                      </div>
                    </>
                   )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <footer className="p-3 border-t border-dark-700 bg-dark-800 rounded-b-lg">
          {replyToMessage && (
              <div className="bg-dark-700/80 p-2 rounded-t-lg flex justify-between items-center text-sm mb-1">
                  <div className='border-l-2 border-primary-500 pl-2'>
                      <p className="font-bold text-primary-400">Replying to {replyToMessage.sender_username}</p>
                      <p className="text-gray-300 truncate">{replyToMessage.message}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setReplyToMessage(null)} className="w-8 h-8 flex-shrink-0">
                      <X size={16} />
                  </Button>
              </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <AutoGrowTextarea
              value={newMessage}
              onChange={handleTyping}
              placeholder="Type your message..."
              className="flex-1 bg-dark-700 border border-dark-600 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/80 resize-none max-h-40"
              rows={1}
              disabled={loading || !!error}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                  }
              }}
            />
            <Button type="submit" variant="primary" className="rounded-full !p-3 flex-shrink-0" disabled={!newMessage.trim()}>
              <Send size={20} />
            </Button>
          </form>
        </footer>
    </div>
  );
};

export default DirectMessageThread; 