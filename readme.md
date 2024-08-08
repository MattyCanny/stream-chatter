# Twitch Chat Display

This project displays Twitch chat messages in an alternative format where each chatter has their own box or card on the screen that shows their details and messages. The boxes are ordered by who chatted most recently.

## Directory Structure

```
twitch-chat-display/
├── index.html
├── styles/
│   └── styles.css
├── scripts/
│   └── script.js
└── README.md
```

## Usage

1. Open `index.html` in a web browser.
2. The chat messages will be displayed in individual boxes.
3. When a user sends a message, their box will move to the top left of the screen.

## Example

To add a chat message, use the `addChatMessage` function in `script.js`:

```javascript
addChatMessage('user1', 'Hello, world!');
addChatMessage('user2', 'Hi there!');
addChatMessage('user1', 'How are you?');
```

