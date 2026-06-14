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
// THEME TOGGLE
// ============================================
(function() {
  const themeToggle = document.getElementById('theme-toggle');
  const html = document.documentElement;
  
  // Check saved preference or default to light
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    html.classList.add('dark');
  }
  
  // Toggle theme on button click
  themeToggle.addEventListener('click', () => {
    html.classList.toggle('dark');
    const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
  });
})();

// ============================================
// API CONFIGURATION
// ============================================
const GROQ_API_KEY = "";
const HINDSIGHT_API_KEY = "";
const HINDSIGHT_BANK_ID = "recallops-memory"; 
const HINDSIGHT_API_URL = "https://api.hindsight.vectorize.io";

// ============================================
// STATE MANAGEMENT
// ============================================
let incidents = [];
let memories = [];
let currentSection = 'dashboard';

// ============================================
// SAMPLE DATA - Pre-loaded incidents
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
        resolution: 'Renewed SSL certificate and set up automated renewal with Let\'s Encrypt.'
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
    console.log('RecallOps initializing...');
    
    // Load sample data
    incidents = [...sampleIncidents];
    memories = [...sampleIncidents];
    
    // Initialize UI
    renderDashboard();
    renderMemoryViewer();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('RecallOps initialized successfully');
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Incident form submission
    document.getElementById('incident-form').addEventListener('submit', handleIncidentSubmit);
    
    // Chat input enter key
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// ============================================
// NAVIGATION
// ============================================
function showSection(sectionId) {
    console.log(`Navigating to section: ${sectionId}`);
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    document.getElementById(`section-${sectionId}`).classList.remove('hidden');
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-white/10', 'text-electric-blue');
        btn.classList.add('text-gray-400');
    });
    
    const activeBtn = document.getElementById(`nav-${sectionId}`);
    activeBtn.classList.add('bg-white/10', 'text-electric-blue');
    activeBtn.classList.remove('text-gray-400');
    
    currentSection = sectionId;
    
    // Refresh section data if needed
    if (sectionId === 'dashboard') {
        renderDashboard();
    } else if (sectionId === 'memory') {
        renderMemoryViewer();
    }
}

// ============================================
// DASHBOARD RENDERING
// ============================================
function renderDashboard() {
  console.log('Rendering dashboard...');
  
  // Update stats
  document.getElementById('stat-total').textContent = incidents.length;
  document.getElementById('stat-resolved').textContent = incidents.filter(i => i.status === 'Resolved').length;
  document.getElementById('stat-memory').textContent = memories.length;
  
  // Render incidents table
  const tableBody = document.getElementById('incidents-table');
  tableBody.innerHTML = incidents.map(incident => `
    <tr class="border-b border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
      <td class="py-4 text-sm text-gray-500 dark:text-gray-400">${incident.id}</td>
      <td class="py-4 font-medium">${incident.title}</td>
      <td class="py-4">
        <span class="px-3 py-1 rounded-full text-xs font-medium ${getSeverityClass(incident.severity)} ${incident.severity === 'Critical' ? 'animate-pulse-glow' : ''}">
          ${incident.severity}
        </span>
      </td>
      <td class="py-4">
        <span class="px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(incident.status)}">
          ${incident.status}
        </span>
      </td>
      <td class="py-4 text-sm text-gray-500 dark:text-gray-400">${incident.date}</td>
      <td class="py-4">
        <button onclick="viewIncident('${incident.id}')" class="text-electric-blue hover:text-purple transition-colors text-sm font-medium">
          View
        </button>
      </td>
    </tr>
  `).join('');
}

function getSeverityClass(severity) {
    switch (severity) {
        case 'Critical': return 'bg-red-500/20 text-red-400 border border-red-500/30';
        case 'High': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
        case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
        case 'Low': return 'bg-green-500/20 text-green-400 border border-green-500/30';
        default: return 'bg-gray-500/20 text-gray-400';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'Resolved': return 'bg-green-500/20 text-green-400';
        case 'Open': return 'bg-red-500/20 text-red-400';
        case 'In Progress': return 'bg-yellow-500/20 text-yellow-400';
        default: return 'bg-gray-500/20 text-gray-400';
    }
}

function viewIncident(id) {
    const incident = incidents.find(i => i.id === id);
    if (incident) {
        console.log('Viewing incident:', incident);
        // Could open a modal or navigate to detail view
        alert(`Incident: ${incident.title}\nSeverity: ${incident.severity}\nStatus: ${incident.status}\n\nDescription: ${incident.description}\n\nResolution: ${incident.resolution || 'Not resolved yet'}`);
    }
}

