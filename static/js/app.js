// State Management
let allReleases = [];
let selectedReleaseIds = new Set();
let activeFilter = 'all';
let searchQuery = '';
let currentTheme = localStorage.getItem('theme') || 'dark';

// Tweet Composer Modal State
let composerActiveSingleItem = null;
let activeTemplateType = 'default';
let activeHashtags = new Set(['BigQuery', 'GoogleCloud']);

// Elements
const feedContainer = document.getElementById('feed-container');
const loadingContainer = document.getElementById('loading-container');
const errorContainer = document.getElementById('error-container');
const searchInput = document.getElementById('search-input');
const syncTimeEl = document.getElementById('sync-time');
const refreshBtn = document.getElementById('refresh-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const bulkBar = document.getElementById('bulk-tweet-bar');
const selectedCountEl = document.getElementById('selected-count');
const deselectAllBtn = document.getElementById('deselect-all-btn');
const bulkTweetBtn = document.getElementById('bulk-tweet-btn');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const sendTweetBtn = document.getElementById('send-tweet-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charProgress = document.getElementById('char-progress');
const charCount = document.getElementById('char-count');
const hashtagSelector = document.getElementById('hashtag-selector');

// Templates configurations
const TEMPLATES = {
  default: (items) => {
    if (items.length === 1) {
      const item = items[0];
      return `BigQuery Update (${item.date}): ${item.text}`;
    } else {
      const bulletList = items.map(item => `• ${item.date} [${item.type}]: ${item.text}`).join('\n');
      return `BigQuery Updates:\n${bulletList}`;
    }
  },
  short: (items) => {
    if (items.length === 1) {
      const item = items[0];
      return `New #BigQuery ${item.type} (${item.date}): ${item.text}`;
    } else {
      return `Check out the latest ${items.length} updates for Google Cloud BigQuery!`;
    }
  },
  hype: (items) => {
    if (items.length === 1) {
      const item = items[0];
      return `🔥 BigQuery has a new ${item.type.toLowerCase()}! (${item.date})\n\n${item.text}`;
    } else {
      return `🚀 ${items.length} new updates just landed in BigQuery! Details below:`;
    }
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  fetchReleases(false);
  setupEventListeners();
});

// Theme setup
function setupTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon();
}

function updateThemeIcon() {
  const icon = themeToggleBtn.querySelector('i');
  if (currentTheme === 'light') {
    icon.setAttribute('data-lucide', 'moon');
    themeToggleBtn.title = "Switch to Dark Mode";
  } else {
    icon.setAttribute('data-lucide', 'sun');
    themeToggleBtn.title = "Switch to Light Mode";
  }
  lucide.createIcons();
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', currentTheme);
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon();
}

// Fetch Release Notes
async function fetchReleases(forceRefresh = false) {
  showState('loading');
  
  if (forceRefresh) {
    const spinner = refreshBtn.querySelector('i');
    spinner.classList.add('spinning');
  }

  try {
    const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
      allReleases = result.releases;
      selectedReleaseIds.clear();
      updateBulkBar();
      
      // Update cache details
      const cacheDate = new Date(result.cached_at * 1000);
      syncTimeEl.textContent = `Synced: ${cacheDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      
      // Render components
      renderFilterCounts();
      renderReleases();
      showState('content');
    } else {
      throw new Error(result.error || "Failed to fetch release notes");
    }
  } catch (err) {
    console.error("Error loading release notes:", err);
    document.getElementById('error-message').textContent = err.message || "An unexpected error occurred.";
    showState('error');
  } finally {
    const spinner = refreshBtn.querySelector('i');
    spinner.classList.remove('spinning');
  }
}

// Render States
function showState(state) {
  loadingContainer.style.display = state === 'loading' ? 'flex' : 'none';
  errorContainer.style.display = state === 'error' ? 'flex' : 'none';
  feedContainer.style.display = state === 'content' ? 'flex' : 'none';
}

// Render Filter Badges with count
function renderFilterCounts() {
  const counts = {
    all: allReleases.length,
    feature: 0,
    announcement: 0,
    changed: 0,
    deprecated: 0,
    issue: 0,
    general: 0
  };
  
  allReleases.forEach(item => {
    const type = item.type.toLowerCase();
    if (type in counts) {
      counts[type]++;
    } else if (type === 'fix') {
      counts.issue++; // Group fix under issue badge count for UI convenience
    } else {
      counts.general++;
    }
  });

  // Update counts in the filter DOM elements
  Object.keys(counts).forEach(key => {
    const badge = document.querySelector(`[data-filter="${key}"] .filter-count`);
    if (badge) {
      badge.textContent = counts[key];
    }
  });
}

// Render Release List cards
function renderReleases() {
  feedContainer.innerHTML = '';
  
  // Filter releases
  const filtered = allReleases.filter(item => {
    // Category match
    const type = item.type.toLowerCase();
    let matchesFilter = activeFilter === 'all' || 
                        (activeFilter === 'issue' && (type === 'issue' || type === 'fix')) ||
                        type === activeFilter;
                        
    // Search keyword match
    const query = searchQuery.toLowerCase().trim();
    let matchesSearch = true;
    if (query) {
      matchesSearch = item.date.toLowerCase().includes(query) || 
                      item.type.toLowerCase().includes(query) || 
                      item.text.toLowerCase().includes(query);
    }
    
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    feedContainer.innerHTML = `
      <div class="status-container" style="padding: 4rem 2rem;">
        <i data-lucide="search-code" style="width: 3rem; height: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
        <h3 class="status-title">No release notes found</h3>
        <p class="status-message">Try refining your search keyword or selecting a different category filter.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  filtered.forEach(item => {
    const isSelected = selectedReleaseIds.has(item.id);
    const card = document.createElement('div');
    card.className = `release-card ${isSelected ? 'selected' : ''}`;
    card.id = `card-${item.id}`;
    
    // Set variable badge color for hover/borders
    let badgeClass = item.type.toLowerCase();
    if (badgeClass === 'fix') badgeClass = 'issue';
    if (!['feature', 'announcement', 'changed', 'deprecated', 'issue', 'general'].includes(badgeClass)) {
      badgeClass = 'general';
    }

    card.innerHTML = `
      <div class="card-header">
        <div class="card-metadata">
          <div class="card-selector" title="Select to Tweet">
            <i data-lucide="check" style="width: 1rem; height: 1rem;"></i>
          </div>
          <span class="card-date">
            <i data-lucide="calendar"></i>
            ${item.date}
          </span>
        </div>
        <span class="type-badge ${badgeClass}">${item.type}</span>
      </div>
      <div class="card-body">
        ${item.html}
      </div>
      <div class="card-actions" style="margin-top: 1.25rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 1rem;">
        <a href="${item.link}" target="_blank" class="sync-info" style="color: var(--text-muted); font-size: 0.85rem;" onclick="event.stopPropagation()">
          <i data-lucide="external-link" style="width: 0.9rem; height: 0.9rem;"></i>
          Official Docs
        </a>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-icon" title="Copy text to clipboard" onclick="event.stopPropagation(); copyCardText(this, '${item.id}')">
            <i data-lucide="copy" style="width: 1.05rem; height: 1.05rem;"></i>
          </button>
          <button class="btn btn-secondary btn-icon" title="Tweet this update" onclick="event.stopPropagation(); openComposerForSingle('${item.id}')">
            <i data-lucide="twitter" style="width: 1.05rem; height: 1.05rem; color: #1da1f2;"></i>
          </button>
        </div>
      </div>
    `;
    
    // Card select selection action
    card.addEventListener('click', () => {
      toggleCardSelection(item.id);
    });
    
    feedContainer.appendChild(card);
  });
  
  lucide.createIcons();
}

// Toggle Selection
function toggleCardSelection(id) {
  const card = document.getElementById(`card-${id}`);
  if (selectedReleaseIds.has(id)) {
    selectedReleaseIds.delete(id);
    if (card) card.classList.remove('selected');
  } else {
    selectedReleaseIds.add(id);
    if (card) card.classList.add('selected');
  }
  updateBulkBar();
}

// Clear Bulk selection
function clearSelection() {
  selectedReleaseIds.clear();
  document.querySelectorAll('.release-card.selected').forEach(c => c.classList.remove('selected'));
  updateBulkBar();
}

// Update the bottom selection bar
function updateBulkBar() {
  const count = selectedReleaseIds.size;
  if (count > 0) {
    selectedCountEl.innerHTML = `<strong>${count}</strong> update${count > 1 ? 's' : ''} selected`;
    bulkBar.classList.add('active');
  } else {
    bulkBar.classList.remove('active');
  }
}

// Get Selected Items Sorted by original order
function getSelectedItems() {
  const items = allReleases.filter(item => selectedReleaseIds.has(item.id));
  return items;
}

// Event Listeners Setup
function setupEventListeners() {
  // Theme Toggle
  themeToggleBtn.addEventListener('click', toggleTheme);
  
  // Refresh Button
  refreshBtn.addEventListener('click', () => fetchReleases(true));
  
  // Search Input (Debounced)
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchQuery = e.target.value;
    searchTimeout = setTimeout(() => {
      renderReleases();
    }, 250);
  });
  
  // Filter pills selection
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.filter-btn.active').classList.remove('active');
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      renderReleases();
    });
  });
  
  // Bulk Selection Tweet Trigger
  bulkTweetBtn.addEventListener('click', () => {
    openComposerForBulk();
  });
  
  // Selection Cleared Trigger
  deselectAllBtn.addEventListener('click', clearSelection);
  
  // Modal Closes
  modalCloseBtn.addEventListener('click', closeComposer);
  cancelTweetBtn.addEventListener('click', closeComposer);
  
  // Outside Click closes Modal
  tweetModal.addEventListener('click', (e) => {
    if (e.target === tweetModal) {
      closeComposer();
    }
  });
  
  // Textarea input watcher
  tweetTextarea.addEventListener('input', updateCharCounters);
  
  // Hashtag Toggles inside Composer
  hashtagSelector.addEventListener('click', (e) => {
    const pill = e.target.closest('.tag-pill');
    if (!pill) return;
    
    const tag = pill.getAttribute('data-tag');
    if (activeHashtags.has(tag)) {
      activeHashtags.delete(tag);
      pill.classList.remove('active');
    } else {
      activeHashtags.add(tag);
      pill.classList.add('active');
    }
    
    regenerateTweetText();
  });
  
  // Template Picker Buttons inside Composer
  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.template-btn.active').classList.remove('active');
      btn.classList.add('active');
      activeTemplateType = btn.getAttribute('data-template');
      regenerateTweetText();
    });
  });
  
  // Send Tweet (Open Web Intent)
  sendTweetBtn.addEventListener('click', () => {
    const text = tweetTextarea.value.trim();
    if (!text) return;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    closeComposer();
  });

  // Export CSV Button
  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportToCSV);
  }
}

