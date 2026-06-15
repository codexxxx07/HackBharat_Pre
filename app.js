// Skeleton loader — removes overlay after 2 seconds
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('skeleton-loader');
    if (loader) {
      loader.style.transition = 'opacity 0.5s ease';
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  }, 2000);
});

// ============================================
// SECURITY UTILITY — XSS Prevention
// ============================================
/**
 * Escapes a string for safe insertion as HTML text content.
 * Prevents XSS from any user-supplied or stored data.
 */
function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Safely converts markdown bold (**text**) and newlines to HTML.
 * Only applies to AI-generated responses, never raw user input.
 */
function safeMarkdownToHTML(str) {
  if (str == null) return '';
  return escapeHTML(str)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ============================================
// RATE LIMITING UTILITY
// ============================================
/**
 * Returns a debounced version of a function.
 * Prevents duplicate rapid calls (e.g., spam clicking Send).
 */
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) return; // block while cooldown is active
    fn.apply(this, args);
    timer = setTimeout(() => { timer = null; }, delay);
  };
}

// ============================================
// INPUT VALIDATION
// ============================================
const INPUT_LIMITS = {
  title: 200,
  description: 2000,
  logs: 5000,
  resolution: 2000,
  chat: 1000
};

/**
 * Trims and enforces max-length on a string value.
 */
function sanitizeInput(value, maxLength) {
  if (value == null) return '';
  return String(value).trim().slice(0, maxLength);
}

// ============================================
// THEME TOGGLE
// ============================================
(function () {
  const themeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;

  // Check saved preference or default to light
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    html.classList.add('dark');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      html.classList.toggle('dark');
      const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
      localStorage.setItem('theme', currentTheme);
    });
  }
})();

// ============================================
// API CONFIGURATION (loaded from config.js)
// ============================================
// GROQ_API_KEY, HINDSIGHT_API_KEY, HINDSIGHT_BANK_ID, HINDSIGHT_API_URL
// are defined in config.js which is loaded before this script.

// ============================================
// STATE MANAGEMENT
// ============================================
let incidents = [];
let memories = [];
let currentSection = 'dashboard';
let isChatLoading = false; // rate-limit guard for chat

// ============================================
// SAMPLE DATA — Pre-loaded incidents
// ============================================
const sampleIncidents = [
  {
    id: 'INC-001',
    title: 'Database Connection Pool Exhausted',
    severity: 'Critical',
    status: 'Resolved',
    date: '2024-01-15',
    description: 'All database connections were exhausted, causing application downtime.',
    logs: 'ERROR: HikariPool-1 - Connection is not available, request timed out after 30000ms.',
    resolution: 'Increased connection pool size from 10 to 50 and implemented connection leak detection.'
  },
  {
    id: 'INC-002',
    title: 'Kubernetes Pod CrashLoopBackOff',
    severity: 'High',
    status: 'Resolved',
    date: '2024-01-18',
    description: 'Multiple pods entering CrashLoopBackOff state due to OOMKilled.',
    logs: 'Warning  OOMKilled  Kill container  pod was OOMKilled',
    resolution: 'Increased memory limits from 512Mi to 1Gi and optimized memory usage in application code.'
  },
  {
    id: 'INC-003',
    title: 'Redis Memory Overflow',
    severity: 'High',
    status: 'Open',
    date: '2024-01-20',
    description: 'Redis instance reaching maximum memory limit, causing evictions.',
    logs: 'WARNING overused_memory > maxmemory',
    resolution: ''
  },
  {
    id: 'INC-004',
    title: 'SSL Certificate Expiry',
    severity: 'Medium',
    status: 'Resolved',
    date: '2024-01-22',
    description: 'SSL certificate expired, causing HTTPS connection failures.',
    logs: 'SSL certificate has expired',
    resolution: "Renewed SSL certificate and set up automated renewal with Let's Encrypt."
  },
  {
    id: 'INC-005',
    title: 'API Rate Limit Exceeded',
    severity: 'Medium',
    status: 'Resolved',
    date: '2024-01-25',
    description: 'External API rate limit exceeded, causing service degradation.',
    logs: '429 Too Many Requests',
    resolution: 'Implemented exponential backoff retry mechanism and request queuing.'
  }
];

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Load from localStorage first, with safe JSON parse
  let storedIncidents = null;
  try {
    const raw = localStorage.getItem('recallops-incidents');
    if (raw) {
      storedIncidents = JSON.parse(raw);
      // Basic integrity check — must be a non-empty array
      if (!Array.isArray(storedIncidents)) storedIncidents = null;
    }
  } catch (e) {
    console.warn('Failed to parse stored incidents, resetting to sample data.', e);
    localStorage.removeItem('recallops-incidents');
  }

  if (storedIncidents) {
    incidents = storedIncidents;
    memories = [...storedIncidents];
  } else {
    incidents = [...sampleIncidents];
    memories = [...sampleIncidents];
  }

  // Initialize UI
  renderDashboard();
  renderMemoryViewer();

  // Setup event listeners
  setupEventListeners();
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Incident form submission
  const form = document.getElementById('incident-form');
  if (form) form.addEventListener('submit', handleIncidentSubmit);

  // Chat input enter key — debounced to prevent rapid firing
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        debouncedSendMessage();
      }
    });
  }

  // Modal close button
  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  const closeAction = document.getElementById('modal-close-action');
  if (closeAction) closeAction.addEventListener('click', closeModal);

  // Click backdrop to close modal
  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) backdrop.addEventListener('click', closeModal);

  // ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('incident-modal');
      if (modal && !modal.classList.contains('hidden')) {
        closeModal();
      }
    }
  });
}

