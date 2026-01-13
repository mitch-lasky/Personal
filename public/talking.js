// Load media content for the Talking page
document.addEventListener('DOMContentLoaded', async function() {
    const mediaGrid = document.getElementById('media-content');
    
    if (!mediaGrid) return;

    try {
        // Fetch media items from the API
        const response = await fetch('/api/media');
        const mediaItems = await response.json();
        
        if (mediaItems && mediaItems.length > 0) {
            // Clear placeholder content
            mediaGrid.innerHTML = '';
            
            // Render each media item
            mediaItems.forEach(item => {
                const mediaElement = createMediaElement(item);
                mediaGrid.appendChild(mediaElement);
            });
        }
    } catch (error) {
        console.error('Error loading media:', error);
        // Keep placeholder content on error
    }
});

function createMediaElement(item) {
    const div = document.createElement('div');
    div.className = 'media-item';
    
    // Determine media type
    const fileExtension = item.filename.split('.').pop().toLowerCase();
    const isVideo = ['mp4', 'mov', 'webm'].includes(fileExtension);
    const isAudio = ['mp3', 'wav', 'ogg'].includes(fileExtension);
    
    let playerHTML = '';
    if (isVideo) {
        playerHTML = `
            <video controls>
                <source src="/media/${item.filename}" type="video/${fileExtension === 'mov' ? 'quicktime' : fileExtension}">
                Your browser does not support the video element.
            </video>
        `;
    } else if (isAudio) {
        playerHTML = `
            <audio controls>
                <source src="/media/${item.filename}" type="audio/${fileExtension === 'mp3' ? 'mpeg' : fileExtension}">
                Your browser does not support the audio element.
            </audio>
        `;
    }
    
    div.innerHTML = `
        <div class="media-description">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            ${item.date ? `<span class="media-date">${formatDate(item.date)}</span>` : ''}
        </div>
        <div class="media-player">
            ${playerHTML}
        </div>
    `;
    
    return div;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
