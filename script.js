// Cloud File Management System - Main JavaScript
// Admin Credentials
const ADMIN_CREDENTIALS = {
    username: "olawale abdul-ganiyu",
    password: "admin123"
};

// Debug: Log credentials on load
console.log('DEBUG - Admin Username:', ADMIN_CREDENTIALS.username);
console.log('DEBUG - Admin Password:', ADMIN_CREDENTIALS.password);
console.log('DEBUG - Username lowercase:', ADMIN_CREDENTIALS.username.toLowerCase());

// Application State
let appState = {
    isLoggedIn: false,
    currentPath: "/",
    selectedFiles: [],
    clipboard: {
        action: null,
        files: []
    },
    files: {},
    storageUsed: 0,
    settings: {
        publicAccess: true,
        googleIndex: true,
        adsEnabled: false
    }
};

// DOM Elements
const coverPage = document.getElementById('coverPage');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initializeEventListeners();
    updateDomainDisplay();
    updateStorageInfo();
    checkLoginStatus();
});

// Load State from LocalStorage
function loadState() {
    const savedState = localStorage.getItem('cloudFileManagerState');
    if (savedState) {
        appState = { ...appState, ...JSON.parse(savedState) };
    }
}

// Save State to LocalStorage
function saveState() {
    localStorage.setItem('cloudFileManagerState', JSON.stringify(appState));
}

// Check Login Status
function checkLoginStatus() {
    if (appState.isLoggedIn) {
        showMainApp();
    } else {
        showCoverPage();
    }
}

// Show Cover Page
function showCoverPage() {
    coverPage.style.display = 'flex';
    mainApp.style.display = 'none';
}

// Show Main Application
function showMainApp() {
    coverPage.style.display = 'none';
    mainApp.style.display = 'block';
    document.getElementById('welcomeUser').textContent = `Welcome, ${ADMIN_CREDENTIALS.username}`;
    renderFiles();
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Login Form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout Button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // File Operations
    document.getElementById('newFolderBtn').addEventListener('click', createNewFolder);
    document.getElementById('refreshBtn').addEventListener('click', renderFiles);
    document.getElementById('selectAllBtn').addEventListener('click', selectAllFiles);
    document.getElementById('deleteBtn').addEventListener('click', deleteSelectedFiles);
    document.getElementById('copyBtn').addEventListener('click', copyFiles);
    document.getElementById('pasteBtn').addEventListener('click', pasteFiles);
    document.getElementById('renameBtn').addEventListener('click', renameFile);
    
    // Upload Zone
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    
    // Editor
    document.getElementById('saveEditorBtn').addEventListener('click', saveEditorContent);
    document.getElementById('previewEditorBtn').addEventListener('click', previewEditorContent);
    document.getElementById('formatCodeBtn').addEventListener('click', formatCode);
    
    // Settings
    document.getElementById('publicAccess').addEventListener('change', updateSettings);
    document.getElementById('googleIndex').addEventListener('change', updateSettings);
    document.getElementById('adsEnabled').addEventListener('change', updateSettings);
    
    // Modal Close
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    
    // Close modal on outside click
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });
}

// Handle Login
function handleLogin(e) {
    e.preventDefault();
    
    // Get input values
    const rawUsername = document.getElementById('username').value;
    const rawPassword = document.getElementById('password').value;
    
    // Debug logging
    console.log('DEBUG - Raw username:', rawUsername);
    console.log('DEBUG - Raw password:', rawPassword);
    console.log('DEBUG - Raw password length:', rawPassword.length);
    
    // Process username (trim and lowercase)
    const username = rawUsername.trim().toLowerCase();
    const password = rawPassword;
    
    console.log('DEBUG - Processed username:', username);
    console.log('DEBUG - Expected username:', ADMIN_CREDENTIALS.username.toLowerCase());
    console.log('DEBUG - Username match:', username === ADMIN_CREDENTIALS.username.toLowerCase());
    console.log('DEBUG - Password match:', password === ADMIN_CREDENTIALS.password);
    
    // Verify credentials
    if (username === ADMIN_CREDENTIALS.username.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
        console.log('DEBUG - Login SUCCESS');
        appState.isLoggedIn = true;
        saveState();
        showMainApp();
        showToast('✅ Login successful! Welcome back.', 'success');
    } else {
        console.log('DEBUG - Login FAILED');
        loginError.textContent = '❌ Invalid username or password';
        showToast('❌ Login failed. Please check your credentials.', 'error');
    }
}

// Handle Logout
function handleLogout() {
    appState.isLoggedIn = false;
    saveState();
    showCoverPage();
    showToast('👋 Logged out successfully', 'info');
}

