// pages/app.js
const pages = {};

function initApp() {
  // Check auth state
  if (localStorage.getItem('auth_token')) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appShell').style.display = 'flex';
    navigateTo('dashboard');
  } else {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('appShell').style.display = 'none';
  }

  // Bind sidebar nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const page = e.currentTarget.getAttribute('data-page');
      if (page) navigateTo(page);
    });
  });
}

function navigateTo(pageId) {
  const main = document.getElementById('mainContent');
  if (pages[pageId]) {
    main.innerHTML = pages[pageId]();
    if (pageLoaders[pageId]) pageLoaders[pageId]();
  } else {
    main.innerHTML = `<div class="page-header"><h2>Not Implemented</h2></div><div class="page-body">Page ${pageId} is coming soon.</div>`;
  }
}

// Login flows
function showOTP() {
  document.getElementById('phoneStep').style.display = 'none';
  document.getElementById('otpStep').style.display = 'block';
}

function otpNext(el) {
  if (el.value.length === 1 && el.nextElementSibling) {
    el.nextElementSibling.focus();
  }
}

function doLogin() {
  localStorage.setItem('auth_token', 'demo-token');
  initApp();
}

function doLogout() {
  localStorage.removeItem('auth_token');
  initApp();
}

const pageLoaders = {};

// PAGE: DASHBOARD
pages.dashboard = () => `
  <div class="page-header">
    <div>
      <h2>Dashboard</h2>
      <div class="subtitle">Welcome back, Super Admin. Here's what's happening.</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" onclick="navigateTo('members_import')">📥 Import Members</button>
      <button class="btn btn-primary" onclick="navigateTo('events_new')">+ Create Event</button>
    </div>
  </div>
  <div class="page-body">
    <div class="stats-grid">
      <div class="stat-card purple">
        <div class="stat-icon">👥</div>
        <div class="stat-value">152</div>
        <div class="stat-label">Total Members</div>
        <div class="stat-trend up">↑ 12 this month</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">📅</div>
        <div class="stat-value">4</div>
        <div class="stat-label">Events This Month</div>
        <div class="stat-trend up">2 upcoming</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-icon">🖼️</div>
        <div class="stat-value">840</div>
        <div class="stat-label">Photos Uploaded</div>
        <div class="stat-trend">12 albums</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon">🎂</div>
        <div class="stat-value">3</div>
        <div class="stat-label">Birthdays This Week</div>
        <div class="stat-trend up">Next: Tomorrow</div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <h3>Recent Activity</h3>
        </div>
        <div class="card-body">
          <div class="activity-item">
            <div class="activity-dot" style="background:var(--success)"></div>
            <div>
              <div class="activity-text"><b>John Doe</b> uploaded 14 photos to "Youth Retreat 2026"</div>
              <div class="activity-time">2 hours ago</div>
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-dot" style="background:var(--info)"></div>
            <div>
              <div class="activity-text"><b>Admin</b> created event "Sunday Fellowship"</div>
              <div class="activity-time">5 hours ago</div>
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-dot" style="background:var(--accent)"></div>
            <div>
              <div class="activity-text">45 members imported via Google Sheets</div>
              <div class="activity-time">Yesterday at 14:30</div>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3>Upcoming Birthdays</h3>
        </div>
        <div class="card-body">
          <table class="data-table">
            <tbody>
              <tr>
                <td>
                  <div class="member-cell">
                    <div class="member-avatar">SA</div>
                    <div>
                      <div class="member-name">Sarah Anderson</div>
                      <div class="member-email">Turns 22 • Tomorrow</div>
                    </div>
                  </div>
                </td>
                <td style="text-align:right"><button class="btn btn-secondary btn-sm">Wish</button></td>
              </tr>
              <tr>
                <td>
                  <div class="member-cell">
                    <div class="member-avatar" style="background:linear-gradient(135deg,var(--warning),#ea580c)">MJ</div>
                    <div>
                      <div class="member-name">Michael Johnson</div>
                      <div class="member-email">Turns 25 • May 25</div>
                    </div>
                  </div>
                </td>
                <td style="text-align:right"><button class="btn btn-secondary btn-sm">Wish</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
`;

// PAGE: MEMBERS
pages.members = () => `
  <div class="page-header">
    <div>
      <h2>Members Directory</h2>
      <div class="subtitle">Manage all 152 registered members.</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" onclick="navigateTo('members_import')">📥 Import from Sheets</button>
      <button class="btn btn-primary" onclick="navigateTo('members_new')">+ Add Member</button>
    </div>
  </div>
  <div class="page-body">
    <div class="card">
      <div class="card-body">
        <div class="flex-between mb-24">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" class="form-input" placeholder="Search members by name or phone...">
          </div>
          <div style="display:flex;gap:10px">
            <select class="form-select" style="width:140px">
              <option>All Teams</option>
              <option>Worship</option>
              <option>Media</option>
              <option>Ushering</option>
            </select>
            <select class="form-select" style="width:140px">
              <option>Active Status</option>
              <option>Alumni</option>
            </select>
          </div>
        </div>
        
        <table class="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Phone</th>
              <th>Team</th>
              <th>DOB</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="member-cell">
                  <div class="member-avatar">jd</div>
                  <div>
                    <div class="member-name">John Doe</div>
                    <div class="member-email">john.doe@example.com</div>
                  </div>
                </div>
              </td>
              <td>+91 9876543210</td>
              <td><span class="tag tag-purple">Worship</span></td>
              <td>15 Aug 2001</td>
              <td><span class="tag tag-active">Active</span></td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="navigateTo('members_view')">Edit</button>
              </td>
            </tr>
            <tr>
              <td>
                <div class="member-cell">
                  <div class="member-avatar" style="background:var(--success)">sj</div>
                  <div>
                    <div class="member-name">Sarah Jane</div>
                    <div class="member-email">sarah.j@example.com</div>
                  </div>
                </div>
              </td>
              <td>+91 9123456780</td>
              <td><span class="tag tag-blue">Media</span></td>
              <td>22 May 2004</td>
              <td><span class="tag tag-active">Active</span></td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="navigateTo('members_view')">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
`;