// Single Tweet Composer Trigger
function openComposerForSingle(id) {
  const item = allReleases.find(r => r.id === id);
  if (!item) return;
  
  composerActiveSingleItem = [item];
  activeTemplateType = 'default';
  
  // Sync template pills state
  document.querySelector('.template-btn.active').classList.remove('active');
  document.querySelector('[data-template="default"]').classList.add('active');
  
  openComposer();
}

// Bulk Tweet Composer Trigger
function openComposerForBulk() {
  const items = getSelectedItems();
  if (items.length === 0) return;
  
  composerActiveSingleItem = items;
  activeTemplateType = 'default';
  
  // Sync template pills state
  document.querySelector('.template-btn.active').classList.remove('active');
  document.querySelector('[data-template="default"]').classList.add('active');
  
  openComposer();
}

// Open Composer Layout and Prefill Content
function openComposer() {
  regenerateTweetText();
  tweetModal.classList.add('active');
}

function closeComposer() {
  tweetModal.classList.remove('active');
  composerActiveSingleItem = null;
}

// Smart Tweet generator with auto-truncation for 280 limits
function regenerateTweetText() {
  if (!composerActiveSingleItem || composerActiveSingleItem.length === 0) return;
  
  const items = composerActiveSingleItem;
  const builder = TEMPLATES[activeTemplateType];
  
  // Determine standard links and hashtags structures
  let suffixLink = '';
  if (items.length === 1) {
    suffixLink = `\n\nDocs: ${items[0].link}`;
  } else {
    // Bulk link defaults to main release notes
    suffixLink = `\n\nDocs: https://docs.cloud.google.com/bigquery/docs/release-notes`;
  }
  
  const hashString = Array.from(activeHashtags).map(t => `#${t}`).join(' ');
  const suffixHashtags = hashString ? `\n\n${hashString}` : '';
  
  // Total characters allocated for links and tags
  const reservedLength = suffixLink.length + suffixHashtags.length;
  const maxBodyLength = 280 - reservedLength;
  
  let bodyText = builder(items);
  
  // Auto-truncation if it exceeds X limit
  if (bodyText.length > maxBodyLength) {
    // Truncate and add ellipsis, leaving enough space
    bodyText = bodyText.substring(0, maxBodyLength - 4) + '...';
  }
  
  const finalTweet = bodyText + suffixLink + suffixHashtags;
  
  tweetTextarea.value = finalTweet;
  updateCharCounters();
}

