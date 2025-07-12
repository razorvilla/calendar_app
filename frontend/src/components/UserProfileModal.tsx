import React from 'react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surfaceContainerHigh rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-onSurface">User Profile & Settings</h2>
          <button
            className="text-onSurfaceVariant hover:text-onSurface"
            onClick={onClose}
            aria-label="Close profile and settings"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        <div className="space-y-4 text-onSurface">
          <p><strong>Name:</strong> John Doe</p>
          <p><strong>Email:</strong> john.doe@example.com</p>
          <p><strong>Timezone:</strong> UTC</p>
          <p><strong>Default View:</strong> Month</p>
          <p className="text-sm text-outline">More settings options will be available here.</p>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
