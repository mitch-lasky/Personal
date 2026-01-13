// Admin dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadAboutText();
    loadMediaList();
    loadLinksList();
    
    // Form handlers
    document.getElementById('about-form').addEventListener('submit', handleAboutUpdate);
    document.getElementById('media-form').addEventListener('submit', handleMediaUpload);
    document.getElementById('links-form').addEventListener('submit', handleLinkAdd);
});

// About Text Management
async function loadAboutText() {
    try {
        const data = await apiCall('/about');
        document.getElementById('about-text').value = data.text || '';
    } catch (error) {
        showError('Failed to load about text');
    }
}

async function handleAboutUpdate(e) {
    e.preventDefault();
    const text = document.getElementById('about-text').value;
    
    try {
        await apiCall('/about', 'PUT', { text });
        showSuccess('About text updated successfully');
    } catch (error) {
        showError('Failed to update about text');
    }
}

// Media Management
async function loadMediaList() {
    try {
        const mediaItems = await apiCall('/media');
        const list = document.getElementById('media-list');
        list.innerHTML = '';
        
        if (mediaItems.length === 0) {
            list.innerHTML = '<li style="padding: 1rem; color: #999;">No media uploaded yet</li>';
            return;
        }
        
        mediaItems.forEach(item => {
            const li = document.createElement('li');
            li.className = 'media-list-item';
            li.innerHTML = `
                <div>
                    <strong>${escapeHtml(item.title)}</strong><br>
                    <small>${escapeHtml(item.filename)}</small>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary" onclick="editMedia(${item.id})">Edit</button>
                    <button class="btn btn-small" onclick="deleteMedia(${item.id})">Delete</button>
                </div>
            `;
            list.appendChild(li);
        });
    } catch (error) {
        showError('Failed to load media list');
    }
}

async function handleMediaUpload(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', document.getElementById('media-title').value);
    formData.append('description', document.getElementById('media-description').value);
    formData.append('date', document.getElementById('media-date').value);
    formData.append('file', document.getElementById('media-file').files[0]);
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/media', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        showSuccess('Media uploaded successfully');
        document.getElementById('media-form').reset();
        loadMediaList();
    } catch (error) {
        showError('Failed to upload media');
    }
}

async function deleteMedia(id) {
    if (!confirm('Are you sure you want to delete this media item?')) return;
    
    try {
        await apiCall(`/media/${id}`, 'DELETE');
        showSuccess('Media deleted successfully');
        loadMediaList();
    } catch (error) {
        showError('Failed to delete media');
    }
}

// Links Management
async function loadLinksList() {
    try {
        const links = await apiCall('/links');
        const list = document.getElementById('links-list');
        list.innerHTML = '';
        
        if (links.length === 0) {
            list.innerHTML = '<li style="padding: 1rem; color: #999;">No links added yet</li>';
            return;
        }
        
        links.forEach(link => {
            const li = document.createElement('li');
            li.className = 'links-list-item';
            li.innerHTML = `
                <div>
                    <strong>${link.icon} ${escapeHtml(link.title)}</strong><br>
                    <small>${escapeHtml(link.url)}</small>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary" onclick="editLink(${link.id})">Edit</button>
                    <button class="btn btn-small" onclick="deleteLink(${link.id})">Delete</button>
                </div>
            `;
            list.appendChild(li);
        });
    } catch (error) {
        showError('Failed to load links');
    }
}

async function handleLinkAdd(e) {
    e.preventDefault();
    
    const linkData = {
        title: document.getElementById('link-title').value,
        description: document.getElementById('link-description').value,
        url: document.getElementById('link-url').value,
        icon: document.getElementById('link-icon').value || '🔗'
    };
    
    try {
        await apiCall('/links', 'POST', linkData);
        showSuccess('Link added successfully');
        document.getElementById('links-form').reset();
        loadLinksList();
    } catch (error) {
        showError('Failed to add link');
    }
}

async function deleteLink(id) {
    if (!confirm('Are you sure you want to delete this link?')) return;
    
    try {
        await apiCall(`/links/${id}`, 'DELETE');
        showSuccess('Link deleted successfully');
        loadLinksList();
    } catch (error) {
        showError('Failed to delete link');
    }
}

// Helper functions
function showSuccess(message) {
    const div = document.getElementById('success-message');
    div.textContent = message;
    div.style.display = 'block';
    setTimeout(() => {
        div.style.display = 'none';
    }, 5000);
    
    // Hide error message if shown
    document.getElementById('error-message').style.display = 'none';
}

function showError(message) {
    const div = document.getElementById('error-message');
    div.textContent = message;
    div.style.display = 'block';
    setTimeout(() => {
        div.style.display = 'none';
    }, 5000);
    
    // Hide success message if shown
    document.getElementById('success-message').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