// ============================================
// NAVIGATION
// ============================================
function showSection(sectionId) {
  // Whitelist allowed section IDs to prevent arbitrary DOM manipulation
  const allowed = ['dashboard', 'chat', 'logger', 'memory'];
  if (!allowed.includes(sectionId)) return;

  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.add('hidden');
  });

  // Show selected section
  const target = document.getElementById(`section-${sectionId}`);
  if (target) target.classList.remove('hidden');

  // Update navigation buttons — reset all
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('bg-gray-100', 'dark:bg-white/10', 'bg-white/10', 'text-electric-blue');
    btn.classList.add('text-gray-500', 'dark:text-gray-400');
  });

  // Activate selected nav button
  const activeBtn = document.getElementById(`nav-${sectionId}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-gray-100', 'text-electric-blue');
    activeBtn.classList.remove('text-gray-500', 'dark:text-gray-400');
  }

  currentSection = sectionId;

  if (sectionId === 'dashboard') renderDashboard();
  else if (sectionId === 'memory') renderMemoryViewer();
}

// ============================================
// DASHBOARD RENDERING
// ============================================
function renderDashboard() {
  // Update stats — safe: only numbers, no user input
  const totalEl = document.getElementById('stat-total');
  const resolvedEl = document.getElementById('stat-resolved');
  const memoryEl = document.getElementById('stat-memory');

  if (totalEl) totalEl.textContent = incidents.length;
  if (resolvedEl) resolvedEl.textContent = incidents.filter(i => i.status === 'Resolved').length;
  if (memoryEl) memoryEl.textContent = memories.length;

  // Render incidents table using safe DOM construction (no raw innerHTML with user data)
  const tableBody = document.getElementById('incidents-table');
  if (!tableBody) return;

  // Use DocumentFragment for efficient single-pass DOM update
  const fragment = document.createDocumentFragment();

  incidents.forEach(incident => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors';

    // Build cells with textContent to prevent XSS
    const cells = [
      { text: incident.id || '', classes: 'py-4 text-sm text-gray-500 dark:text-gray-400' },
      { text: incident.title || '', classes: 'py-4 font-medium' },
    ];

    cells.forEach(({ text, classes }) => {
      const td = document.createElement('td');
      td.className = classes;
      td.textContent = text;
      tr.appendChild(td);
    });

    // Severity badge
    const severityTd = document.createElement('td');
    severityTd.className = 'py-4';
    const severitySpan = document.createElement('span');
    severitySpan.className = `px-3 py-1 rounded-full text-xs font-medium ${getSeverityClass(incident.severity)}${incident.severity === 'Critical' ? ' animate-pulse-glow' : ''}`;
    severitySpan.textContent = incident.severity || '';
    severityTd.appendChild(severitySpan);
    tr.appendChild(severityTd);

    // Status badge
    const statusTd = document.createElement('td');
    statusTd.className = 'py-4';
    const statusSpan = document.createElement('span');
    statusSpan.className = `px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(incident.status)}`;
    statusSpan.textContent = incident.status || '';
    statusTd.appendChild(statusSpan);
    tr.appendChild(statusTd);

    // Date
    const dateTd = document.createElement('td');
    dateTd.className = 'py-4 text-sm text-gray-500 dark:text-gray-400';
    dateTd.textContent = incident.date || '';
    tr.appendChild(dateTd);

    // Action button — use data attribute instead of inline onclick with string interpolation
    const actionTd = document.createElement('td');
    actionTd.className = 'py-4';
    const viewBtn = document.createElement('button');
    viewBtn.className = 'text-electric-blue hover:text-purple transition-colors text-sm font-medium';
    viewBtn.textContent = 'View';
    viewBtn.dataset.incidentId = incident.id;
    // Debounced to prevent rapid clicks opening multiple modals
    viewBtn.addEventListener('click', debouncedViewIncident);
    actionTd.appendChild(viewBtn);
    tr.appendChild(actionTd);

    fragment.appendChild(tr);
  });

  tableBody.innerHTML = ''; // clear once
  tableBody.appendChild(fragment);
}

function getSeverityClass(severity) {
  switch (severity) {
    case 'Critical': return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'High':     return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'Medium':   return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'Low':      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    default:         return 'bg-gray-500/20 text-gray-400';
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'Resolved':    return 'bg-green-500/20 text-green-400';
    case 'Open':        return 'bg-red-500/20 text-red-400';
    case 'In Progress': return 'bg-yellow-500/20 text-yellow-400';
    default:            return 'bg-gray-500/20 text-gray-400';
  }
}

// Core view function — separated from debounce wrapper
function viewIncident(id) {
  if (!id) return;

  const incident = incidents.find(i => i.id === id);
  if (!incident) {
    console.warn('Incident not found:', id);
    return;
  }

  // Populate modal using textContent — never innerHTML with user data
  const setTextById = (elementId, value) => {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value || '';
  };

  setTextById('modal-id', incident.id);
  setTextById('modal-title', incident.title);
  setTextById('modal-date', incident.date);
  setTextById('modal-description', incident.description);
  setTextById('modal-logs-content', incident.logs || 'No logs available');

  // Severity badge
  const severityBadge = document.getElementById('modal-severity');
  if (severityBadge) {
    severityBadge.textContent = incident.severity || '';
    severityBadge.className = `px-3 py-1 rounded-full text-xs font-medium ${getSeverityClass(incident.severity)}`;
  }

  // Status badge
  const statusBadge = document.getElementById('modal-status');
  if (statusBadge) {
    statusBadge.textContent = incident.status || '';
    statusBadge.className = `px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(incident.status)}`;
  }

  // Resolution section — show/hide based on content
  const resolutionSection = document.getElementById('modal-resolution-section');
  const resolutionText = document.getElementById('modal-resolution');
  if (resolutionSection && resolutionText) {
    if (incident.resolution) {
      resolutionSection.classList.remove('hidden');
      resolutionText.textContent = incident.resolution;
    } else {
      resolutionSection.classList.add('hidden');
      resolutionText.textContent = '';
    }
  }

  // Show modal with animation
  const modal = document.getElementById('incident-modal');
  const backdrop = document.getElementById('modal-backdrop');
  const modalCard = document.getElementById('modal-card'); // stable ID selector

  if (!modal || !backdrop || !modalCard) return;

  modal.classList.remove('hidden');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      backdrop.classList.remove('opacity-0');
      modalCard.classList.remove('scale-95', 'opacity-0');
      modalCard.classList.add('scale-100', 'opacity-100');
    });
  });
}

// Debounced wrapper — prevents double-open from rapid clicks
const debouncedViewIncident = debounce(function (e) {
  const id = e.currentTarget.dataset.incidentId;
  viewIncident(id);
}, 400);

function closeModal() {
  const modal = document.getElementById('incident-modal');
  const backdrop = document.getElementById('modal-backdrop');
  const modalCard = document.getElementById('modal-card'); // stable ID selector

  if (!modal || !backdrop || !modalCard) return;

  backdrop.classList.add('opacity-0');
  modalCard.classList.remove('scale-100', 'opacity-100');
  modalCard.classList.add('scale-95', 'opacity-0');

  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
}

// ============================================
// CHAT INTERFACE
// ============================================
async function sendMessage() {
  // Guard: block if a request is already in flight
  if (isChatLoading) return;

  const input = document.getElementById('chat-input');
  const sendBtn = input?.closest('.flex')?.querySelector('button');
  if (!input) return;

  const raw = input.value;
  const message = sanitizeInput(raw, INPUT_LIMITS.chat);

  if (!message) return;

  isChatLoading = true;

  // Disable send button during request
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }

  // Display user message — escaped for XSS safety
  addChatMessage(message, 'user');
  input.value = '';

  showLoading();

  try {
    const memoryContext = await retrieveMemories(message);
    const aiResponse = await generateAIResponse(message, memoryContext);

    removeLoading();
    addChatMessage(aiResponse, 'ai');
    displayMemoryContext(memoryContext);

  } catch (error) {
    console.error('Error in chat flow:', error);
    removeLoading();
    addChatMessage('Sorry, I encountered an error. Please check your API keys and try again.', 'ai');
  } finally {
    isChatLoading = false;
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
}

// Debounced wrapper prevents Enter-key spamming
const debouncedSendMessage = debounce(sendMessage, 500);

function addChatMessage(message, type) {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;

  const messageDiv = document.createElement('div');

  if (type === 'user') {
    messageDiv.className = 'flex justify-end';
    const bubble = document.createElement('div');
    bubble.className = 'bg-electric-blue text-white rounded-lg p-4 max-w-[80%]';
    const p = document.createElement('p');
    p.textContent = message; // textContent — never innerHTML for user input
    bubble.appendChild(p);
    messageDiv.appendChild(bubble);
  } else {
    messageDiv.className = 'flex justify-start';
    const bubble = document.createElement('div');
    bubble.className = 'bg-white dark:bg-[#12121a] border border-gray-200 dark:border-white/10 rounded-lg p-4 max-w-[80%]';
    const p = document.createElement('p');
    p.className = 'text-gray-600 dark:text-gray-300';
    // AI responses: sanitize then allow bold/newlines only
    p.innerHTML = safeMarkdownToHTML(message);
    bubble.appendChild(p);
    messageDiv.appendChild(bubble);
  }

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showLoading() {
  const chatContainer = document.getElementById('chat-messages');
  if (!chatContainer) return;

  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading-indicator';
  loadingDiv.className = 'flex justify-start';
  loadingDiv.innerHTML = `
    <div class="bg-card border border-white/10 rounded-lg p-4">
      <div class="flex gap-1">
        <div class="w-2 h-2 bg-electric-blue rounded-full animate-bounce-dots" style="animation-delay: 0s"></div>
        <div class="w-2 h-2 bg-electric-blue rounded-full animate-bounce-dots" style="animation-delay: 0.2s"></div>
        <div class="w-2 h-2 bg-electric-blue rounded-full animate-bounce-dots" style="animation-delay: 0.4s"></div>
      </div>
    </div>
  `;
  chatContainer.appendChild(loadingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeLoading() {
  const loading = document.getElementById('loading-indicator');
  if (loading) loading.remove();
}

async function retrieveMemories(query) {
  // Fallback to local memories if API keys are absent
  const hasHindsight = typeof HINDSIGHT_API_KEY !== 'undefined' && HINDSIGHT_API_KEY &&
                       typeof HINDSIGHT_BANK_ID !== 'undefined' && HINDSIGHT_BANK_ID &&
                       typeof HINDSIGHT_API_URL !== 'undefined' && HINDSIGHT_API_URL;

  if (!hasHindsight) {
    return memories.slice(0, 3).map(m => ({
      content: `${m.title}: ${m.description}\nResolution: ${m.resolution}`,
      metadata: m
    }));
  }

  try {
    const response = await fetch(`${HINDSIGHT_API_URL}/v1/default/banks/${HINDSIGHT_BANK_ID}/recall`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HINDSIGHT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sanitizeInput(query, INPUT_LIMITS.chat), numResults: 3 })
    });

    if (!response.ok) throw new Error(`Hindsight API error: ${response.status}`);

    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];

  } catch (error) {
    console.error('Error retrieving memories:', error);
    // Graceful fallback — never crash the chat
    return memories.slice(0, 3).map(m => ({
      content: `${m.title}: ${m.description}\nResolution: ${m.resolution}`,
      metadata: m
    }));
  }
}

async function generateAIResponse(userMessage, memoryContext) {
  // Determine if a real Groq key is available
  const hasGroq = typeof GROQ_API_KEY !== 'undefined' && GROQ_API_KEY &&
                  GROQ_API_KEY !== 'YOUR_GROQ_API_KEY';

  if (!hasGroq) {
    return generateMockResponse(userMessage, memoryContext);
  }

  try {
    const memoryText = Array.isArray(memoryContext)
      ? memoryContext.map(m => m.content || '').join('\n\n')
      : '';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: 'You are RecallOps, an expert DevOps incident response AI. You have access to past incident memory. Always reference past incidents when relevant. Be concise and actionable.'
          },
          {
            role: 'system',
            content: `Past memory context:\n${memoryText}`
          },
          {
            role: 'user',
            content: userMessage
          }
        ]
      })
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);

    const data = await response.json();
    // Safe access with optional chaining and fallback
    return data?.choices?.[0]?.message?.content || generateMockResponse(userMessage, memoryContext);

  } catch (error) {
    console.error('Error generating AI response:', error);
    return generateMockResponse(userMessage, memoryContext);
  }
}

function generateMockResponse(userMessage, memoryContext) {
  const relevantMemories = Array.isArray(memoryContext) ? memoryContext.slice(0, 2) : [];

  let response = `Based on your description, here's my analysis:\n\n`;

  if (relevantMemories.length > 0) {
    response += `📚 **Similar Past Incidents:**\n`;
    relevantMemories.forEach((mem, index) => {
      const title = mem.metadata?.title || 'Unknown incident';
      const resolution = mem.metadata?.resolution || 'No resolution recorded';
      response += `${index + 1}. ${title}\n   Resolution: ${resolution}\n\n`;
    });
  }

  response += `💡 **Recommended Actions:**\n`;
  response += `1. Check system logs for error patterns\n`;
  response += `2. Verify resource utilization (CPU, memory, disk)\n`;
  response += `3. Review recent changes or deployments\n`;
  response += `4. If similar to past incidents, apply the same resolution steps\n\n`;
  response += `Would you like me to provide more specific guidance?`;

  return response;
}

