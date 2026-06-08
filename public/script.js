const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('complaint-form');
  if (form) {
    form.addEventListener('submit', submitComplaint);
  }

  if (document.getElementById('stats-section')) {
    loadStats();
    loadComplaints();
  }
});

async function submitComplaint(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('title').value,
    category: document.getElementById('category').value,
    description: document.getElementById('description').value,
    complainant_name: document.getElementById('complainant_name').value,
    complainant_email: document.getElementById('complainant_email').value,
    complainant_phone: document.getElementById('complainant_phone').value,
  };

  const msgEl = document.getElementById('form-message');
  try {
    const res = await fetch(`${API_BASE}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    msgEl.className = 'message success';
    msgEl.textContent = `Complaint submitted successfully! Your Complaint ID is ${data.id}. Please save this ID for tracking.`;
    msgEl.style.display = 'block';
    document.getElementById('complaint-form').reset();
  } catch (err) {
    msgEl.className = 'message error';
    msgEl.textContent = `Error: ${err.message}`;
    msgEl.style.display = 'block';
  }
}

async function trackComplaint() {
  const id = document.getElementById('track-id').value;
  const resultEl = document.getElementById('track-result');
  if (!id) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<div class="message error">Please enter a Complaint ID.</div>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/complaints/${id}`);
    if (!res.ok) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = '<div class="message error">Complaint not found.</div>';
      return;
    }
    const c = await res.json();
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="complaint-card">
        <div class="complaint-header">
          <h3>${escapeHtml(c.title)}</h3>
          <span class="badge ${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span>
        </div>
        <div class="complaint-meta">
          <span>ID: ${c.id}</span>
          <span>Category: ${c.category}</span>
          <span>Priority: <span class="badge priority-${c.priority.toLowerCase()}">${c.priority}</span></span>
        </div>
        <p>${escapeHtml(c.description)}</p>
        <div class="complaint-meta" style="margin-top:0.5rem;">
          <span>Submitted: ${new Date(c.created_at).toLocaleDateString()}</span>
          <span>Updated: ${new Date(c.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    `;
  } catch (err) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `<div class="message error">Error: ${err.message}</div>`;
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const data = await res.json();
    document.getElementById('stat-total').textContent = data.total;
    document.getElementById('stat-open').textContent = data.open;
    document.getElementById('stat-in-progress').textContent = data.inProgress;
    document.getElementById('stat-resolved').textContent = data.resolved;
    document.getElementById('stat-closed').textContent = data.closed;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadComplaints() {
  const listEl = document.getElementById('complaints-list');
  if (!listEl) return;
  const filter = document.getElementById('status-filter').value;
  const url = filter ? `${API_BASE}/complaints?status=${filter}` : `${API_BASE}/complaints`;

  try {
    const res = await fetch(url);
    const complaints = await res.json();
    if (complaints.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No complaints found.</div>';
      return;
    }
    listEl.innerHTML = complaints.map(c => `
      <div class="complaint-card">
        <div class="complaint-header">
          <h3>#${c.id} - ${escapeHtml(c.title)}</h3>
          <div>
            <span class="badge ${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span>
            <span class="badge priority-${c.priority.toLowerCase()}" style="margin-left:0.3rem;">${c.priority}</span>
          </div>
        </div>
        <div class="complaint-meta">
          <span>${escapeHtml(c.complainant_name)}</span>
          <span>${c.category}</span>
          <span>${new Date(c.created_at).toLocaleDateString()}</span>
          ${c.assigned_to ? `<span>Assigned: ${escapeHtml(c.assigned_to)}</span>` : ''}
        </div>
        <p>${escapeHtml(c.description.substring(0, 150))}${c.description.length > 150 ? '...' : ''}</p>
        <div class="complaint-actions">
          <button class="btn btn-secondary btn-sm" onclick="viewComplaint(${c.id})">View / Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteComplaint(${c.id})">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    listEl.innerHTML = `<div class="message error">Error loading complaints: ${err.message}</div>`;
  }
}

async function viewComplaint(id) {
  try {
    const res = await fetch(`${API_BASE}/complaints/${id}`);
    const c = await res.json();
    const modal = document.getElementById('complaint-modal');
    const body = document.getElementById('modal-body');
    document.getElementById('modal-title').textContent = `Complaint #${c.id}`;

    body.innerHTML = `
      <div class="detail-row"><strong>Title</strong> ${escapeHtml(c.title)}</div>
      <div class="detail-row"><strong>Category</strong> ${c.category}</div>
      <div class="detail-row"><strong>Description</strong> ${escapeHtml(c.description)}</div>
      <div class="detail-row"><strong>Submitted By</strong> ${escapeHtml(c.complainant_name)} (${escapeHtml(c.complainant_email)}) ${c.complainant_phone ? `- ${c.complainant_phone}` : ''}</div>
      <div class="detail-row"><strong>Created</strong> ${new Date(c.created_at).toLocaleString()}</div>
      <div class="detail-row"><strong>Last Updated</strong> ${new Date(c.updated_at).toLocaleString()}</div>
      <hr style="margin:1rem 0;">
      <h3>Update Complaint</h3>
      <div class="edit-form">
        <label>Status</label>
        <select id="edit-status">
          <option value="Open" ${c.status === 'Open' ? 'selected' : ''}>Open</option>
          <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          <option value="Closed" ${c.status === 'Closed' ? 'selected' : ''}>Closed</option>
        </select>
        <label>Priority</label>
        <select id="edit-priority">
          <option value="Low" ${c.priority === 'Low' ? 'selected' : ''}>Low</option>
          <option value="Medium" ${c.priority === 'Medium' ? 'selected' : ''}>Medium</option>
          <option value="High" ${c.priority === 'High' ? 'selected' : ''}>High</option>
        </select>
        <label>Assigned To</label>
        <input type="text" id="edit-assigned" value="${escapeHtml(c.assigned_to || '')}">
        <label>Remarks</label>
        <textarea id="edit-remarks" rows="3">${escapeHtml(c.remarks || '')}</textarea>
        <button class="btn btn-primary" style="margin-top:0.8rem;" onclick="updateComplaint(${c.id})">Save Changes</button>
      </div>
    `;
    modal.style.display = 'flex';
  } catch (err) {
    alert('Error loading complaint: ' + err.message);
  }
}

async function updateComplaint(id) {
  const payload = {
    status: document.getElementById('edit-status').value,
    priority: document.getElementById('edit-priority').value,
    assigned_to: document.getElementById('edit-assigned').value || null,
    remarks: document.getElementById('edit-remarks').value || null,
  };

  try {
    const res = await fetch(`${API_BASE}/complaints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    closeModal();
    loadComplaints();
    loadStats();
  } catch (err) {
    alert('Error updating complaint: ' + err.message);
  }
}

async function deleteComplaint(id) {
  if (!confirm('Are you sure you want to delete this complaint?')) return;
  try {
    const res = await fetch(`${API_BASE}/complaints/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error);
    loadComplaints();
    loadStats();
  } catch (err) {
    alert('Error deleting complaint: ' + err.message);
  }
}

function closeModal() {
  document.getElementById('complaint-modal').style.display = 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