// Switch Tab
function switchTab(tabName) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Update viewer file select if switching to viewer tab
    if (tabName === 'viewer') {
        updateViewerFileSelect();
    }
}

// File Operations
function renderFiles() {
    const filesList = document.getElementById('filesList');
    const currentFiles = appState.files[appState.currentPath] || [];
    
    if (currentFiles.length === 0) {
        filesList.innerHTML = `
            <div class="empty-state">
                <p>📂 No files in this folder. Upload files to get started!</p>
            </div>
        `;
        return;
    }
    
    filesList.innerHTML = currentFiles.map((file, index) => `
        <div class="file-item ${appState.selectedFiles.includes(index) ? 'selected' : ''}" data-index="${index}">
            <span class="file-icon ${getFileIconClass(file.type, file.name)}"></span>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">${formatFileSize(file.size)} • ${formatDate(file.uploaded)}</div>
            </div>
            <div class="file-actions">
                <button class="file-action-btn btn-primary" onclick="downloadFile(${index})">⬇️</button>
                ${file.type === 'application/zip' || file.name.endsWith('.zip') ? 
                    `<button class="file-action-btn btn-secondary" onclick="extractZip(${index})">📦 Extract</button>` : ''}
                <button class="file-action-btn btn-secondary" onclick="editFile(${index})">✏️</button>
            </div>
        </div>
    `).join('');
    
    // Add click listeners for file selection
    filesList.querySelectorAll('.file-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                toggleFileSelection(parseInt(item.dataset.index));
            }
        });
    });
}

function getFileIconClass(type, name) {
    if (type?.startsWith('image')) return 'file-icon-image';
    if (type?.startsWith('video')) return 'file-icon-video';
    if (type?.startsWith('audio')) return 'file-icon-audio';
    if (type === 'application/pdf') return 'file-icon-pdf';
    if (type === 'application/zip' || name?.endsWith('.zip')) return 'file-icon-zip';
    if (name?.endsWith('.html') || name?.endsWith('.css') || name?.endsWith('.js')) return 'file-icon-code';
    if (type === 'folder') return 'file-icon-folder';
    return 'file-icon-default';
}

function toggleFileSelection(index) {
    const selectedIndex = appState.selectedFiles.indexOf(index);
    if (selectedIndex === -1) {
        appState.selectedFiles.push(index);
    } else {
        appState.selectedFiles.splice(selectedIndex, 1);
    }
    renderFiles();
}

function selectAllFiles() {
    const currentFiles = appState.files[appState.currentPath] || [];
    if (appState.selectedFiles.length === currentFiles.length) {
        appState.selectedFiles = [];
    } else {
        appState.selectedFiles = currentFiles.map((_, index) => index);
    }
    renderFiles();
}

// File Upload
function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('uploadZone').classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('uploadZone').classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('uploadZone').classList.remove('dragover');
    const files = e.dataTransfer.files;
    processFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    processFiles(files);
}

function processFiles(files) {
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    uploadProgress.style.display = 'block';
    let processedFiles = 0;
    
    Array.from(files).forEach(file => {
        if (file.size > 1024 * 1024 * 1024) {
            showToast(`❌ File "${file.name}" exceeds 1GB limit`, 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = {
                name: file.name,
                type: file.type,
                size: file.size,
                content: e.target.result,
                uploaded: new Date().toISOString()
            };
            
            // Initialize current path array if doesn't exist
            if (!appState.files[appState.currentPath]) {
                appState.files[appState.currentPath] = [];
            }
            
            appState.files[appState.currentPath].push(fileData);
            appState.storageUsed += file.size;
            
            processedFiles++;
            const progress = Math.round((processedFiles / files.length) * 100);
            progressFill.style.width = progress + '%';
            progressText.textContent = progress + '%';
            
            if (processedFiles === files.length) {
                saveState();
                renderFiles();
                updateStorageInfo();
                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                    showToast(`✅ Successfully uploaded ${files.length} file(s)`, 'success');
                }, 1000);
            }
        };
        
        reader.readAsDataURL(file);
    });
}

// File Download
function downloadFile(index) {
    const currentFiles = appState.files[appState.currentPath] || [];
    const file = currentFiles[index];
    
    if (file) {
        const link = document.createElement('a');
        link.href = file.content;
        link.download = file.name;
        link.click();
        showToast(`⬇️ Downloading "${file.name}"`, 'info');
    }
}

// File Operations
function createNewFolder() {
    showModal('Create New Folder', `
        <div class="form-group">
            <label>Folder Name</label>
            <input type="text" id="folderName" placeholder="Enter folder name">
        </div>
        <button class="btn-primary" onclick="confirmCreateFolder()">Create Folder</button>
    `);
}