function displayMemoryContext(memoryContext) {
  const contextPanel = document.getElementById('memory-context');
  if (!contextPanel) return;

  if (!Array.isArray(memoryContext) || memoryContext.length === 0) {
    contextPanel.textContent = '';
    const p = document.createElement('p');
    p.className = 'text-gray-400 dark:text-gray-500 text-sm text-center py-8';
    p.textContent = 'No similar memories found.';
    contextPanel.appendChild(p);
    return;
  }

  // Build with DOM API — no raw innerHTML with user data
  const fragment = document.createDocumentFragment();

  memoryContext.forEach((mem, index) => {
    const card = document.createElement('div');
    card.className = 'bg-gray-50/50 dark:bg-[#0a0a0f]/50 border border-gray-200 dark:border-white/10 rounded-lg p-3 hover:border-electric-blue/30 transition-colors';

    const header = document.createElement('div');
    header.className = 'flex items-center gap-2 mb-2';

    const badge = document.createElement('span');
    badge.className = 'w-6 h-6 bg-electric-blue/20 rounded-full flex items-center justify-center text-xs text-electric-blue';
    badge.textContent = index + 1;

    const severity = document.createElement('span');
    severity.className = 'text-xs font-medium text-purple-400';
    severity.textContent = mem.metadata?.severity || 'Unknown';

    header.appendChild(badge);
    header.appendChild(severity);

    const title = document.createElement('p');
    title.className = 'text-sm text-gray-700 dark:text-gray-300 font-medium mb-1';
    title.textContent = mem.metadata?.title || 'Unknown incident';

    const date = document.createElement('p');
    date.className = 'text-xs text-gray-500 dark:text-gray-400';
    date.textContent = mem.metadata?.date || 'Unknown date';

    card.appendChild(header);
    card.appendChild(title);
    card.appendChild(date);
    fragment.appendChild(card);
  });

  contextPanel.innerHTML = '';
  contextPanel.appendChild(fragment);
}

