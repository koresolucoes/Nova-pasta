import React from 'react';
import type { ChatMessage } from '../../types';
import { CheckCircleIcon, XCircleIcon } from '../icons';

interface MessageBoxProps {
  message: ChatMessage;
}

function MessageBox({ message }: MessageBoxProps): React.ReactNode {
  const isMe = message.sender === 'me';

  const getStatusIcon = () => {
    if (message.status === 'failed') {
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
    }
    if (message.status === 'read') {
      return <CheckCircleIcon className="w-4 h-4 text-blue-500" />;
    }
    if (message.status === 'delivered') {
        return <CheckCircleIcon className="w-4 h-4 text-gray-400" />;
    }
    // 'sent' status
    return <CheckCircleIcon className="w-4 h-4 text-gray-300" />;
  };

  return (
    <div className={`flex items-end my-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`px-4 py-2 rounded-2xl max-w-sm md:max-w-md lg:max-w-lg shadow-sm transition-opacity ${
          isMe 
            ? 'bg-[#DCF8C6] rounded-br-none' 
            : 'bg-white rounded-bl-none border'
        } ${message.status === 'failed' ? 'opacity-70' : ''}`}
      >
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{message.text}</p>
        <div className="flex items-center justify-end mt-1">
          <p className="text-xs text-gray-500 mr-1">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {isMe && getStatusIcon()}
        </div>
      </div>
    </div>
  );
}

export default MessageBox;