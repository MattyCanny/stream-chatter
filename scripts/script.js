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

// Example usage:
addChatMessage('user1', 'Hello, world!');
addChatMessage('user2', 'Hi there!');
addChatMessage('user1', 'How are you?');