// ============================================
// INCIDENT LOGGER
// ============================================
let isSubmitting = false; // rate-limit guard for form

async function handleIncidentSubmit(e) {
  e.preventDefault();

  // Prevent double-submit
  if (isSubmitting) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  isSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }

  try {
    // Sanitize and validate all inputs
    const title = sanitizeInput(document.getElementById('incident-title')?.value, INPUT_LIMITS.title);
    const severity = document.getElementById('incident-severity')?.value || '';
    const description = sanitizeInput(document.getElementById('incident-description')?.value, INPUT_LIMITS.description);
    const logs = sanitizeInput(document.getElementById('incident-logs')?.value, INPUT_LIMITS.logs);
    const resolution = sanitizeInput(document.getElementById('incident-resolution')?.value, INPUT_LIMITS.resolution);

    // Validate required fields
    if (!title || !severity || !description) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    // Validate severity is one of the allowed values
    const allowedSeverities = ['Critical', 'High', 'Medium', 'Low'];
    if (!allowedSeverities.includes(severity)) {
      showToast('Invalid severity value.', 'error');
      return;
    }

    const incident = {
      id: `INC-${String(incidents.length + 1).padStart(3, '0')}`,
      title,
      severity,
      description,
      logs,
      resolution,
      status: resolution ? 'Resolved' : 'Open',
      date: new Date().toISOString().split('T')[0]
    };

    incidents.push(incident);
    memories.push(incident);

    // Persist to localStorage — wrapped in try/catch for storage quota errors
    try {
      localStorage.setItem('recallops-incidents', JSON.stringify(incidents));
    } catch (storageErr) {
      console.warn('localStorage write failed:', storageErr);
    }

    await storeMemory(incident);

    document.getElementById('incident-form')?.reset();

    showToast('Incident saved successfully!');
    renderDashboard();
    renderMemoryViewer();

  } catch (err) {
    console.error('Error submitting incident:', err);
    showToast('An error occurred. Please try again.', 'error');
  } finally {
    isSubmitting = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
}

