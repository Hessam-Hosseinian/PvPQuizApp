import React from 'react';

interface SnackbarProps {
  message: string;
  type?: 'success' | 'error';
}

const Snackbar: React.FC<SnackbarProps> = ({ message, type = 'success' }) => {
  return (
    <div
      className={`
        fixed bottom-8 left-1/2 z-50 transform -translate-x-1/2
        px-6 py-3 rounded-xl shadow-lg flex items-center gap-2
        text-white text-sm font-medium
        transition-all duration-300
        ${type === 'success' ? 'bg-green-600/90' : 'bg-red-600/90'}
        animate-fade-in
      `}
      style={{ minWidth: 220, maxWidth: 360 }}
    >
      {type === 'success' ? (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      )}
      <span>{message}</span>
    </div>
  );
};

export default Snackbar;

// Add fade-in animation
// In your global CSS (e.g., index.css):
// @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
// .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.4,0,0.2,1); } 