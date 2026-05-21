// pages/pages3.js

// PAGE: ABOUT US EDIT
pages.about = () => `
  <div class="page-header">
    <div>
      <h2>Edit About Us</h2>
      <div class="subtitle">Update the organization history, vision, and leadership shown in the mobile app.</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-primary">Publish Changes</button>
    </div>
  </div>
  <div class="page-body">
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Organization Information</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Vision Statement</label>
            <textarea class="form-textarea" style="min-height:80px">To lead the youth in faith and fellowship.</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Mission Statement</label>
            <textarea class="form-textarea" style="min-height:80px">Empowering young minds through spiritual growth and community service.</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">History (Rich Text)</label>
            <div style="border:1px solid var(--border);border-radius:var(--radius-sm)">
               <div style="padding:8px;border-bottom:1px solid var(--border);background:var(--bg-glass);display:flex;gap:10px;color:var(--text-muted)">
                 <b>B</b> <i>I</i> <u>U</u> <span style="margin:0 10px">|</span> <span>🔗</span>
               </div>
               <textarea style="width:100%;min-height:150px;border:none;background:transparent;padding:12px;color:var(--text-primary);resize:none">Founded in 1990...</textarea>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header"><h3>Executive Committee (Drag to reorder)</h3></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
            
            <div style="display:flex;align-items:center;gap:12px;background:var(--bg-glass);padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm)">
              <div style="cursor:grab;color:var(--text-muted)">⣿</div>
              <div class="member-avatar">jd</div>
              <div style="flex:1">
                <input type="text" class="form-input" value="John Doe" style="padding:4px 8px;margin-bottom:4px">
                <input type="text" class="form-input" value="President" style="padding:4px 8px;font-size:12px">
              </div>
              <button class="btn btn-secondary btn-icon">🗑️</button>
            </div>
            
            <div style="display:flex;align-items:center;gap:12px;background:var(--bg-glass);padding:10px;border:1px solid var(--border);border-radius:var(--radius-sm)">
              <div style="cursor:grab;color:var(--text-muted)">⣿</div>
              <div class="member-avatar" style="background:var(--success)">sj</div>
              <div style="flex:1">
                <input type="text" class="form-input" value="Sarah Jane" style="padding:4px 8px;margin-bottom:4px">
                <input type="text" class="form-input" value="Secretary" style="padding:4px 8px;font-size:12px">
              </div>
              <button class="btn btn-secondary btn-icon">🗑️</button>
            </div>

          </div>
          <button class="btn btn-secondary" style="width:100%;justify-content:center">+ Add Committee Member</button>
        </div>
      </div>
    </div>
  </div>
`;

