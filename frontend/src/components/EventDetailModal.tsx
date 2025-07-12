import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarEvent } from '../types/calendar.types';
import ConfirmationDialog from './ConfirmationDialog';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose, onEdit, onDelete }) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  if (!event) return null;

  const handleDeleteClick = () => {
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete(event.id);
    setIsConfirmDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setIsConfirmDialogOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surfaceContainerHigh rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-onSurface">Event Details</h2>
          <button
            className="text-onSurfaceVariant hover:text-onSurface"
            onClick={onClose}
            aria-label="Close event details"
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
        <div className="space-y-2 text-onSurface mb-4">
          <p><strong>Title:</strong> {event.title}</p>
          <p><strong>Start:</strong> {format(event.start, 'PPP p')}</p>
          <p><strong>End:</strong> {format(event.end, 'PPP p')}</p>
          {event.allDay && <p><strong>All Day:</strong> Yes</p>}
          {event.color && <p><strong>Color:</strong> <span className={`inline-block w-4 h-4 rounded-full ${event.color}`}></span></p>}
          {event.calendarId && <p><strong>Calendar:</strong> {event.calendarId}</p>}
          {event.isRecurring && <p><strong>Recurring:</strong> {event.recurrenceRule}</p>}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            className="px-4 py-2 rounded-md border border-outlineVariant text-onSurfaceVariant hover:bg-surfaceVariant"
            onClick={() => onEdit(event)}
            aria-label="Edit event"
          >
            Edit
          </button>
          <button
            className="px-4 py-2 rounded-md bg-error text-onError hover:bg-errorContainer"
            onClick={handleDeleteClick}
            aria-label="Delete event"
          >
            Delete
          </button>
        </div>
      </div>
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete "${event.title}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default EventDetailModal;