// PAGE: IMPORT MEMBERS
pages.members_import = () => `
  <div class="page-header">
    <div>
      <h2>Import Members</h2>
      <div class="subtitle">Bulk import members from a Google Form linked Sheet.</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-secondary" onclick="navigateTo('members')">Cancel</button>
    </div>
  </div>
  <div class="page-body">
    <div class="wizard-steps">
      <div class="wizard-step active" id="wStep1">
        <div class="step-num">1</div>
        <div class="step-label">Paste URL</div>
      </div>
      <div class="wizard-connector"></div>
      <div class="wizard-step" id="wStep2">
        <div class="step-num">2</div>
        <div class="step-label">Map Columns</div>
      </div>
      <div class="wizard-connector"></div>
      <div class="wizard-step" id="wStep3">
        <div class="step-num">3</div>
        <div class="step-label">Review & Import</div>
      </div>
    </div>

    <!-- Step 1 Content -->
    <div class="card" id="step1Content">
      <div class="card-header">
        <h3>1. Link Google Sheet</h3>
      </div>
      <div class="card-body">
        <div style="background:rgba(59,130,246,0.1); border-left:4px solid var(--info); padding:16px; border-radius:4px; margin-bottom:24px">
          <strong>Important Setup:</strong> Ensure your Google Sheet is shared with our service account email: <code>import-bot@cy-app-project.iam.gserviceaccount.com</code> OR shared as "Anyone with the link can view". Photos uploaded via Forms should be stored in a shared Drive folder.
        </div>
        
        <div class="form-group">
          <label class="form-label">Google Sheet URL</label>
          <input type="text" class="form-input" id="sheetUrl" placeholder="https://docs.google.com/spreadsheets/d/...">
        </div>
        
        <button class="btn btn-primary" onclick="proceedToStep2()">Validate & Preview Sheet</button>
      </div>
    </div>

    <!-- Step 2 & 3 Placeholder (Will be toggled via JS) -->
    <div id="step2Content" style="display:none;">
      <div class="card mb-24">
        <div class="card-header">
          <h3>2. Auto-Detected Columns</h3>
        </div>
        <div class="card-body">
          <p class="mb-16 text-muted">We fetched the first 3 rows. Please confirm column mapping.</p>
          <table class="data-table">
            <thead>
              <tr>
                <th>Sheet Column</th>
                <th>Maps To</th>
                <th>Preview Row 1</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Full Name</b></td>
                <td>
                  <select class="form-select" style="border-color:var(--success)">
                    <option selected>Name</option>
                  </select>
                </td>
                <td>John Doe</td>
              </tr>
              <tr>
                <td><b>Phone Number</b></td>
                <td>
                  <select class="form-select" style="border-color:var(--success)">
                    <option selected>Phone</option>
                  </select>
                </td>
                <td>+919876543210</td>
              </tr>
              <tr>
                <td><b>Your Team</b></td>
                <td>
                  <select class="form-select" style="border-color:var(--warning)">
                    <option selected>Team</option>
                  </select>
                </td>
                <td>Worship</td>
              </tr>
            </tbody>
          </table>
          <div class="form-group mt-24" style="margin-top:24px">
            <label class="form-label">Duplicate Handling</label>
            <div style="display:flex; gap:16px;">
              <label style="display:flex;align-items:center;gap:6px"><input type="radio" name="conflict" checked> Skip duplicate phones</label>
              <label style="display:flex;align-items:center;gap:6px"><input type="radio" name="conflict"> Overwrite existing</label>
            </div>
          </div>
          <button class="btn btn-primary mt-24" onclick="proceedToStep3()">Start Import (45 rows)</button>
        </div>
      </div>
    </div>

    <div id="step3Content" style="display:none; text-align:center; padding:40px">
      <div style="font-size:48px; margin-bottom:16px">✅</div>
      <h2 style="margin-bottom:8px">Import Successful</h2>
      <p style="color:var(--text-muted); margin-bottom:24px">Imported 45 members, skipped 2 duplicates.</p>
      <button class="btn btn-primary" onclick="navigateTo('members')">Go to Members Directory</button>
    </div>
  </div>
`;

window.proceedToStep2 = () => {
  document.getElementById('wStep1').classList.add('done');
  document.getElementById('wStep1').classList.remove('active');
  document.querySelector('.wizard-connector').classList.add('done');
  document.getElementById('wStep2').classList.add('active');
  
  document.getElementById('step1Content').style.display = 'none';
  document.getElementById('step2Content').style.display = 'block';
};

window.proceedToStep3 = () => {
  document.getElementById('wStep2').classList.add('done');
  document.getElementById('wStep2').classList.remove('active');
  document.querySelectorAll('.wizard-connector')[1].classList.add('done');
  document.getElementById('wStep3').classList.add('active');
  
  document.getElementById('step2Content').style.display = 'none';
  document.getElementById('step3Content').style.display = 'block';
};

// Initialize if script loaded
document.addEventListener('DOMContentLoaded', initApp);