// PAGE: NOTIFICATIONS
pages.notifications = () => `
  <div class="page-header">
    <div>
      <h2>Send Notification</h2>
      <div class="subtitle">Push notifications to the mobile app instantly or schedule them.</div>
    </div>
  </div>
  <div class="page-body">
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>Compose Message</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Notification Type</label>
            <div style="display:flex;gap:10px">
              <label style="flex:1;display:flex;align-items:center;gap:6px;background:var(--bg-glass);padding:10px;border-radius:4px;border:1px solid var(--success);color:var(--success)">
                <input type="radio" name="ntype" checked> 🟢 Info
              </label>
              <label style="flex:1;display:flex;align-items:center;gap:6px;background:var(--bg-glass);padding:10px;border-radius:4px;border:1px solid var(--warning);color:var(--warning)">
                <input type="radio" name="ntype"> 🟠 Important
              </label>
              <label style="flex:1;display:flex;align-items:center;gap:6px;background:var(--bg-glass);padding:10px;border-radius:4px;border:1px solid var(--danger);color:var(--danger)">
                <input type="radio" name="ntype"> 🔴 Emergency
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Target Audience</label>
            <select class="form-select">
              <option>All Members</option>
              <option>Worship Team Only</option>
              <option>Media Team Only</option>
              <option>Specific Individual...</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Message Title</label>
            <input type="text" class="form-input" id="notifTitle" placeholder="Short and catchy..." value="Sunday Service Reminder" oninput="updateNotifPreview()">
          </div>
          <div class="form-group">
            <label class="form-label">Message Body (Max 250 chars)</label>
            <textarea class="form-textarea" id="notifBody" placeholder="Full details..." oninput="updateNotifPreview()">Don't forget to attend the youth fellowship this Sunday at 10 AM!</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Schedule</label>
            <div style="display:flex;gap:10px;align-items:center">
               <input type="datetime-local" class="form-input" style="flex:1" disabled>
               <label style="display:flex;align-items:center;gap:6px;white-space:nowrap">
                 <input type="checkbox" checked onchange="this.parentElement.previousElementSibling.disabled = this.checked"> Send Now
               </label>
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;margin-top:12px">🚀 Send Push Notification</button>
        </div>
      </div>
      
      <div style="display:flex;justify-content:center;align-items:flex-start">
        <!-- Phone Preview Mockup -->
        <div class="phone-preview">
          <div class="notch"></div>
          <div style="font-size:12px;text-align:center;color:#fff;margin-top:10px;font-weight:600">9:41</div>
          
          <div class="phone-notif" style="border-left:4px solid var(--success)">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <div class="logo" style="width:16px;height:16px;border-radius:4px;font-size:10px">✝</div>
              <div class="notif-app" style="margin:0">CY App • Now</div>
            </div>
            <div class="notif-title" id="previewTitle">Sunday Service Reminder</div>
            <div class="notif-body" id="previewBody">Don't forget to attend the youth fellowship this Sunday at 10 AM!</div>
          </div>
          
        </div>
      </div>
    </div>
  </div>
`;

window.updateNotifPreview = () => {
  const t = document.getElementById('notifTitle');
  const b = document.getElementById('notifBody');
  if(t && b) {
    document.getElementById('previewTitle').innerText = t.value || 'Notification Title';
    document.getElementById('previewBody').innerText = b.value || 'Notification body text preview...';
  }
}

// PAGE: PRAYER SCHEDULE
pages.prayer = () => `
  <div class="page-header">
    <div>
      <h2>Prayer Schedule</h2>
      <div class="subtitle">Assign members to daily prayer slots. Drag and drop names into the grid.</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary">Export PDF</button>
      <button class="btn btn-primary">Save Schedule</button>
    </div>
  </div>
  <div class="page-body">
    <div class="card">
      <div class="card-body">
        <div class="prayer-grid">
          <!-- Header -->
          <div class="prayer-cell header">Time</div>
          <div class="prayer-cell header">Mon</div>
          <div class="prayer-cell header">Tue</div>
          <div class="prayer-cell header">Wed</div>
          <div class="prayer-cell header">Thu</div>
          <div class="prayer-cell header">Fri</div>
          <div class="prayer-cell header">Sat</div>
          <div class="prayer-cell header">Sun</div>
          
          <!-- Row 1 -->
          <div class="prayer-cell" style="color:var(--text-muted);font-size:11px;padding-top:20px">06:00 AM</div>
          <div class="prayer-cell slot filled">
            <div class="member-avatar" style="width:24px;height:24px;font-size:10px;margin:0 auto 4px">jd</div>
            <b>John D.</b>
          </div>
          <div class="prayer-cell slot">Empty</div>
          <div class="prayer-cell slot">Empty</div>
          <div class="prayer-cell slot filled">
            <div class="member-avatar" style="width:24px;height:24px;font-size:10px;margin:0 auto 4px;background:var(--success)">sj</div>
            <b>Sarah J.</b>
          </div>
          <div class="prayer-cell slot">Empty</div>
          <div class="prayer-cell slot">Empty</div>
          <div class="prayer-cell slot">Empty</div>
          
          <!-- Row 2 -->
          <div class="prayer-cell" style="color:var(--text-muted);font-size:11px;padding-top:20px">06:30 AM</div>
          <div class="prayer-cell slot">Empty</div>
          <div class="prayer-cell slot">Empty</div>
          <div class="prayer-cell slot">Empty</div>
          <div class="prayer-cell slot">Empty</div>
          <div class="prayer-cell slot">Empty</div>
          <div class="prayer-cell slot">Empty</div>
          <div class="prayer-cell slot">Empty</div>
        </div>
        
        <p class="text-muted mt-24" style="margin-top:24px;font-size:12px;text-align:center">Members will automatically receive a push notification 15 minutes before their assigned prayer slot.</p>
      </div>
    </div>
  </div>
`;

