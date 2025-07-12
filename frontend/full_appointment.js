import React from 'react';
import './App.css';

function App() {
  return (
    <div className="container">
      <header className="header">
        <button className="close-button">X</button>
        <input className="title" placeholder="Add title" />
        <button className="save-button">Save</button>
      </header>
      <main className="main-content">
        <section className="time-section">
          <input type="date" />
          <input type="time" />
          <span>to</span>
          <input type="time" />
          <input type="date" />
          <button className="timezone-button">Time zone</button>
          <div className="repeat-options">
            <input type="checkbox" id="allDay" />
            <label htmlFor="allDay">All day</label>
            <button className="repeat-button">Does not repeat</button>
          </div>
        </section>
        <div className="tabs">
          <button className="tab-button">Event details</button>
          <button className="tab-button">Find a time</button>
        </div>
        <section className="details-section">
          <div className="meet-option">
            Add Google Meet video conferencing
          </div>
          <div className="location">
            <input placeholder="Add location" />
          </div>
          <div className="notification">
            <select>
              <option>Email</option>
              <option>Notification</option>
            </select>
            <input type="number" defaultValue="10" />
            <select>
              <option>minutes</option>
              <option>hours</option>
            </select>
          </div>
          <div className="notification">
            <select>
              <option>Notification</option>
              <option>Email</option>
            </select>
            <input type="number" defaultValue="30" />
            <select>
              <option>minutes</option>
              <option>hours</option>
            </select>
          </div>
          <a href="#" className="notification-link">Add notification</a>
        </section>
        <section className="participants-section">
          <div className="participant">
            Prateek Mondal
            <div className="status-circle"></div>
          </div>
          <div className="status-options">
            <button className="busy-button">Busy</button>
            <button className="visibility-button">Default visibility</button>
          </div>
        </section>
        <section className="description-section">
          <textarea placeholder="Add description"></textarea>
        </section>
        <aside className="guests-section">
          <input placeholder="Add guests" />
          <div className="suggestions">
            Suggested times
          </div>
          <div className="permissions">
            <input type="checkbox" id="modifyEvent" />
            <label htmlFor="modifyEvent">Modify event</label>
            <input type="checkbox" id="inviteOthers" defaultChecked />
            <label htmlFor="inviteOthers">Invite others</label>
            <input type="checkbox" id="seeGuestList" defaultChecked />
            <label htmlFor="seeGuestList">See guest list</label>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
```

```css
.container {
  font-family: Arial, sans-serif;
  width: 80%;
  margin: 0 auto;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid #ccc;
}

.close-button,
.save-button {
  background-color: #1a73e8;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
}

.title {
  border: none;
  border-bottom: 2px solid #ccc;
  font-size: 1.5rem;
}

.main-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-top: 20px;
}

.time-section,
.details-section,
.participants-section,
.description-section,
.guests-section {
  margin-bottom: 20px;
}

.tabs {
  display: flex;
  margin-bottom: 10px;
}

.tab-button {
  background: none;
  border: none;
  color: #1a73e8;
  cursor: pointer;
  font-weight: bold;
  margin-right: 10px;
}

.time-section span {
  margin: 0 5px;
}

.timezone-button,
.repeat-button {
  background: none;
  border: none;
  color: #1a73e8;
  cursor: pointer;
}

.notification,
.status-options {
  display: flex;
  align-items: center;
  margin-top: 10px;
}

.notification input[type="number"],
.location input {
  border: 1px solid #ccc;
  padding: 5px;
  border-radius: 4px;
  margin-left: 10px;
}

.notification-link {
  color: #1a73e8;
  cursor: pointer;
  text-decoration: none;
  display: block;
  margin-top: 10px;
}

.participant {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.status-circle {
  width: 10px;
  height: 10px;
  background-color: #1a73e8;
  border-radius: 50%;
  margin-left: 5px;
}

.busy-button,
.visibility-button {
  background: none;
  border: none;
  color: #1a73e8;
  cursor: pointer;
  margin-right: 10px;
}

.description-section textarea {
  width: 100%;
  height: 100px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px;
}

.guests-section input,
.suggestions {
  border: 1px solid #ccc;
  padding: 5px;
  border-radius: 4px;
  margin-bottom: 10px;
  width: 100%;
}

.permissions input {
  margin-right: 5px;
}
