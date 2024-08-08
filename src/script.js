import './styles.css';

const chatContainer = document.getElementById('chat-container');
const loginContainer = document.getElementById('login-container');
const loginForm = document.getElementById('login-form');

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
    const client = new tmi.Client({
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

    client.on('message', (channel, tags, message, self) => {
        if(self) return; // Ignore messages from the bot itself

        const displayName = tags['display-name'] || tags['username'];
        addChatMessage(displayName, message);
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