// PAGE: ANALYTICS
pages.analytics = () => `
  <div class="page-header">
    <div>
      <h2>Analytics Dashboard</h2>
      <div class="subtitle">Member growth, attendance, and team distribution.</div>
    </div>
    <div class="header-actions">
      <select class="form-select" style="width:160px"><option>Last 30 Days</option><option>This Year</option></select>
      <button class="btn btn-secondary">Export Report</button>
    </div>
  </div>
  <div class="page-body">
    <div class="grid-2 mb-24">
      <div class="card">
        <div class="card-header"><h3>Member Growth</h3></div>
        <div class="card-body">
          <div class="chart-placeholder">
            <div class="chart-bar" style="height:30%"></div>
            <div class="chart-bar" style="height:40%"></div>
            <div class="chart-bar" style="height:35%"></div>
            <div class="chart-bar" style="height:55%"></div>
            <div class="chart-bar" style="height:80%"></div>
            <div class="chart-bar" style="height:70%"></div>
            <div class="chart-bar" style="height:100%"></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Team Distribution</h3></div>
        <div class="card-body" style="display:flex;align-items:center;justify-content:center;height:250px">
           <div style="width:180px;height:180px;border-radius:50%;background:conic-gradient(var(--accent) 0 40%, var(--success) 40% 70%, var(--warning) 70% 90%, var(--info) 90% 100%); position:relative">
             <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:120px;height:120px;background:var(--bg-card);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column">
               <span style="font-size:24px;font-weight:700">152</span>
               <span style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Members</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  </div>
`;

// PAGE: SETTINGS
pages.settings = () => `
  <div class="page-header">
    <div>
      <h2>App Settings</h2>
      <div class="subtitle">System configurations and admin management. Super Admin access only.</div>
    </div>
  </div>
  <div class="page-body">
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><h3>General Settings</h3></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Organization Name</label>
            <input type="text" class="form-input" value="Church Youth Organization">
          </div>
          <div class="form-group">
            <label class="form-label">App Theme Colour (Hex)</label>
            <div style="display:flex;gap:10px">
              <input type="color" value="#6366f1" style="width:40px;height:40px;padding:0;border:none;background:transparent;cursor:pointer">
              <input type="text" class="form-input" value="#6366f1" style="width:120px">
            </div>
          </div>
          <button class="btn btn-primary mt-24">Save Settings</button>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header"><h3>System Health & APIs</h3></div>
        <div class="card-body">
          <div style="display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div style="font-weight:600;font-size:13px">PostgreSQL Database</div>
                <div style="font-size:11px;color:var(--text-muted)">15ms response time</div>
              </div>
              <span class="tag tag-active">Operational</span>
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div style="font-weight:600;font-size:13px">MinIO Media Storage</div>
                <div style="font-size:11px;color:var(--text-muted)">Storage quota at 24%</div>
              </div>
              <span class="tag tag-active">Operational</span>
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg-glass);border-radius:var(--radius-sm)">
              <div>
                <div style="font-weight:600;font-size:13px">Firebase Push (FCM)</div>
                <div style="font-size:11px;color:var(--text-muted)">Token refreshed 2h ago</div>
              </div>
              <span class="tag tag-active">Operational</span>
            </div>
          </div>
          
          <button class="btn btn-secondary mt-24" style="width:100%;margin-top:16px;justify-content:center">View Audit Logs</button>
        </div>
      </div>
    </div>
  </div>
`;
