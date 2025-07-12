
import React from 'react';
import './Schedule.css';

function Schedule() {
  return (
    <div className="schedule-modal">
      <div className="schedule-header">
        <button className="schedule-back-button">&#9664;</button>
        <button className="schedule-close-button">&#x2715;</button>
      </div>
      <div className="schedule-content">
        <input className="schedule-title" placeholder="Add title" />
        <div className="schedule-tabs">
          <button className="schedule-tab active">Event</button>
          <button className="schedule-tab">Task</button>
          <button className="schedule-tab">Appointment schedule <span className="new-badge">New</span></button>
        </div>
        <div className="schedule-details">
          <div className="schedule-detail">
            <span>🕒</span>
            <p>Saturday, August 2<br />12:30am - 1:30am<br />Time zone • Does not repeat</p>
          </div>
          <div className="schedule-detail">
            <span>👥</span>
            <p>Add guests</p>
          </div>
          <div className="schedule-detail">
            <span>📹</span>
            <p>Add Google Meet video conferencing</p>
          </div>
          <div className="schedule-detail">
            <span>📍</span>
            <p>Add location</p>
          </div>
          <div className="schedule-detail">
            <span>📝</span>
            <p>Add description or a Google Drive attachment</p>
          </div>
          <div className="schedule-account">
            <span>👤</span>
            <p>Prateek Mondal<br />Busy • Default visibility • 2 notifications</p>
          </div>
        </div>
        <div className="schedule-footer">
          <button className="more-options">More options</button>
          <button className="save-button">Save</button>
        </div>
      </div>
    </div>
  );
}

export default Schedule;
```

```css
.schedule-modal {
  width: 360px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: white;
  font-family: Arial, sans-serif;
  overflow: hidden;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.schedule-back-button,
.schedule-close-button {
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
}

.schedule-content {
  padding: 0 16px 16px;
}

.schedule-title {
  width: 100%;
  padding: 8px 0;
  font-size: 24px;
  border: none;
  border-bottom: 2px solid #426FF5;
  margin-bottom: 16px;
}

.schedule-tabs {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.schedule-tab {
  background: #f1f3f4;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}

.schedule-tab.active {
  background: #E6F4EA;
  color: #3c4043;
}

.new-badge {
  font-size: 10px;
  color: #fff;
  background: #4285f4;
  padding: 2px 4px;
  border-radius: 4px;
  margin-left: 4px;
}

.schedule-details {
  margin-bottom: 16px;
}

.schedule-detail {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
  font-size: 14px;
  color: #5f6368;
}

.schedule-account {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #5f6368;
}

.schedule-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 -16px;
  padding: 16px;
  background: #f1f3f4;
}

.more-options,
.save-button {
  border: none;
  background: none;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
}

.more-options {
  font-size: 14px;
  color: #3c4043;
}

.save-button {
  background: #1a73e8;
  color: #fff;
  font-size: 14px;
}
