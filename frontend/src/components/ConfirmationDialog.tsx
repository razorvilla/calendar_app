import React from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surfaceContainerHigh rounded-lg shadow-xl p-6 w-full max-w-sm mx-auto">
        <h3 className="text-lg font-semibold text-onSurface mb-4">{title}</h3>
        <p className="text-onSurfaceVariant mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            className="px-4 py-2 rounded-md border border-outlineVariant text-onSurfaceVariant hover:bg-surfaceVariant"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-error text-onError hover:bg-errorContainer"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
