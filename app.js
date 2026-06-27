/**
 * DocuQuery AI - Frontend Application Controller
 * Handles UI interactions, accessibility elements, Drag & Drop overlays,
 * file validation, auto-resizing textareas, safe Markdown rendering,
 * and simulations for RAG backend upload and query endpoints.
 */

// --- STATE MANAGEMENT ---
const AppState = {
  activeFile: null,      // Stores { name: string, type: string, size: number }
  isUploading: false,    // Tracks if upload simulator is running
  isResponding: false,   // Tracks if AI response simulator is running
  activeSessionId: null, // Tracks selected sidebar session
};

// Mock sessions list for the sidebar
const mockSessions = [
  { id: 'session_1', filename: 'financial_report_2025.pdf', type: 'pdf', status: 'Processed' },
  { id: 'session_2', filename: 'employee_handbook.txt', type: 'txt', status: 'Processed' },
  { id: 'session_3', filename: 'retail_catalog_v2.csv', type: 'csv', status: 'Processed' }
];

// Pre-baked RAG replies for mock files to make the demo interactive
const mockReplies = {
  'financial_report_2025.pdf': [
    {
      trigger: 'summary',
      response: 'Based on the retrieved context from **financial_report_2025.pdf**, here is a summary of the fiscal findings:\n\n*   **Total Revenue**: $18.4M (a **14.5% increase** year-over-year).\n*   **Operating Margin**: 22%, driven by software subscription growth.\n*   **R&D Expenses**: Scaled up by 8% to support machine learning features.\n\nWould you like me to extract Q4 details or calculate margins?'
    },
    {
      trigger: 'default',
      response: 'I have analyzed the **2025 Financial Report**. The document outlines strong enterprise sales and stable margins.\n\nYou can query specific variables like:\n1. *Operating margins*\n2. *Year-over-year revenue progression*\n3. *Q4 expense distributions*'
    }
  ],
  'employee_handbook.txt': [
    {
      trigger: 'pto',
      response: 'According to Section 4.2 of the **employee_handbook.txt**:\n\n> Full-time employees accrue **20 days of paid time off (PTO)** per calendar year, calculated at a rate of 1.67 days per month.\n\n*   **Carryover**: A maximum of 5 days can carry over to the next year.\n*   **Request Notice**: Minimum 2 weeks notice required for vacations longer than 3 consecutive days.'
    },
    {
      trigger: 'default',
      response: 'I\'ve parsed **employee_handbook.txt**. It contains rules regarding employee conduct, remote work guidelines, and benefits policies.\n\nTry asking about *PTO accruals*, *health insurance coverage*, or *remote work equipment allowances*.'
    }
  ],
  'retail_catalog_v2.csv': [
    {
      trigger: 'price',
      response: 'I parsed the tabular records in **retail_catalog_v2.csv**.\n\nHere is a snippet of the query results matching your query:\n\n```json\n{\n  "query_status": "matches_found",\n  "records": [\n    { "item_id": "A402", "name": "AeroFoam Runner", "price": "$129.99", "stock": 420 },\n    { "item_id": "B109", "name": "VaporFit Tee", "price": "$34.50", "stock": 1205 }\n  ]\n}\n```\n\nThe average pricing across all catalog items is **$78.45**.'
    },
    {
      trigger: 'default',
      response: 'Successfully mapped **retail_catalog_v2.csv**. I detected columns for `item_id`, `product_name`, `price_usd`, and `inventory_count`.\n\nYou can ask me to run statistical aggregations or locate specific products by name.'
    }
  ]
};