async function storeMemory(incident) {
  const hasHindsight = typeof HINDSIGHT_API_KEY !== 'undefined' && HINDSIGHT_API_KEY &&
                       typeof HINDSIGHT_BANK_ID !== 'undefined' && HINDSIGHT_BANK_ID &&
                       typeof HINDSIGHT_API_URL !== 'undefined' && HINDSIGHT_API_URL;

  if (!hasHindsight) return;

  try {
    const documentContent = [
      `Title: ${incident.title}`,
      `Severity: ${incident.severity}`,
      `Description: ${incident.description}`,
      `Error Logs: ${incident.logs}`,
      `Resolution: ${incident.resolution}`,
      `Status: ${incident.status}`,
      `Date: ${incident.date}`
    ].join('\n');

    const response = await fetch(`${HINDSIGHT_API_URL}/v1/default/banks/${HINDSIGHT_BANK_ID}/retain`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HINDSIGHT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        documents: [{
          content: documentContent,
          metadata: {
            title: incident.title,
            severity: incident.severity,
            date: incident.date,
            status: incident.status
          }
        }]
      })
    });

    if (!response.ok) throw new Error(`Hindsight API error: ${response.status}`);

  } catch (error) {
    console.error('Error storing memory:', error);
    // Non-fatal — data is already saved locally
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  if (!toast || !toastMessage) return;

  toastMessage.textContent = message; // textContent — never innerHTML

  // Swap color based on type
  toast.classList.remove('bg-green-500', 'bg-red-500');
  toast.classList.add(type === 'error' ? 'bg-red-500' : 'bg-green-500');

  toast.classList.remove('translate-y-20', 'opacity-0');

  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}

