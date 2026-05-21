// pages/pages2.js

// PAGE: ADD MEMBER
pages.members_new = () => `
  <div class="page-header">
    <div>
      <h2>Add New Member</h2>
      <div class="subtitle">Manually register a single member.</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" onclick="navigateTo('members')">Cancel</button>
      <button class="btn btn-primary" onclick="navigateTo('members')">Save Member</button>
    </div>
  </div>
  <div class="page-body">
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Basic Details</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" class="form-input" placeholder="e.g. John Doe">
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number (For OTP Login)</label>
            <input type="text" class="form-input" placeholder="+91 ">
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-input" placeholder="john@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Date of Birth</label>
            <input type="date" class="form-input">
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header"><h3>Organization Info & Photo</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Team / Group</label>
            <select class="form-select">
              <option>None</option>
              <option>Worship</option>
              <option>Media</option>
              <option>Ushering</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Profile Photo</label>
            <div class="upload-zone">
              <div class="upload-icon">📷</div>
              <p>Drag and drop or click to upload</p>
              <div class="upload-hint">1:1 square ratio recommended, max 2MB</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

// PAGE: EVENTS
pages.events = () => `
  <div class="page-header">
    <div>
      <h2>Events Manager</h2>
      <div class="subtitle">Create and manage church events and meetings.</div>
    </div>
    <div class="header-actions">
      <div class="toggle active" title="List / Calendar view"></div>
      <button class="btn btn-primary" onclick="navigateTo('events_new')">+ Create Event</button>
    </div>
  </div>
  <div class="page-body">
    <div class="card">
      <div class="card-body">
        <table class="data-table">
          <thead>
            <tr>
              <th>Event Name</th>
              <th>Date & Time</th>
              <th>Type</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style="font-weight:600">Sunday Fellowship</div>
                <div style="font-size:12px;color:var(--text-muted)">Youth gathering</div>
              </td>
              <td>Sun, 24 May 2026 • 10:00 AM</td>
              <td><span class="tag tag-blue">🔵 Church Event</span></td>
              <td>Main Hall</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="navigateTo('events_new')">Edit</button>
                <button class="btn btn-danger btn-sm">Delete</button>
              </td>
            </tr>
            <tr>
              <td>
                <div style="font-weight:600">Youth Retreat 2026</div>
                <div style="font-size:12px;color:var(--text-muted)">Annual Camp</div>
              </td>
              <td>Fri, 05 Jun 2026 • 09:00 AM</td>
              <td><span class="tag tag-purple">🟣 Special Event</span></td>
              <td>Camp Ground</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="navigateTo('events_new')">Edit</button>
                <button class="btn btn-danger btn-sm">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
`;

// PAGE: EVENTS NEW/EDIT
pages.events_new = () => `
  <div class="page-header">
    <div>
      <h2>Create Event</h2>
      <div class="subtitle">Add a new event to the calendar.</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" onclick="navigateTo('events')">Cancel</button>
      <button class="btn btn-primary" onclick="navigateTo('events')">Save & Publish</button>
    </div>
  </div>
  <div class="page-body">
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Event Details</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Event Title</label>
            <input type="text" class="form-input" placeholder="e.g. Sunday Youth Mass">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <input type="date" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Start Time</label>
              <input type="time" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Location</label>
            <input type="text" class="form-input" placeholder="e.g. Main Auditorium">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-textarea" placeholder="Detailed information about the event..."></textarea>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header"><h3>Banner Image & Settings</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Event Banner Photo (No Video)</label>
            <div class="upload-zone" style="padding:24px">
              <div class="upload-icon" style="font-size:24px;margin-bottom:8px">🖼️</div>
              <p>Upload landscape image</p>
            </div>
          </div>
          
          <div class="form-group mt-24">
            <label class="form-label">Notify Members</label>
            <label style="display:flex;align-items:center;gap:10px;margin-top:12px;background:var(--bg-glass);padding:12px;border-radius:var(--radius-sm)">
              <input type="checkbox" checked style="width:16px;height:16px">
              Send push notification to app instantly upon saving
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

// PAGE: MEDIA (PHOTOS ONLY)
pages.media = () => `
  <div class="page-header">
    <div>
      <h2>Photo Gallery Manager</h2>
      <div class="subtitle">Upload and manage photo albums. Video uploads are disabled for the web.</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-primary">+ Create Album</button>
    </div>
  </div>
  <div class="page-body">
    <div class="card mb-24">
      <div class="card-body" style="display:flex;align-items:center;gap:20px">
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
            <span>Storage Usage (MinIO)</span>
            <span>2.4 GB / 10 GB</span>
          </div>
          <div style="height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
            <div style="width:24%;height:100%;background:linear-gradient(90deg,var(--accent),var(--info))"></div>
          </div>
        </div>
        <div class="upload-zone" style="flex:2;padding:16px;display:flex;align-items:center;justify-content:center;gap:12px">
           <span style="font-size:24px">📥</span>
           <div style="text-align:left">
             <div style="font-weight:600;font-size:14px">Bulk Upload Photos</div>
             <div style="font-size:12px;color:var(--text-muted)">Drag and drop multiple images here</div>
           </div>
        </div>
      </div>
    </div>
    
    <div class="grid-4">
      <!-- Album card -->
      <div class="card" style="cursor:pointer;overflow:hidden">
        <div style="height:140px;background:url('https://images.unsplash.com/photo-1543702404-4860bda8442a?q=80&w=600&auto=format&fit=crop') center/cover"></div>
        <div class="card-body" style="padding:16px">
          <h4 style="font-size:14px;margin-bottom:4px">Youth Retreat 2026</h4>
          <div style="font-size:12px;color:var(--text-muted);display:flex;justify-content:space-between">
            <span>42 Photos</span>
            <span>May 10</span>
          </div>
        </div>
      </div>
      <div class="card" style="cursor:pointer;overflow:hidden">
        <div style="height:140px;background:url('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=600&auto=format&fit=crop') center/cover"></div>
        <div class="card-body" style="padding:16px">
          <h4 style="font-size:14px;margin-bottom:4px">Sunday Worship</h4>
          <div style="font-size:12px;color:var(--text-muted);display:flex;justify-content:space-between">
            <span>12 Photos</span>
            <span>May 3</span>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
