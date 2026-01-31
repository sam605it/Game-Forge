
import React from 'react';
import { Message } from '../types';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] md:max-w-[80%] rounded-2xl px-5 py-4 ${
          isUser
            ? 'bg-sky-500 text-white rounded-tr-none shadow-lg shadow-sky-500/10'
            : 'glass text-[var(--text-main)] rounded-tl-none'
        }`}
      >
        <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2 select-none ${isUser ? 'text-sky-100' : 'text-sky-500'}`}>
          {!isUser && (
             <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
               <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
             </svg>
          )}
          {isUser ? 'Creator' : 'Forge Engine'}
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium select-text">
          {message.content}
        </div>
        {message.code && !isUser && (
          <div className="mt-4 pt-3 border-t border-[var(--glass-border)] flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-tighter">Compiled Successfully</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