// --- DOM ELEMENTS ---
const elements = {
  sidebar: document.getElementById('sidebar'),
  sidebarBackdrop: document.getElementById('sidebar-backdrop'),
  mobileMenuBtn: document.getElementById('mobile-menu-btn'),
  mobileCloseBtn: document.getElementById('mobile-close-btn'),
  
  newChatBtn: document.getElementById('new-chat-btn'),
  clearChatBtn: document.getElementById('clear-chat-btn'),
  sessionList: document.getElementById('session-list'),
  
  welcomeScreen: document.getElementById('welcome-screen'),
  chatFeed: document.getElementById('chat-feed'),
  messageStreamContainer: document.querySelector('.message-stream-container'),
  
  chatInput: document.getElementById('chat-input'),
  sendBtn: document.getElementById('send-btn'),
  attachBtn: document.getElementById('attach-btn'),
  hiddenFileInput: document.getElementById('hidden-file-input'),
  uploadLinkBtn: document.getElementById('upload-link-btn'),
  dropZoneTriggerBox: document.getElementById('drop-zone-trigger-box'),
  
  activeFilename: document.getElementById('active-filename'),
  statusText: document.getElementById('status-text'),
  statusBadge: document.getElementById('status-badge'),
  headerFileIcon: document.getElementById('header-file-icon'),
  uploadSpinner: document.getElementById('upload-progress-spinner'),
  
  dragDropOverlay: document.getElementById('drag-drop-overlay'),
  toastContainer: document.getElementById('toast-container'),
};

// --- SVG ICON TEMPLATES (Crisp inline rendering) ---
const fileIcons = {
  pdf: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>`,
  txt: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>`,
  csv: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="8" y1="12" x2="16" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="16"></line>
        </svg>`,
  default: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>`
};

const userAvatarSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>`;

const aiAvatarSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                      <polyline points="2 17 12 22 22 17"></polyline>
                      <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>`;

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
  setupSidebarSessions();
  registerEvents();
  validateSendButtonState();
});

// --- SIDEBAR SESSION INITIALIZATION ---
function setupSidebarSessions() {
  elements.sessionList.innerHTML = '';
  mockSessions.forEach(session => {
    const li = document.createElement('li');
    li.className = 'session-item';
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.dataset.sessionId = session.id;
    
    const icon = fileIcons[session.type] || fileIcons.default;
    
    li.innerHTML = `
      <span class="session-icon">${icon}</span>
      <span class="session-title">${session.filename}</span>
    `;
    
    // Add Click listener
    li.addEventListener('click', () => loadSidebarSession(session));
    
    // Add Keyboard listener for accessibility (Enter or Space)
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        loadSidebarSession(session);
      }
    });
    
    elements.sessionList.appendChild(li);
  });
}

// --- EVENT REGISTRATION ---
function registerEvents() {
  // Mobile & Desktop sidebar toggle controls
  elements.mobileMenuBtn.addEventListener('click', toggleSidebar);
  elements.mobileCloseBtn.addEventListener('click', toggleSidebar);
  elements.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

  // New Chat CTA & Clear Actions
  elements.newChatBtn.addEventListener('click', resetChatToEmpty);
  elements.clearChatBtn.addEventListener('click', resetChatToEmpty);

  // Textarea input listeners for sizing and keyboard operations
  elements.chatInput.addEventListener('input', handleTextareaResize);
  elements.chatInput.addEventListener('keydown', handleKeyboardSubmit);

  // File Upload interaction hooks
  elements.attachBtn.addEventListener('click', () => elements.hiddenFileInput.click());
  elements.uploadLinkBtn.addEventListener('click', () => elements.hiddenFileInput.click());
  elements.dropZoneTriggerBox.addEventListener('click', () => elements.hiddenFileInput.click());
  elements.hiddenFileInput.addEventListener('change', handleFileSelection);

  // Drag and Drop global screen listeners
  window.addEventListener('dragover', handleDragOverWindow);
  window.addEventListener('dragenter', handleDragOverWindow);
  
  // Drag overlay triggers
  elements.dragDropOverlay.addEventListener('dragleave', handleDragLeaveOverlay);
  elements.dragDropOverlay.addEventListener('drop', handleFileDrop);

  // Send message action
  elements.sendBtn.addEventListener('click', handleMessageSend);
}

// --- SIDEBAR EXPAND / COLLAPSE DRAWER CONTROL ---
function toggleSidebar() {
  if (window.innerWidth < 768) {
    // Mobile Drawer toggle
    const isActive = elements.sidebar.classList.contains('active');
    if (isActive) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  } else {
    // Desktop Collapse toggle
    elements.sidebar.classList.toggle('collapsed');
    
    // Update ARIA expand state
    const isCollapsed = elements.sidebar.classList.contains('collapsed');
    elements.mobileMenuBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
  }
}

