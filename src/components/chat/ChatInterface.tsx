import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Send, ArrowDown, PaperclipIcon, Smile, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  timestamp: string;
  read_status: boolean;
  sender_name?: string;
  sender_image?: string;
}

interface ChatInterfaceProps {
  requestId: string;
  userId: string;
  recipientId: string;
  recipientName: string;
  recipientImage?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  requestId,
  userId,
  recipientId,
  recipientName,
  recipientImage
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [typing, setTyping] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch initial messages
  useEffect(() => {
    fetchMessages();
    const channel = subscribeToNewMessages();
    
    // Cleanup function
    return () => {
      // Clean up subscriptions
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [requestId]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Mark messages as read when user views them
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages]);
  
  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          request_id,
          sender_id,
          content,
          timestamp,
          read_status,
          users:sender_id(first_name, last_name, profile_image_url)
        `)
        .eq('request_id', requestId)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      
      // Process messages with sender info
      const processedMessages = data.map((msg: any) => ({
        ...msg,
        sender_name: msg.users ? `${msg.users.first_name} ${msg.users.last_name}`.trim() : 'Unknown',
        sender_image: msg.users?.profile_image_url || null
      }));
      
      setMessages(processedMessages);
      
      // Count unread messages
      const unread = processedMessages.filter(
        msg => !msg.read_status && msg.sender_id !== userId
      ).length;
      
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };
  
  const subscribeToNewMessages = () => {
    const channel = supabase
      .channel(`chat-channel-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `request_id=eq.${requestId}`
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          // Fetch sender details
          const { data: userData } = await supabase
            .from('users')
            .select('first_name, last_name, profile_image_url')
            .eq('id', payload.new.sender_id)
            .single();
          
          const newMessage = {
            ...payload.new,
            sender_name: userData ? `${userData.first_name} ${userData.last_name}`.trim() : 'Unknown',
            sender_image: userData?.profile_image_url || null
          };
          
          // Play sound notification for incoming messages
          if (payload.new.sender_id !== userId) {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(e => console.log('Error playing notification sound:', e));
            
            // Update unread count
            setUnreadCount(prev => prev + 1);
          }
          
          setMessages(prev => [...prev, newMessage as ChatMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `request_id=eq.${requestId}`
        },
        (payload) => {
          console.log('Message updated:', payload);
          
          // Update the message in the list
          setMessages(prev =>
            prev.map(msg =>
              msg.id === payload.new.id ? { ...msg, ...payload.new as ChatMessage } : msg
            )
          );
        }
      )
      .subscribe();
      
    return channel;
  };
  
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      setSending(true);
      
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            request_id: requestId,
            sender_id: userId,
            content: newMessage.trim(),
            timestamp: new Date().toISOString(),
            read_status: false
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Clear input after sending
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };
  
  const markMessagesAsRead = async () => {
    try {
      // Get all unread messages not sent by the current user
      const unreadMessages = messages.filter(
        msg => !msg.read_status && msg.sender_id !== userId
      );
      
      if (unreadMessages.length === 0) return;
      
      // Update all unread messages to read
      const { error } = await supabase
        .from('messages')
        .update({ read_status: true })
        .in(
          'id',
          unreadMessages.map(msg => msg.id)
        );
      
      if (error) throw error;
      
      // Update local state
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Format timestamp to readable format
  const formatMessageTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch (e) {
      return '';
    }
  };
  
  // Format date for date separators
  const formatMessageDate = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy');
    } catch (e) {
      return '';
    }
  };
  
  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { [key: string]: ChatMessage[] } = {};
    messages.forEach(message => {
      const date = formatMessageDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };
  
  return (
    <div className="flex flex-col h-full max-h-[800px] bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,0.7)] rounded-xl overflow-hidden">
      {/* Chat header */}
      <div className="bg-black text-white p-4 flex items-center justify-between border-b-4 border-black">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 border-2 border-yellow-400">
            <AvatarImage src={recipientImage} />
            <AvatarFallback className="bg-yellow-400 text-black font-bold">
              {recipientName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <h3 className="font-bold text-lg">{recipientName}</h3>
            <div className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
              <span className="text-xs">Online</span>
            </div>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Badge className="bg-yellow-400 text-black border-2 border-black hover:bg-yellow-500">
            {unreadCount} new {unreadCount === 1 ? 'message' : 'messages'}
          </Badge>
        )}
      </div>
      
      {/* Chat messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-black" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6 bg-white border-2 border-dashed border-black rounded-lg">
              <p className="font-bold">No messages yet</p>
              <p className="text-sm text-gray-500">Start the conversation by sending a message</p>
            </div>
          </div>
        ) : (
          Object.entries(groupMessagesByDate()).map(([date, dateMessages]) => (
            <div key={date} className="mb-4">
              {/* Date separator */}
              <div className="flex items-center justify-center mb-4">
                <div className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full border border-gray-300">
                  {date}
                </div>
              </div>
              
              {/* Messages for this date */}
              {dateMessages.map((message) => {
                const isCurrentUser = message.sender_id === userId;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    <div className="flex items-end gap-2 max-w-[80%]">
                      {!isCurrentUser && (
                        <Avatar className="h-8 w-8 border-2 border-black">
                          <AvatarImage src={message.sender_image} />
                          <AvatarFallback className="bg-yellow-400 text-black font-bold text-xs">
                            {message.sender_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div
                        className={`px-4 py-3 rounded-xl ${isCurrentUser
                          ? 'bg-black text-white'
                          : 'bg-yellow-400 text-black border-2 border-black'}`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className={`text-xs mt-1 ${isCurrentUser ? 'text-gray-300' : 'text-gray-700'}`}>
                          {formatMessageTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* New message unread indicator */}
      {unreadCount > 0 && (
        <Button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 rounded-full bg-yellow-400 text-black border-2 border-black p-2 shadow-[2px_2px_0px_rgba(0,0,0,0.7)] hover:shadow-none hover:translate-y-1 hover:translate-x-1 transition-all"
        >
          <ArrowDown size={16} />
        </Button>
      )}
      
      {/* Chat input */}
      <div className="p-4 border-t-4 border-black bg-white">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 border-2 border-black rounded-lg p-3 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]"
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-black hover:bg-gray-800 text-white border-2 border-black font-bold py-2 px-4 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0px_rgba(0,0,0,0.2)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
