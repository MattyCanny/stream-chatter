import './styles.css';
import tmi from 'tmi.js';

const chatContainer = document.getElementById('chat-container');
const loginContainer = document.getElementById('login-container');
const loginForm = document.getElementById('login-form');
const channelNameElement = document.getElementById('channel-name');
const channelLogoElement = document.getElementById('channel-logo');
const increaseFontButton = document.getElementById('increase-font');
const decreaseFontButton = document.getElementById('decrease-font');

let currentFontSize = 16; // Default font size
let client; // Declare client variable outside the function
let isListenerAttached = false; // Flag to track event listener attachment

function addChatMessage(username, message) {
    let chatBox = document.getElementById(username);

    if (!chatBox) {
        chatBox = document.createElement('div');
        chatBox.id = username;
        chatBox.className = 'chat-box';
        chatBox.innerHTML = `<div class="username">${username}</div><div class="messages"></div>`;
        chatContainer.prepend(chatBox);
    } else {
        chatContainer.prepend(chatBox);
    }

    const messagesDiv = chatBox.querySelector('.messages');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.fontSize = `${currentFontSize}px`; // Set the font size
    messagesDiv.appendChild(messageElement);
}

// OAuth and tmi.js setup
const clientId = process.env.CLIENT_ID;
const redirectUri = process.env.REDIRECT_URI;
const scopes = 'chat:read chat:edit';

function getOAuthToken() {
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    return urlParams.get('access_token');
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
            console.log(`Message received from ${displayName}: ${message}`);
            addChatMessage(displayName, message);
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
        }
    })
    .catch(error => {
        console.error('Error fetching channel information:', error);
    });
}

// Check for access token on page load
window.addEventListener('load', () => {
    const token = getOAuthToken();
    if (token) {
        const username = localStorage.getItem('username');
        const channelName = localStorage.getItem('channelName');
        if (username && channelName) {
            loginContainer.style.display = 'none';
            chatContainer.style.display = 'block';
            connectToTwitchChat(token, username, channelName);
        }
    }
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