function openMobileSidebar() {
  elements.sidebar.classList.add('active');
  elements.sidebarBackdrop.classList.add('active');
  elements.mobileMenuBtn.setAttribute('aria-expanded', 'true');
}

function closeMobileSidebar() {
  elements.sidebar.classList.remove('active');
  elements.sidebarBackdrop.classList.remove('active');
  elements.mobileMenuBtn.setAttribute('aria-expanded', 'false');
}

// --- DYNAMIC TEXTAREA AUTO-RESIZE ---
function handleTextareaResize() {
  const textarea = elements.chatInput;
  // Reset size first to calculate inner height correctly
  textarea.style.height = 'auto';
  // Set height to scrollHeight up to the CSS max-height limit
  const scrollHeight = textarea.scrollHeight;
  textarea.style.height = `${scrollHeight}px`;
  
  // Toggle overflow scrollbar when exceeding max-height of 180px
  if (scrollHeight >= 180) {
    textarea.style.overflowY = 'auto';
  } else {
    textarea.style.overflowY = 'hidden';
  }
  
  validateSendButtonState();
}

function validateSendButtonState() {
  const text = elements.chatInput.value.trim();
  const fileIsLoaded = AppState.activeFile !== null;
  const isPending = AppState.isResponding || AppState.isUploading;
  
  // Enable send only if a file is processed, input contains text, and not waiting for operations
  if (text.length > 0 && fileIsLoaded && !isPending) {
    elements.sendBtn.disabled = false;
    elements.sendBtn.classList.add('active');
  } else {
    elements.sendBtn.disabled = true;
    elements.sendBtn.classList.remove('active');
  }
}

// --- KEYBOARD EVENT HANDLING ---
function handleKeyboardSubmit(e) {
  // If Enter is pressed without Shift
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); // Stop default newline inserting
    
    // Trigger submission if validation passes
    const text = elements.chatInput.value.trim();
    if (text.length > 0 && AppState.activeFile && !AppState.isResponding && !AppState.isUploading) {
      handleMessageSend();
    }
  }
}

// --- FILE DRAG & DROP EVENT TRIGGERS ---
function handleDragOverWindow(e) {
  e.preventDefault();
  // Show glassmorphism overlay
  elements.dragDropOverlay.classList.add('active');
  elements.dragDropOverlay.setAttribute('aria-hidden', 'false');
}

function handleDragLeaveOverlay(e) {
  e.preventDefault();
  // Hide overlay when cursor leaves boundary
  elements.dragDropOverlay.classList.remove('active');
  elements.dragDropOverlay.setAttribute('aria-hidden', 'true');
}

function handleFileDrop(e) {
  e.preventDefault();
  elements.dragDropOverlay.classList.remove('active');
  elements.dragDropOverlay.setAttribute('aria-hidden', 'true');
  
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    processFileObject(files[0]);
  }
}

function handleFileSelection(e) {
  const files = e.target.files;
  if (files && files.length > 0) {
    processFileObject(files[0]);
  }
  // Reset file input value to allow uploading same file again
  elements.hiddenFileInput.value = '';
}

// --- FRONTEND FILE VALIDATION & ERROR HANDLING ---
function processFileObject(file) {
  const allowedExtensions = ['pdf', 'txt', 'csv'];
  const fileName = file.name;
  const fileExt = fileName.split('.').pop().toLowerCase();
  
  // 1. Validation Check
  if (!allowedExtensions.includes(fileExt)) {
    showToast(`Invalid format. Please upload PDF, TXT, or CSV file.`);
    return;
  }
  
  // 2. Size limits check (e.g., 25MB)
  const maxSize = 25 * 1024 * 1024; // 25 MB
  if (file.size > maxSize) {
    showToast(`File size is too large. Limit is 25MB.`);
    return;
  }
  
  // Clear any existing active sidebar items
  const activeItems = elements.sessionList.querySelectorAll('.session-item.active');
  activeItems.forEach(el => el.classList.remove('active'));
  AppState.activeSessionId = null;

  // Trigger Mock upload
  uploadFileMock(file);
}