// Update UI Indicators for Character Limits
function updateCharCounters() {
  const len = tweetTextarea.value.length;
  charCount.textContent = `${len} / 280`;
  
  // Calculate percentage progress bar
  const pct = Math.min((len / 280) * 100, 100);
  charProgress.style.width = `${pct}%`;
  
  // Update color schemes on warning thresholds
  charCount.className = 'char-count';
  charProgress.className = 'char-limit-progress';
  
  if (len >= 280) {
    charCount.classList.add('danger');
    charProgress.classList.add('danger');
    sendTweetBtn.disabled = true;
    sendTweetBtn.style.opacity = '0.5';
    sendTweetBtn.style.cursor = 'not-allowed';
  } else if (len >= 250) {
    charCount.classList.add('warning');
    charProgress.classList.add('warning');
    sendTweetBtn.disabled = false;
    sendTweetBtn.style.opacity = '1';
    sendTweetBtn.style.cursor = 'pointer';
  } else {
    sendTweetBtn.disabled = false;
    sendTweetBtn.style.opacity = '1';
    sendTweetBtn.style.cursor = 'pointer';
  }
}

// Copy single release note text to clipboard
window.copyCardText = function(btn, id) {
  const item = allReleases.find(r => r.id === id);
  if (!item) return;
  
  navigator.clipboard.writeText(item.text).then(() => {
    const icon = btn.querySelector('i');
    if (icon) {
      icon.setAttribute('data-lucide', 'check');
      icon.style.color = 'var(--feature)';
      lucide.createIcons();
      
      setTimeout(() => {
        icon.setAttribute('data-lucide', 'copy');
        icon.style.color = '';
        lucide.createIcons();
      }, 2000);
    }
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
};

// Export currently filtered and searched release notes to CSV
function exportToCSV() {
  const query = searchQuery.toLowerCase().trim();
  const filtered = allReleases.filter(item => {
    const type = item.type.toLowerCase();
    let matchesFilter = activeFilter === 'all' || 
                        (activeFilter === 'issue' && (type === 'issue' || type === 'fix')) ||
                        type === activeFilter;
                        
    let matchesSearch = true;
    if (query) {
      matchesSearch = item.date.toLowerCase().includes(query) || 
                      item.type.toLowerCase().includes(query) || 
                      item.text.toLowerCase().includes(query);
    }
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    alert("No release notes match the current search/filter criteria to export.");
    return;
  }

  function escapeCSV(val) {
    if (val === undefined || val === null) return '""';
    let str = val.toString().replace(/"/g, '""');
    return `"${str}"`;
  }

  const csvRows = [];
  csvRows.push(['Date', 'Type', 'Content', 'Link'].map(escapeCSV).join(','));

  filtered.forEach(item => {
    csvRows.push([
      item.date,
      item.type,
      item.text,
      item.link
    ].map(escapeCSV).join(','));
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `bigquery_releases_${activeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
