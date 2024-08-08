import './styles.css';
import tmi from 'tmi.js';

const chatContainer = document.getElementById('chat-container');
const loginContainer = document.getElementById('login-container');
const loginForm = document.getElementById('login-form');
const channelNameElement = document.getElementById('channel-name');
const channelLogoElement = document.getElementById('channel-logo');
const increaseFontButton = document.getElementById('increase-font');
const decreaseFontButton = document.getElementById('decrease-font');
const increaseBoxSizeButton = document.getElementById('increase-box-size');
const decreaseBoxSizeButton = document.getElementById('decrease-box-size');
const loadingOverlay = document.getElementById('loading-overlay');
const toggleTimestampsCheckbox = document.getElementById('toggle-timestamps');

let currentFontSize = 16; // Default font size
let currentBoxSize = 200; // Default box size
let client; // Declare client variable outside the function
let isListenerAttached = false; // Flag to track event listener attachment
const recentMessages = new Map(); // Map to store recent messages with timestamps
const messageTimeout = 5000; // Time window in milliseconds to consider messages as duplicates

function addChatMessage(username, message, badges, profileImageUrl, profileColor) {
    if (!username || !message) {
        console.log('Skipping empty message or username:', { username, message });
        return; // Ensure username and message are not empty
    }

    const now = Date.now();

    // Check if a similar message has been received from the same user within the time window
    if (recentMessages.has(username)) {
        const { lastMessage, timestamp } = recentMessages.get(username);
        if (lastMessage === message && (now - timestamp) < messageTimeout) {
            console.log('Duplicate message detected, skipping:', message);
            return; // Skip adding the message
        }
    }

    // Update the recent messages map
    recentMessages.set(username, { lastMessage: message, timestamp: now });

    let chatBox = document.getElementById(username);

    if (!chatBox) {
        console.log('Creating new chat box for:', username);
        chatBox = document.createElement('div');
        chatBox.id = username;
        chatBox.className = 'chat-box';
        chatBox.innerHTML = `
            <div class="username">
                <img src="${profileImageUrl}" class="profile-image" alt="${username}">
                ${getBadgesHTML(badges)}
                <span class="username-text" style="color: ${profileColor};">${username}</span>
            </div>
            <div class="messages"></div>`;
        chatContainer.appendChild(chatBox); // Append to the end to maintain order
    } else {
        console.log('Moving existing chat box for:', username);
        // Move the chat box to the top
        chatContainer.removeChild(chatBox);
        chatContainer.insertBefore(chatBox, chatContainer.firstChild);
    }

    const messagesDiv = chatBox.querySelector('.messages');
    const messageElement = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString(); // Get the current time as a string
    messageElement.innerHTML = `<span class="timestamp">${timestamp}</span> ${message}`;
    messageElement.style.fontSize = `${currentFontSize}px`; // Set the font size
    messagesDiv.appendChild(messageElement);

    // Show the chat container if it's hidden
    chatContainer.classList.remove('hidden');
}

function getBadgesHTML(badges) {
    if (!badges) return '';
    return Object.keys(badges).map(badge => {
        const badgeVersion = badges[badge];
        const badgeUrl = `https://static-cdn.jtvnw.net/badges/v1/${badge}/${badgeVersion}/1`;
        return `<img src="${badgeUrl}" class="badge" alt="${badge}">`;
    }).join('');
}

function fetchProfileImageUrl(username, callback) {
    fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
        headers: {
            'Authorization': `Bearer ${getOAuthToken()}`,
            'Client-ID': clientId
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.data && data.data.length > 0) {
            const profileImageUrl = data.data[0].profile_image_url;
            callback(profileImageUrl);
        } else {
            callback(null);
        }
    })
    .catch(error => {
        console.error('Error fetching profile image URL:', error);
        callback(null);
    });
}

// OAuth and tmi.js setup
const clientId = process.env.CLIENT_ID;
const redirectUri = process.env.REDIRECT_URI;
const scopes = 'chat:read chat:edit';

function getOAuthToken() {
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const token = urlParams.get('access_token');
    
    // Remove the access token from the URL
    if (token) {
        history.replaceState(null, null, ' ');
    }
    
    return token;
}