// ============================================
// CHAT INTERFACE
// ============================================
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    console.log('Sending message:', message);
    
    // Add user message to chat
    addChatMessage(message, 'user');
    input.value = '';
    
    // Show loading state
    showLoading();
    
    try {
        // Step 1: Retrieve relevant memories from Hindsight
        const memoryContext = await retrieveMemories(message);
        console.log('Retrieved memories:', memoryContext);
        
        // Step 2: Generate AI response using Groq
        const aiResponse = await generateAIResponse(message, memoryContext);
        console.log('AI response:', aiResponse);
        
        // Step 3: Display AI response
        removeLoading();
        addChatMessage(aiResponse, 'ai');
        
        // Step 4: Display retrieved memories in context panel
        displayMemoryContext(memoryContext);
        
    } catch (error) {
        console.error('Error in chat flow:', error);
        removeLoading();
        addChatMessage('Sorry, I encountered an error. Please check your API keys and try again.', 'ai');
    }
}

function addChatMessage(message, type) {
  const chatContainer = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  
  if (type === 'user') {
    messageDiv.className = 'flex justify-end';
    messageDiv.innerHTML = `
      <div class="bg-electric-blue text-white rounded-lg p-4 max-w-[80%]">
        <p>${message}</p>
      </div>
    `;
  } else {
    messageDiv.className = 'flex justify-start';
    messageDiv.innerHTML = `
      <div class="bg-white dark:bg-[#12121a] border border-gray-200 dark:border-white/10 rounded-lg p-4 max-w-[80%]">
        <p class="text-gray-600 dark:text-gray-300">${message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>
      </div>
    `;
  }
  
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showLoading() {
    const chatContainer = document.getElementById('chat-messages');
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
    console.log('Retrieving memories for query:', query);
    
    // If API keys are not set, return sample memories
    if (!HINDSIGHT_API_KEY || !HINDSIGHT_BANK_ID) {
        console.log('Using sample memories (API keys not configured)');
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
            body: JSON.stringify({
                query: query,
                numResults: 3
            })
        });
        
        if (!response.ok) {
            throw new Error(`Hindsight API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Hindsight response:', data);
        return data.results || [];
        
    } catch (error) {
        console.error('Error retrieving memories:', error);
        // Fallback to sample memories
        return memories.slice(0, 3).map(m => ({
            content: `${m.title}: ${m.description}\nResolution: ${m.resolution}`,
            metadata: m
        }));
    }
}

async function generateAIResponse(userMessage, memoryContext) {
    console.log('Generating AI response with memory context');
    
    // If API key is not set, return mock response
    if (GROQ_API_KEY === 'YOUR_GROQ_API_KEY') {
        console.log('Using mock AI response (API key not configured)');
        return generateMockResponse(userMessage, memoryContext);
    }
    
    try {
        const memoryText = memoryContext.map(m => m.content).join('\n\n');
        
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
        
        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Groq response:', data);
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('Error generating AI response:', error);
        return generateMockResponse(userMessage, memoryContext);
    }
}

function generateMockResponse(userMessage, memoryContext) {
    const relevantMemories = memoryContext.slice(0, 2);
    
    let response = `Based on your description, here's my analysis:\n\n`;
    
    if (relevantMemories.length > 0) {
        response += `📚 **Similar Past Incidents:**\n`;
        relevantMemories.forEach((mem, index) => {
            response += `${index + 1}. ${mem.metadata?.title || 'Unknown incident'}\n`;
            response += `   Resolution: ${mem.metadata?.resolution || 'No resolution recorded'}\n\n`;
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
  
  if (!memoryContext || memoryContext.length === 0) {
    contextPanel.innerHTML = '<p class="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No similar memories found.</p>';
    return;
  }
  
  contextPanel.innerHTML = memoryContext.map((mem, index) => `
    <div class="bg-gray-50/50 dark:bg-[#0a0a0f]/50 border border-gray-200 dark:border-white/10 rounded-lg p-3 hover:border-electric-blue/30 transition-colors">
      <div class="flex items-center gap-2 mb-2">
        <span class="w-6 h-6 bg-electric-blue/20 rounded-full flex items-center justify-center text-xs text-electric-blue">${index + 1}</span>
        <span class="text-xs font-medium text-purple-400">${mem.metadata?.severity || 'Unknown'}</span>
      </div>
      <p class="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">${mem.metadata?.title || 'Unknown incident'}</p>
      <p class="text-xs text-gray-500 dark:text-gray-400">${mem.metadata?.date || 'Unknown date'}</p>
    </div>
  `).join('');
}

// ============================================
// INCIDENT LOGGER
// ============================================
async function handleIncidentSubmit(e) {
    e.preventDefault();
    
    console.log('Submitting incident...');
    
    const incident = {
        id: `INC-${String(incidents.length + 1).padStart(3, '0')}`,
        title: document.getElementById('incident-title').value,
        severity: document.getElementById('incident-severity').value,
        description: document.getElementById('incident-description').value,
        logs: document.getElementById('incident-logs').value,
        resolution: document.getElementById('incident-resolution').value,
        status: document.getElementById('incident-resolution').value ? 'Resolved' : 'Open',
        date: new Date().toISOString().split('T')[0]
    };
    
    console.log('Incident data:', incident);
    
    // Add to local incidents
    incidents.push(incident);
    memories.push(incident);
    
    // Store in Hindsight memory
    await storeMemory(incident);
    
    // Reset form
    document.getElementById('incident-form').reset();
    
    // Show success toast
    showToast('Incident saved successfully!');
    
    // Update dashboard
    renderDashboard();
    renderMemoryViewer();
}

async function storeMemory(incident) {
    console.log('Storing incident in Hindsight memory...');
    
    // If API keys are not set, skip API call
    if (!HINDSIGHT_API_KEY || !HINDSIGHT_BANK_ID) {
        console.log('Skipping Hindsight API call (API keys not configured)');
        return;
    }
    
    try {
        const documentContent = `
Title: ${incident.title}
Severity: ${incident.severity}
Description: ${incident.description}
Error Logs: ${incident.logs}
Resolution: ${incident.resolution}
Status: ${incident.status}
Date: ${incident.date}
        `.trim();
        
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
        
        if (!response.ok) {
            throw new Error(`Hindsight API error: ${response.status}`);
        }
        
        console.log('Memory stored successfully');
        
    } catch (error) {
        console.error('Error storing memory:', error);
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// ============================================
// MEMORY VIEWER
// ============================================
function renderMemoryViewer() {
  console.log('Rendering memory viewer...');
  
  const cardsContainer = document.getElementById('memory-cards');
  const emptyState = document.getElementById('memory-empty');
  const timelineContainer = document.getElementById('memory-timeline');
  
  if (memories.length === 0) {
    cardsContainer.innerHTML = '';
    emptyState.classList.remove('hidden');
    timelineContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No memories to display on timeline.</p>';
    return;
  }
  
  emptyState.classList.add('hidden');
  
  // Render memory cards
  cardsContainer.innerHTML = memories.map((memory, index) => `
    <div class="bg-gray-50/50 dark:bg-[#0a0a0f]/50 border border-gray-200 dark:border-white/10 rounded-lg p-6 hover:border-electric-blue/30 transition-all duration-300 hover:transform hover:scale-105 animate-slide-up" style="animation-delay: ${index * 0.1}s">
      <div class="flex items-center justify-between mb-3">
        <span class="px-3 py-1 rounded-full text-xs font-medium ${getSeverityClass(memory.severity)}">
          ${memory.severity}
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400">${memory.date}</span>
      </div>
      <h4 class="font-semibold text-lg mb-2 text-gray-900 dark:text-white">${memory.title}</h4>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">${memory.description}</p>
      <div class="flex flex-wrap gap-2 mb-4">
        <span class="px-2 py-1 bg-electric-blue/20 text-electric-blue rounded text-xs">${memory.status}</span>
        <span class="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">${memory.id}</span>
      </div>
      ${memory.resolution ? `
        <div class="border-t border-gray-200 dark:border-white/10 pt-3">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Resolution:</p>
          <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">${memory.resolution}</p>
        </div>
      ` : ''}
    </div>
  `).join('');
  
  // Render timeline
  const sortedMemories = [...memories].sort((a, b) => new Date(b.date) - new Date(a.date));
  timelineContainer.innerHTML = `
    <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-electric-blue to-purple"></div>
    ${sortedMemories.map((memory, index) => `
      <div class="relative pl-12 pb-8 animate-slide-up" style="animation-delay: ${index * 0.1}s">
        <div class="absolute left-2.5 w-3 h-3 bg-electric-blue rounded-full border-4 border-gray-50 dark:border-white/10 dark:bg-[#0a0a0f]"></div>
        <div class="bg-gray-50/50 dark:bg-[#0a0a0f]/50 border border-gray-200 dark:border-white/10 rounded-lg p-4 hover:border-electric-blue/30 transition-colors">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium">${memory.title}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">${memory.date}</span>
          </div>
          <div class="flex gap-2">
            <span class="px-2 py-1 rounded-full text-xs ${getSeverityClass(memory.severity)}">${memory.severity}</span>
            <span class="px-2 py-1 rounded-full text-xs ${getStatusClass(memory.status)}">${memory.status}</span>
          </div>
        </div>
      </div>
    `).join('')}
  `;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}