function confirmCreateFolder() {
    const folderName = document.getElementById('folderName').value.trim();
    if (folderName) {
        const folderData = {
            name: folderName,
            type: 'folder',
            size: 0,
            uploaded: new Date().toISOString()
        };
        
        if (!appState.files[appState.currentPath]) {
            appState.files[appState.currentPath] = [];
        }
        
        appState.files[appState.currentPath].push(folderData);
        saveState();
        renderFiles();
        closeModal();
        showToast(`📁 Folder "${folderName}" created`, 'success');
    }
}

function deleteSelectedFiles() {
    if (appState.selectedFiles.length === 0) {
        showToast('⚠️ No files selected', 'warning');
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${appState.selectedFiles.length} file(s)?`)) {
        const currentFiles = appState.files[appState.currentPath] || [];
        
        // Sort indices in descending order to avoid shifting issues
        appState.selectedFiles.sort((a, b) => b - a).forEach(index => {
            const file = currentFiles[index];
            if (file && file.type !== 'folder') {
                appState.storageUsed -= file.size;
            }
            currentFiles.splice(index, 1);
        });
        
        appState.selectedFiles = [];
        saveState();
        renderFiles();
        updateStorageInfo();
        showToast('🗑️ Files deleted successfully', 'success');
    }
}

function copyFiles() {
    if (appState.selectedFiles.length === 0) {
        showToast('⚠️ No files selected', 'warning');
        return;
    }
    
    const currentFiles = appState.files[appState.currentPath] || [];
    appState.clipboard = {
        action: 'copy',
        files: appState.selectedFiles.map(index => currentFiles[index])
    };
    
    showToast(`📋 ${appState.selectedFiles.length} file(s) copied to clipboard`, 'info');
}

function pasteFiles() {
    if (!appState.clipboard.files || appState.clipboard.files.length === 0) {
        showToast('⚠️ Clipboard is empty', 'warning');
        return;
    }
    
    if (!appState.files[appState.currentPath]) {
        appState.files[appState.currentPath] = [];
    }
    
    appState.clipboard.files.forEach(file => {
        const newFile = { ...file };
        newFile.uploaded = new Date().toISOString();
        appState.files[appState.currentPath].push(newFile);
        
        if (file.type !== 'folder') {
            appState.storageUsed += file.size;
        }
    });
    
    saveState();
    renderFiles();
    updateStorageInfo();
    showToast('📝 Files pasted successfully', 'success');
}

function renameFile() {
    if (appState.selectedFiles.length !== 1) {
        showToast('⚠️ Please select exactly one file to rename', 'warning');
        return;
    }
    
    const currentFiles = appState.files[appState.currentPath] || [];
    const file = currentFiles[appState.selectedFiles[0]];
    
    showModal('Rename File', `
        <div class="form-group">
            <label>Current Name</label>
            <input type="text" value="${file.name}" disabled>
        </div>
        <div class="form-group">
            <label>New Name</label>
            <input type="text" id="newFileName" value="${file.name}">
        </div>
        <button class="btn-primary" onclick="confirmRename()">Rename</button>
    `);
}

function confirmRename() {
    const newName = document.getElementById('newFileName').value.trim();
    if (newName) {
        const currentFiles = appState.files[appState.currentPath] || [];
        currentFiles[appState.selectedFiles[0]].name = newName;
        saveState();
        renderFiles();
        closeModal();
        showToast('✏️ File renamed successfully', 'success');
    }
}

// Zip Extraction (Simulated)
function extractZip(index) {
    const currentFiles = appState.files[appState.currentPath] || [];
    const file = currentFiles[index];
    
    showModal('Extract Zip File', `
        <p>Extracting "${file.name}"...</p>
        <div class="spinner"></div>
        <p id="extractStatus">Preparing extraction...</p>
    `);
    
    setTimeout(() => {
        document.getElementById('extractStatus').textContent = 'Extraction complete!';
        setTimeout(() => {
            closeModal();
            showToast('📦 Zip file extracted successfully', 'success');
        }, 1000);
    }, 2000);
}

// Editor Functions
function editFile(index) {
    const currentFiles = appState.files[appState.currentPath] || [];
    const file = currentFiles[index];
    
    if (!file || !file.content) {
        showToast('⚠️ Cannot edit this file type', 'warning');
        return;
    }
    
    // Switch to editor tab
    switchTab('editor');
    
    // Set editor language
    const languageSelect = document.getElementById('editorLanguage');
    if (file.name.endsWith('.html')) {
        languageSelect.value = 'html';
    } else if (file.name.endsWith('.css')) {
        languageSelect.value = 'css';
    } else if (file.name.endsWith('.js')) {
        languageSelect.value = 'javascript';
    } else {
        languageSelect.value = 'text';
    }
    
    // Load file content into editor
    document.getElementById('codeEditor').value = file.content;
    
    showToast(`✏️ Editing "${file.name}"`, 'info');
}

function saveEditorContent() {
    const content = document.getElementById('codeEditor').value;
    // In a real implementation, this would save to the current file
    showToast('💾 Content saved (Demo mode)', 'success');
}

function previewEditorContent() {
    const content = document.getElementById('codeEditor').value;
    const preview = document.getElementById('editorPreview');
    
    preview.style.display = 'block';
    preview.innerHTML = content;
    
    showToast('👁️ Preview generated', 'info');
}

function formatCode() {
    const editor = document.getElementById('codeEditor');
    const content = editor.value;
    
    // Basic formatting (in real app, use a proper formatter)
    try {
        const formatted = content
            .replace(/\s+/g, ' ')
            .replace(/>\s*</g, '><')
            .replace(/\s*{\s*/g, ' {\n  ')
            .replace(/;\s*/g, ';\n  ')
            .replace(/}\s*/g, '\n}\n');
        
        editor.value = formatted;
        showToast('✨ Code formatted', 'success');
    } catch (error) {
        showToast('⚠️ Could not format code', 'warning');
    }
}

// Viewer Functions
function updateViewerFileSelect() {
    const select = document.getElementById('viewerFileSelect');
    select.innerHTML = '<option value="">Select a file to view</option>';
    
    // Get all files from all paths
    Object.keys(appState.files).forEach(path => {
        appState.files[path].forEach((file, index) => {
            if (file.type !== 'folder') {
                const option = document.createElement('option');
                option.value = `${path}|${index}`;
                option.textContent = `${path}/${file.name}`;
                select.appendChild(option);
            }
        });
    });
}

document.getElementById('viewerFileSelect').addEventListener('change', function() {
    const value = this.value;
    if (value) {
        const [path, index] = value.split('|');
        const file = appState.files[path][parseInt(index)];
        viewFile(file);
    }
});

function viewFile(file) {
    const viewer = document.getElementById('fileViewer');
    
    if (file.type?.startsWith('image')) {
        viewer.innerHTML = `<img src="${file.content}" style="max-width: 100%; height: auto;" alt="${file.name}">`;
    } else if (file.type?.startsWith('video')) {
        viewer.innerHTML = `<video src="${file.content}" controls style="max-width: 100%;"></video>`;
    } else if (file.type?.startsWith('audio')) {
        viewer.innerHTML = `<audio src="${file.content}" controls style="width: 100%;"></audio>`;
    } else if (file.type === 'application/pdf') {
        viewer.innerHTML = `<iframe src="${file.content}" style="width: 100%; height: 500px; border: none;"></iframe>`;
    } else if (file.name.endsWith('.html')) {
        viewer.innerHTML = `<iframe src="${file.content}" style="width: 100%; height: 500px; border: none;"></iframe>`;
    } else {
        viewer.innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word;">${file.content.substring(0, 1000)}${file.content.length > 1000 ? '...' : ''}</pre>`;
    }
}