function authenticate(username, channelName) {
    const token = getOAuthToken();
    if (!token) {
        const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scopes}`;
        window.location = authUrl;
    } else {
        connectToTwitchChat(token, username, channelName);
    }
}

function connectToTwitchChat(token, username, channelName) {
    console.log('Connecting to Twitch chat...');
    if (client) {
        console.log('Disconnecting existing client...');
        client.disconnect(); // Disconnect existing client if any
        isListenerAttached = false; // Reset the flag when disconnecting
    }

    client = new tmi.Client({
        options: { debug: true },
        connection: {
            reconnect: true,
            secure: true
        },
        identity: {
            username: username,
            password: `oauth:${token}`
        },
        channels: [ channelName ]
    });

    client.connect();

    // Ensure the event listener is attached only once
    if (!isListenerAttached) {
        console.log('Attaching event listener...');
        client.on('message', (channel, tags, message, self) => {
            if(self) return; // Ignore messages from the bot itself

            const displayName = tags['display-name'] || tags['username'];
            const badges = tags['badges']; // Get badges from tags
            const profileColor = tags['color']; // Get profile color from tags
            console.log(`Message received from ${displayName}: ${message}`);

            fetchProfileImageUrl(displayName, (profileImageUrl) => {
                addChatMessage(displayName, message, badges, profileImageUrl, profileColor);
            });
        });
        isListenerAttached = true; // Set the flag to true after attaching the listener
    }

    // Fetch and display channel information
    fetch(`https://api.twitch.tv/helix/users?login=${channelName}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Client-ID': clientId
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.data && data.data.length > 0) {
            const channelInfo = data.data[0];
            channelNameElement.textContent = channelInfo.display_name;
            channelLogoElement.src = channelInfo.profile_image_url;
            localStorage.setItem('channelLogoUrl', channelInfo.profile_image_url); // Store the channel logo URL
        }
    })
    .catch(error => {
        console.error('Error fetching channel information:', error);
    });
}

// Check for access token on page load
window.addEventListener('load', () => {
    const token = getOAuthToken();
    const channelIcon = document.getElementById('channel-logo');
    const channelNameElement = document.getElementById('channel-name');
    if (token) {
        const username = localStorage.getItem('username');
        const channelName = localStorage.getItem('channelName');
        const channelLogoUrl = localStorage.getItem('channelLogoUrl'); // Assuming you store the channel logo URL
        if (username && channelName) {
            loginContainer.style.display = 'none';
            chatContainer.style.display = 'block';
            connectToTwitchChat(token, username, channelName);
            // Set the channel logo source
            channelIcon.src = channelLogoUrl;
            channelNameElement.textContent = channelName;
        }
    }
    // Hide the loading overlay once the page is fully loaded
    loadingOverlay.style.display = 'none';

    // Hide the chat container initially
    chatContainer.classList.add('hidden');
});

loginForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const channelName = document.getElementById('channel').value;
    localStorage.setItem('username', username);
    localStorage.setItem('channelName', channelName);
    loginContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    authenticate(username, channelName);
});

// Font size adjustment controls
increaseFontButton.addEventListener('click', () => {
    currentFontSize += 2;
    updateFontSize();
});

decreaseFontButton.addEventListener('click', () => {
    currentFontSize -= 2;
    updateFontSize();
});

function updateFontSize() {
    const messageElements = document.querySelectorAll('.messages div');
    messageElements.forEach(element => {
        element.style.fontSize = `${currentFontSize}px`;
    });
}

// Box size adjustment controls
document.addEventListener('DOMContentLoaded', () => {
    const increaseBoxSizeButton = document.getElementById('increase-box-size');
    const decreaseBoxSizeButton = document.getElementById('decrease-box-size');

    increaseBoxSizeButton.addEventListener('click', () => {
        const chatBoxes = document.querySelectorAll('.chat-box');
        chatBoxes.forEach(chatBox => {
            const currentHeight = parseInt(window.getComputedStyle(chatBox).height, 10);
            chatBox.style.height = `${currentHeight + 20}px`; // Increase height by 20px
        });
    });

    decreaseBoxSizeButton.addEventListener('click', () => {
        const chatBoxes = document.querySelectorAll('.chat-box');
        chatBoxes.forEach(chatBox => {
            const currentHeight = parseInt(window.getComputedStyle(chatBox).height, 10);
            chatBox.style.height = `${currentHeight - 20}px`; // Decrease height by 20px
        });
    });
});

function updateBoxSize() {
    chatContainer.style.gridTemplateColumns = `repeat(auto-fill, minmax(${currentBoxSize}px, 1fr))`;
}

// Event listener for the toggle timestamps checkbox
toggleTimestampsCheckbox.addEventListener('change', (event) => {
    if (event.target.checked) {
        chatContainer.classList.add('show-timestamps');
    } else {
        chatContainer.classList.remove('show-timestamps');
    }
});