// --- TOAST SYSTEMS ---
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  
  // Add error icon SVG inline
  toast.innerHTML = `
    <svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span class="toast-message">${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  // Remove toast after animation duration
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}

// --- MOCK API: FILE UPLOAD (/upload) ---
function uploadFileMock(file) {
  AppState.activeFile = {
    name: file.name,
    type: file.name.split('.').pop().toLowerCase(),
    size: file.size
  };
  
  AppState.isUploading = true;
  validateSendButtonState();
  
  // Update header labels to uploading state
  elements.activeFilename.textContent = file.name;
  elements.statusText.textContent = "Uploading...";
  elements.uploadSpinner.style.display = 'flex';
  elements.uploadSpinner.setAttribute('aria-hidden', 'false');
  elements.statusBadge.querySelector('.status-dot').style.backgroundColor = 'var(--color-warning)';
  
  // Simulate POST request response time to backend endpoint
  setTimeout(() => {
    AppState.isUploading = false;
    
    // Update Header labels to success/ready state
    elements.statusText.textContent = "Processed";
    elements.uploadSpinner.style.display = 'none';
    elements.uploadSpinner.setAttribute('aria-hidden', 'true');
    
    // Add specific visual styling classes to header icon depending on file extension
    elements.headerFileIcon.className = "status-icon";
    elements.headerFileIcon.classList.add(`active-${AppState.activeFile.type}`);
    elements.headerFileIcon.innerHTML = fileIcons[AppState.activeFile.type] || fileIcons.default;
    
    // Update status dot color
    elements.statusBadge.querySelector('.status-dot').style.backgroundColor = 'var(--color-success)';
    
    // Transition UI from welcome screen to chat feed
    elements.welcomeScreen.style.display = 'none';
    elements.chatFeed.style.display = 'flex';
    elements.chatFeed.innerHTML = ''; // Clear previous messages
    
    // Add Initial AI response confirming parsing success
    appendMessage('ai', `I have successfully uploaded and indexed **${file.name}**. You can now ask questions about the contents of this file.`);
    
    validateSendButtonState();
  }, 2200);
}

// --- SIDEBAR SESSION SWITCHING ---
function loadSidebarSession(session) {
  // Update UI active styling
  const items = elements.sessionList.querySelectorAll('.session-item');
  items.forEach(el => el.classList.remove('active'));
  
  const selectedItem = elements.sessionList.querySelector(`[data-session-id="${session.id}"]`);
  if (selectedItem) {
    selectedItem.classList.add('active');
  }
  
  // Update app state
  AppState.activeSessionId = session.id;
  AppState.activeFile = {
    name: session.filename,
    type: session.type,
    size: 5000000 // mock size
  };
  
  closeMobileSidebar();
  
  // Update Header details
  elements.activeFilename.textContent = session.filename;
  elements.statusText.textContent = "Processed";
  elements.uploadSpinner.style.display = 'none';
  elements.uploadSpinner.setAttribute('aria-hidden', 'true');
  
  elements.headerFileIcon.className = "status-icon";
  elements.headerFileIcon.classList.add(`active-${session.type}`);
  elements.headerFileIcon.innerHTML = fileIcons[session.type] || fileIcons.default;
  elements.statusBadge.querySelector('.status-dot').style.backgroundColor = 'var(--color-success)';
  
  // Transition views
  elements.welcomeScreen.style.display = 'none';
  elements.chatFeed.style.display = 'flex';
  elements.chatFeed.innerHTML = '';
  
  // Fetch initial prompt instructions
  const defaultResp = getMockResponseForFile(session.filename, 'default');
  appendMessage('ai', defaultResp);
  
  validateSendButtonState();
}

// --- MOCK API: CHAT RESPONSE (/chat) ---
function handleMessageSend() {
  const text = elements.chatInput.value.trim();
  if (text.length === 0 || AppState.isResponding || AppState.isUploading) return;
  
  // 1. Safe DOM insertion for User message (HTML escaped to prevent XSS)
  appendMessage('user', text);
  
  // Clear textarea input and adjust height
  elements.chatInput.value = '';
  elements.chatInput.style.height = 'auto';
  elements.chatInput.style.overflowY = 'hidden';
  
  AppState.isResponding = true;
  validateSendButtonState();
  
  // 2. Show Typing Indicator
  const typingIndicator = showTypingIndicator();
  scrollToBottom();
  
  // 3. Simulate RAG query response time
  setTimeout(() => {
    // Remove Typing Indicator
    typingIndicator.remove();
    
    // Generate simulated response text
    const aiAnswer = getRAGResponseMock(text);
    
    // Append AI Response
    appendMessage('ai', aiAnswer);
    scrollToBottom();
    
    AppState.isResponding = false;
    validateSendButtonState();
  }, 1800);
}

// Helper to match queries for mock documents or general fallback
function getRAGResponseMock(userQuery) {
  if (!AppState.activeFile) return "No document loaded. Please upload a document first.";
  
  const queryLower = userQuery.toLowerCase();
  const activeName = AppState.activeFile.name;
  
  // Check triggers for active mock files
  if (activeName === 'financial_report_2025.pdf') {
    if (queryLower.includes('summary') || queryLower.includes('overview') || queryLower.includes('revenue')) {
      return getMockResponseForFile(activeName, 'summary');
    }
  } else if (activeName === 'employee_handbook.txt') {
    if (queryLower.includes('pto') || queryLower.includes('leave') || queryLower.includes('vacation')) {
      return getMockResponseForFile(activeName, 'pto');
    }
  } else if (activeName === 'retail_catalog_v2.csv') {
    if (queryLower.includes('price') || queryLower.includes('cost') || queryLower.includes('catalog') || queryLower.includes('stock')) {
      return getMockResponseForFile(activeName, 'price');
    }
  }
  
  // Standard generic RAG fallbacks simulating structured text return
  return `Based on the content of **${activeName}**, here is the relevant excerpt matching your query:
  