// Settings Functions
function updateSettings() {
    appState.settings.publicAccess = document.getElementById('publicAccess').checked;
    appState.settings.googleIndex = document.getElementById('googleIndex').checked;
    appState.settings.adsEnabled = document.getElementById('adsEnabled').checked;
    saveState();
    showToast('⚙️ Settings updated', 'success');
}

// Domain Functions
function updateDomainDisplay() {
    const domains = [
        window.location.href,
        'www.' + window.location.hostname,
        'http://' + window.location.hostname,
        'https://' + window.location.hostname
    ];
    
    const currentDomain = domains[0];
    document.getElementById('currentDomain').textContent = currentDomain;
    document.getElementById('currentDomainDisplay').textContent = currentDomain;
}

// Storage Functions
function updateStorageInfo() {
    const usedMB = (appState.storageUsed / (1024 * 1024)).toFixed(2);
    const totalMB = 1024;
    const percentage = (appState.storageUsed / (1024 * 1024 * 1024)) * 100;
    
    document.getElementById('storageUsed').textContent = `${usedMB} MB`;
    document.getElementById('storageFill').style.width = `${percentage}%`;
}

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#e74c3c' : 
                           type === 'success' ? '#27ae60' : 
                           type === 'warning' ? '#f39c12' : '#2c3e50';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showModal(title, body) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Google Integration (Demo)
function initializeGoogleAnalytics() {
    // In production, this would load Google Analytics
    console.log('Google Analytics initialized (Demo mode)');
}

function initializeGoogleSearchConsole() {
    // In production, this would verify with Google Search Console
    console.log('Google Search Console verification (Demo mode)');
}

// Initialize Google services
initializeGoogleAnalytics();
initializeGoogleSearchConsole();