// frontend/script.js
// This file contains shared utility functions used across all pages

// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Utility function to format dates in Indian format
function formatDate(dateString) {
    return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Utility function to check authentication
function checkAuth(requiredRole) {
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');
    
    if (!userId || !role) {
        window.location.href = 'index.html';
        return false;
    }
    
    if (requiredRole && role !== requiredRole) {
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// Utility function for API calls
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Show notification (you can use this for better UX)
function showNotification(message, type = 'info') {
    // Simple alert for now, can be enhanced with custom notifications
    alert(message);
}

// Export functions (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_BASE_URL,
        formatDate,
        checkAuth,
        apiCall,
        showNotification
    };
}