\`\`\`json
{
  "file_queried": "${activeName}",
  "search_match": "${userQuery.replace(/"/g, '\\"')}",
  "confidence_score": 0.89,
  "sources": [
    { "page": 1, "paragraph": "RAG-extracted index item" }
  ]
}
\`\`\`

Here are the key takeaways from the document query:
*   The query term *"${userQuery}"* occurs multiple times in the source.
*   The context references standard operations and specifications.

Let me know if you want me to expand this block or format it as CSV records.`;
}

function getMockResponseForFile(filename, key) {
  const entries = mockReplies[filename];
  if (!entries) return "File processed successfully.";
  const match = entries.find(e => e.trigger === key);
  return match ? match.response : entries.find(e => e.trigger === 'default').response;
}

// --- SAFE DOM INSERTION & MARKDOWN PARSING ---
function appendMessage(sender, text) {
  const row = document.createElement('div');
  row.className = `message-row ${sender}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'avatar-container';
  avatar.innerHTML = sender === 'user' ? userAvatarSvg : aiAvatarSvg;
  
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  
  if (sender === 'user') {
    // Secure input insertion for raw user text (prevents XSS)
    bubble.textContent = text;
  } else {
    // Process markdown string securely into structured tags and insert
    bubble.innerHTML = parseMarkdownToHtml(text);
  }
  
  row.appendChild(avatar);
  row.appendChild(bubble);
  elements.chatFeed.appendChild(row);
  
  scrollToBottom();
}

function showTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'typing-row';
  
  const avatar = document.createElement('div');
  avatar.className = 'avatar-container';
  avatar.innerHTML = aiAvatarSvg;
  
  const container = document.createElement('div');
  container.className = 'typing-container';
  container.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;
  
  row.appendChild(avatar);
  row.appendChild(container);
  elements.chatFeed.appendChild(row);
  
  return row;
}

function scrollToBottom() {
  elements.messageStreamContainer.scrollTo({
    top: elements.messageStreamContainer.scrollHeight,
    behavior: 'smooth'
  });
}

// --- SECURE REGEX MARKDOWN PARSER ---
function parseMarkdownToHtml(markdownText) {
  // 1. Safe Escape HTML tags first to render tags written by the AI as raw text
  let safeText = markdownText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Extract and preserve Code Blocks (```code```) to prevent nested parsing
  const codeBlocks = [];
  safeText = safeText.replace(/```([\s\S]*?)```/g, (match, code) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}__`;
    codeBlocks.push(code.trim());
    return placeholder;
  });

  // 3. Process line-by-line for blocks (headers, lists, blockquotes, paragraphs)
  const lines = safeText.split('\n');
  let htmlOutput = [];
  let listStack = []; // Tracks list scope: 'ul' or 'ol'

  function closeLists() {
    while (listStack.length > 0) {
      htmlOutput.push(`</${listStack.pop()}>`);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    // Check for empty line
    if (trimmed === '') {
      closeLists();
      continue;
    }

    // Headers: # H1, ## H2, ### H3, #### H4
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      closeLists();
      const level = headerMatch[1].length;
      const content = parseInlineMarkdown(headerMatch[2]);
      htmlOutput.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    // Blockquotes: > quote text
    if (line.startsWith('>')) {
      closeLists();
      const content = parseInlineMarkdown(line.slice(1).trim());
      htmlOutput.push(`<blockquote>${content}</blockquote>`);
      continue;
    }

    // Unordered Lists: - text or * text
    const ulMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (ulMatch) {
      if (listStack.length === 0 || listStack[listStack.length - 1] !== 'ul') {
        closeLists();
        htmlOutput.push('<ul>');
        listStack.push('ul');
      }
      const content = parseInlineMarkdown(ulMatch[2]);
      htmlOutput.push(`<li>${content}</li>`);
      continue;
    }

    // Ordered Lists: 1. text
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      if (listStack.length === 0 || listStack[listStack.length - 1] !== 'ol') {
        closeLists();
        htmlOutput.push('<ol>');
        listStack.push('ol');
      }
      const content = parseInlineMarkdown(olMatch[2]);
      htmlOutput.push(`<li>${content}</li>`);
      continue;
    }

    // Default Paragraphs
    closeLists();
    const content = parseInlineMarkdown(line);
    htmlOutput.push(`<p>${content}</p>`);
  }

  // Close lists remaining at the end
  closeLists();

  let finalHtml = htmlOutput.join('\n');

  // 4. Restore preserved Code Blocks with dark-themed styling tags
  codeBlocks.forEach((code, index) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${index}__`;
    const codeHtml = `<pre><code>${code}</code></pre>`;
    finalHtml = finalHtml.replaceAll(placeholder, codeHtml);
  });

  return finalHtml;
}

// Parses inline entities like Bold, Italic, and Inline code
function parseInlineMarkdown(text) {
  let output = text;
  
  // Bold: **text**
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text*
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Inline Code: `code`
  output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  return output;
}

// --- RESET CHAT VIEW ---
function resetChatToEmpty() {
  AppState.activeFile = null;
  AppState.activeSessionId = null;
  
  const activeItems = elements.sessionList.querySelectorAll('.session-item.active');
  activeItems.forEach(el => el.classList.remove('active'));
  
  // Reset header status
  elements.activeFilename.textContent = "No document uploaded";
  elements.statusText.textContent = "Ready to upload";
  elements.headerFileIcon.className = "status-icon";
  elements.headerFileIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                         <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                         <polyline points="14 2 14 8 20 8"></polyline>
                                       </svg>`;
  elements.statusBadge.querySelector('.status-dot').style.backgroundColor = 'var(--color-text-light)';
  elements.uploadSpinner.style.display = 'none';
  elements.uploadSpinner.setAttribute('aria-hidden', 'true');
  
  // Reset layout view
  elements.welcomeScreen.style.display = 'flex';
  elements.chatFeed.style.display = 'none';
  elements.chatFeed.innerHTML = '';
  
  // Reset input area
  elements.chatInput.value = '';
  elements.chatInput.style.height = 'auto';
  elements.chatInput.style.overflowY = 'hidden';
  
  closeMobileSidebar();
  validateSendButtonState();
}