// ============================================
// MEMORY VIEWER
// ============================================
function renderMemoryViewer() {
  const cardsContainer = document.getElementById('memory-cards');
  const emptyState = document.getElementById('memory-empty');
  const timelineContainer = document.getElementById('memory-timeline');

  if (!cardsContainer || !emptyState || !timelineContainer) return;

  if (memories.length === 0) {
    cardsContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    timelineContainer.textContent = '';
    const p = document.createElement('p');
    p.className = 'text-gray-500 dark:text-gray-400 text-center py-8';
    p.textContent = 'No memories to display on timeline.';
    timelineContainer.appendChild(p);
    return;
  }

  emptyState.classList.add('hidden');

  // Render memory cards — safe DOM construction
  const cardFragment = document.createDocumentFragment();

  memories.forEach((memory, index) => {
    const card = document.createElement('div');
    card.className = 'bg-gray-50/50 dark:bg-[#0a0a0f]/50 border border-gray-200 dark:border-white/10 rounded-lg p-6 hover:border-electric-blue/30 transition-all duration-300 hover:transform hover:scale-105 animate-slide-up';
    card.style.animationDelay = `${index * 0.1}s`;

    const headerRow = document.createElement('div');
    headerRow.className = 'flex items-center justify-between mb-3';

    const sevSpan = document.createElement('span');
    sevSpan.className = `px-3 py-1 rounded-full text-xs font-medium ${getSeverityClass(memory.severity)}`;
    sevSpan.textContent = memory.severity || '';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'text-xs text-gray-500 dark:text-gray-400';
    dateSpan.textContent = memory.date || '';

    headerRow.appendChild(sevSpan);
    headerRow.appendChild(dateSpan);

    const titleEl = document.createElement('h4');
    titleEl.className = 'font-semibold text-lg mb-2 text-gray-900 dark:text-white';
    titleEl.textContent = memory.title || '';

    const descEl = document.createElement('p');
    descEl.className = 'text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2';
    descEl.textContent = memory.description || '';

    const tagsRow = document.createElement('div');
    tagsRow.className = 'flex flex-wrap gap-2 mb-4';

    const statusTag = document.createElement('span');
    statusTag.className = 'px-2 py-1 bg-electric-blue/20 text-electric-blue rounded text-xs';
    statusTag.textContent = memory.status || '';

    const idTag = document.createElement('span');
    idTag.className = 'px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs';
    idTag.textContent = memory.id || '';

    tagsRow.appendChild(statusTag);
    tagsRow.appendChild(idTag);

    card.appendChild(headerRow);
    card.appendChild(titleEl);
    card.appendChild(descEl);
    card.appendChild(tagsRow);

    if (memory.resolution) {
      const resDiv = document.createElement('div');
      resDiv.className = 'border-t border-gray-200 dark:border-white/10 pt-3';

      const resLabel = document.createElement('p');
      resLabel.className = 'text-xs text-gray-500 dark:text-gray-400 mb-1';
      resLabel.textContent = 'Resolution:';

      const resText = document.createElement('p');
      resText.className = 'text-sm text-gray-600 dark:text-gray-300 line-clamp-2';
      resText.textContent = memory.resolution;

      resDiv.appendChild(resLabel);
      resDiv.appendChild(resText);
      card.appendChild(resDiv);
    }

    cardFragment.appendChild(card);
  });

  cardsContainer.innerHTML = '';
  cardsContainer.appendChild(cardFragment);

  // Render timeline — safe DOM construction
  const sortedMemories = [...memories].sort((a, b) => new Date(b.date) - new Date(a.date));
  const timelineFragment = document.createDocumentFragment();

  // Vertical line (purely decorative, safe)
  const line = document.createElement('div');
  line.className = 'absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-electric-blue to-purple';
  timelineFragment.appendChild(line);

  sortedMemories.forEach((memory, index) => {
    const entry = document.createElement('div');
    entry.className = 'relative pl-12 pb-8 animate-slide-up';
    entry.style.animationDelay = `${index * 0.1}s`;

    const dot = document.createElement('div');
    dot.className = 'absolute left-2.5 w-3 h-3 bg-electric-blue rounded-full border-4 border-gray-50 dark:border-white/10 dark:bg-[#0a0a0f]';

    const box = document.createElement('div');
    box.className = 'bg-gray-50/50 dark:bg-[#0a0a0f]/50 border border-gray-200 dark:border-white/10 rounded-lg p-4 hover:border-electric-blue/30 transition-colors';

    const boxHeader = document.createElement('div');
    boxHeader.className = 'flex items-center justify-between mb-2';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'font-medium';
    titleSpan.textContent = memory.title || '';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'text-xs text-gray-500 dark:text-gray-400';
    dateSpan.textContent = memory.date || '';

    boxHeader.appendChild(titleSpan);
    boxHeader.appendChild(dateSpan);

    const badgeRow = document.createElement('div');
    badgeRow.className = 'flex gap-2';

    const sevBadge = document.createElement('span');
    sevBadge.className = `px-2 py-1 rounded-full text-xs ${getSeverityClass(memory.severity)}`;
    sevBadge.textContent = memory.severity || '';

    const statusBadge = document.createElement('span');
    statusBadge.className = `px-2 py-1 rounded-full text-xs ${getStatusClass(memory.status)}`;
    statusBadge.textContent = memory.status || '';

    badgeRow.appendChild(sevBadge);
    badgeRow.appendChild(statusBadge);

    box.appendChild(boxHeader);
    box.appendChild(badgeRow);

    entry.appendChild(dot);
    entry.appendChild(box);
    timelineFragment.appendChild(entry);
  });

  timelineContainer.innerHTML = '';
  timelineContainer.appendChild(timelineFragment);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  } catch {
    return dateString;
  }
}
