// Load environment variables from .env file
if (typeof process !== 'undefined') {
    require('dotenv').config();
}

const chatContainer = document.getElementById('chat-container');

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

function authenticate() {
    const token = getOAuthToken();
    if (!token) {
        const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scopes}`;
        window.location = authUrl;
    } else {
        const channelName = prompt("Enter the Twitch channel name:");
        connectToTwitchChat(token, channelName);
    }
}

function connectToTwitchChat(token, channelName) {
    const client = new tmi.Client({
        options: { debug: true },
        connection: {
            reconnect: true,
            secure: true
        },
        identity: {
            username: 'your_twitch_username',
            password: `oauth:${token}`
        },
        channels: [ channelName ]
    });

    client.connect();

    client.on('message', (channel, tags, message, self) => {
        if(self) return; // Ignore messages from the bot itself

        const username = tags['display-name'] || tags['username'];
        addChatMessage(username, message);
    });
}

authenticate();