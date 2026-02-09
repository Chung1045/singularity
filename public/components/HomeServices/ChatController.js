/**
 * ChatController - Main chat logic and event handlers
 * Handles message submission, chat thread loading, and project data fetching
 */

const ChatController = {
    currentChatID: null,

    /**
     * Submit a conversation request (new message or edit)
     */
    async submitConversation() {
        const input = document.getElementById("main-message-input");
        const userMessage = input?.value?.trim();
        if (!userMessage) return;

        const projectDropdown = document.getElementById("select-project-drop-down");
        const projectID = projectDropdown?.value;
        if (!projectID) {
            console.error("No project selected");
            return;
        }

        // Handle edit mode
        if (EditMode.isEditing) {
            await this._handleEditSubmit(userMessage, projectID);
            return;
        }

        // Normal message submission
        await this._handleNewMessage(userMessage, projectID);
    },

    /**
     * Handle editing an existing message
     */
    async _handleEditSubmit(userMessage, projectID) {
        const { conversationID, chatSeq, originalText } = EditMode.state;

        if (userMessage === originalText) {
            EditMode.cancel();
            ChatUtils.clearInput();
            return;
        }

        const selectedSource = ChatUtils.getSelectedSource();
        const chipFileIDs = ChatUtils.getChipFileIDs();
        const allAttachedDocuments = ChatUtils.mergeAttachedDocuments(selectedSource, chipFileIDs);

        ChatUtils.clearInput();
        ChatUtils.clearSelectedFiles();
        EditMode.removeMessagesFromSeq(chatSeq);

        addMessage('user', userMessage, conversationID, chatSeq, allAttachedDocuments);

        const typingId = ChatUtils.showTypingIndicator();

        try {
            const data = await ChatService.editConversation({
                projectID,
                chatID: this.currentChatID,
                chatSeq,
                conversationID,
                message: userMessage,
                attachedDocumentIDs: allAttachedDocuments
            });

            ChatUtils.removeTypingIndicator(typingId);

            if (data.success) {
                addMessage('ai', data.response);
            } else {
                addMessage('ai', 'Sorry, there was an error editing your message.');
            }
        } catch (error) {
            ChatUtils.removeTypingIndicator(typingId);
            addMessage('ai', 'Sorry, there was an error editing your message.');
            console.error('Error editing message:', error);
        } finally {
            EditMode.cancel();
        }
    },

    /**
     * Handle new message submission
     */
    async _handleNewMessage(userMessage, projectID) {
        const selectedChatItem = document.querySelector('.chat-history-item.selected');
        let chatID = this.currentChatID || selectedChatItem?.dataset?.chatId || '';

        const selectedSource = ChatUtils.getSelectedSource();
        const chipFileIDs = ChatUtils.getChipFileIDs();
        const allAttachedDocuments = ChatUtils.mergeAttachedDocuments(selectedSource, chipFileIDs);

        const data = {
            projectID,
            chatID,
            message: userMessage,
            attachedDocumentIDs: allAttachedDocuments
        };

        ChatUtils.showChatInterface();
        addMessage('user', userMessage, null, null, allAttachedDocuments);
        ChatUtils.clearInput();
        ChatUtils.clearSelectedFiles();

        const typingId = ChatUtils.showTypingIndicator();

        try {
            const result = await this._streamChatResponse(data, typingId);
            const newChatID = result?.chatID;
            const conversationID = result?.conversationID;
            const chatSeq = result?.chatSeq;

            // Update user message with conversation data
            if (conversationID && chatSeq) {
                const userMessages = document.querySelectorAll('.user-message');
                const lastUserMessage = userMessages[userMessages.length - 1];
                if (lastUserMessage) {
                    lastUserMessage.dataset.conversationId = conversationID;
                    lastUserMessage.dataset.chatSeq = chatSeq;

                    const editBtn = lastUserMessage.querySelector('.message-edit-btn');
                    if (editBtn) {
                        editBtn.onclick = () => EditMode.start(userMessage, conversationID, chatSeq);
                    }
                }
            }

            // Handle new chat creation
            if (newChatID && newChatID !== chatID) {
                this.currentChatID = newChatID;
                window.currentChatID = newChatID;

                const currentUrl = new URL(window.location);
                currentUrl.searchParams.set('chatID', newChatID);
                window.history.pushState({ chatID: newChatID }, '', currentUrl);

                localStorage.setItem('activeChatID', newChatID);
                localStorage.setItem('activeChatProjectID', projectID);
                localStorage.removeItem('wentBackToInitial');

                setTimeout(() => {
                    const newChatItem = document.querySelector(`.chat-history-item[data-chat-id="${newChatID}"]`);
                    if (newChatItem) {
                        document.querySelectorAll('.chat-history-item').forEach(item => {
                            item.classList.remove('selected');
                            item.style.backgroundColor = 'transparent';
                        });
                        newChatItem.classList.add('selected');
                        newChatItem.style.backgroundColor = '#e0e0e0';
                    }
                }, 100);
            }
        } catch (error) {
            console.error("Error in submitConversationRequest:", error);
            ChatUtils.removeTypingIndicator(typingId);
            addMessage('ai', `Sorry, there was an error processing your request: ${error.message || 'Unknown error'}`);
        }
    },

    /**
     * Stream chat response from server
     */
    async _streamChatResponse(data, typingId) {
        console.log('=== STREAM CHAT RESPONSE ===');

        const response = await fetch('/api/agent/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        ChatUtils.removeTypingIndicator(typingId);

        // Create AI message container
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = `<img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">`;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.dataset.role = 'ai';

        // Progress indicator
        const progressIndicator = document.createElement('div');
        progressIndicator.id = 'ai-progress-indicator';
        progressIndicator.style.cssText = `
            display: flex; align-items: center; gap: 12px; padding: 12px 16px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px; font-family: Inter, Helvetica; font-size: 13px; color: #495057;
        `;
        progressIndicator.innerHTML = `
            <span id="stage-message" style="flex: 1;">Working on it...</span>
            <div class="spinner-small" style="width: 16px; height: 16px; border: 2px solid #dee2e6; border-top-color: #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        `;

        // Add spinner animation
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }

        bubble.appendChild(progressIndicator);

        const streamContentWrapper = document.createElement('div');
        streamContentWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
        streamContentWrapper.appendChild(bubble);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(streamContentWrapper);
        messagesContainer.appendChild(messageDiv);

        // Remove any previous suggestion chips
        removeSuggestionChips();

        ChatUtils.scrollToBottom();

        let fullResponse = '';
        let chatIDReceived = null;
        let conversationIDReceived = null;
        let chatSeqReceived = null;
        let buffer = '';

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const processSSEEvent = async (eventData) => {
            if (!eventData?.trim()) return;

            try {
                const jsonData = JSON.parse(eventData);

                if (jsonData.type === 'chatID') {
                    chatIDReceived = jsonData.chatID;
                    if (data.chatID === '') {
                        await fetchProjectChats(data.projectID);
                    }
                } else if (jsonData.type === 'reportGenerated') {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await window.fetchProjectReports?.(jsonData.projectID || data.projectID);
                    window.dispatchEvent(new CustomEvent('reportGenerated', {
                        detail: { projectID: jsonData.projectID || data.projectID, reportType: jsonData.reportType }
                    }));
                } else if (jsonData.type === 'stage') {
                    if (jsonData.stage === 2 && jsonData.status === 'complete' && jsonData.refreshRequirements) {
                        window.dispatchEvent(new CustomEvent('requirementsUpdated', {
                            detail: { projectID: jsonData.projectID || data.projectID }
                        }));
                        window.fetchProjectRequirements?.(jsonData.projectID || data.projectID);
                        window.fetchProjectUserStories?.(jsonData.projectID || data.projectID);
                    }
                } else if (jsonData.type === 'chunk') {
                    fullResponse += jsonData.content || '';
                    ChatUtils.setBubbleContent(bubble, fullResponse, { allowMarkdown: true });
                    ChatUtils.scrollToBottom();
                } else if (jsonData.type === 'done') {
                    if (jsonData.conversationID && jsonData.chatSeq) {
                        conversationIDReceived = jsonData.conversationID;
                        chatSeqReceived = jsonData.chatSeq;
                    }

                    const threadName = jsonData.threadName || 'New Chat';
                    const chatTitleElement = document.getElementById('chat-title');
                    if (chatTitleElement && threadName !== 'New Chat') {
                        chatTitleElement.textContent = threadName;
                    }

                    if (chatIDReceived) {
                        if (data.chatID === '') {
                            await fetchProjectChats(data.projectID);
                        }

                        const chatItem = document.querySelector(`.chat-history-item[data-chat-id="${chatIDReceived}"]`);
                        if (chatItem) {
                            document.querySelectorAll('.chat-history-item').forEach(item => {
                                item.classList.remove('selected');
                                item.style.backgroundColor = 'transparent';
                            });
                            chatItem.classList.add('selected');
                            chatItem.style.backgroundColor = '#e0e0e0';
                            chatItem.dataset.threadName = threadName;

                            const nameElement = chatItem.querySelector('.chat-item-name, span:first-child, span');
                            if (nameElement && threadName !== 'New Chat') {
                                nameElement.textContent = threadName;
                            }
                        }
                    }

                    if (typeof window.fetchProjectReports === 'function') {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await window.fetchProjectReports(data.projectID);
                    }

                    // Add timestamp to the streamed message
                    const tsDiv = document.createElement('div');
                    tsDiv.className = 'message-timestamp';
                    tsDiv.style.cssText = 'font-size: 12px; color: #999; padding-left: 12px;';
                    const tsNow = new Date();
                    tsDiv.textContent = `${tsNow.getHours().toString().padStart(2, '0')}:${tsNow.getMinutes().toString().padStart(2, '0')}`;
                    streamContentWrapper.appendChild(tsDiv);

                    // Add suggestion chips after streaming completes
                    appendSuggestionChips(streamContentWrapper);
                    ChatUtils.scrollToBottom();
                } else if (jsonData.type === 'error') {
                    ChatUtils.setBubbleContent(bubble, `Error: ${jsonData.message}`, { allowMarkdown: false });
                    bubble.style.color = '#f44336';
                    throw new Error(jsonData.message);
                }
            } catch (e) {
                console.error('Error parsing SSE event:', e.message);
            }
        };

        // Read stream
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let separatorIndex;
            while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
                const message = buffer.substring(0, separatorIndex);
                buffer = buffer.substring(separatorIndex + 2);

                for (const line of message.split('\n')) {
                    if (line.startsWith('data: ')) {
                        await processSSEEvent(line.substring(6));
                    }
                }
            }
        }

        // Process remaining buffer
        if (buffer.trim()) {
            for (const line of buffer.split('\n')) {
                if (line.startsWith('data: ')) {
                    await processSSEEvent(line.substring(6));
                }
            }
        }

        return { chatID: chatIDReceived, conversationID: conversationIDReceived, chatSeq: chatSeqReceived };
    },

    /**
     * Load a chat thread by ID
     */
    async loadChatThread(chatID) {
        console.log('Loading chat thread:', chatID);

        try {
            const data = await ChatService.loadThread(chatID);

            this.currentChatID = chatID;
            window.currentChatID = chatID;

            // Update URL
            const currentUrl = new URL(window.location);
            if (currentUrl.searchParams.get('chatID') !== chatID) {
                currentUrl.searchParams.set('chatID', chatID);
                window.history.pushState({ chatID }, '', currentUrl);
            }

            // Persist to localStorage
            localStorage.setItem('activeChatID', chatID);
            if (data.projectID) {
                localStorage.setItem('activeChatProjectID', data.projectID);
            }
            localStorage.removeItem('wentBackToInitial');

            // Update sidebar selection
            const chatItem = document.querySelector(`.chat-history-item[data-chat-id="${chatID}"]`);
            if (chatItem) {
                document.querySelectorAll('.chat-history-item').forEach(item => {
                    item.classList.remove('selected');
                    item.style.backgroundColor = 'transparent';
                });
                chatItem.classList.add('selected');
                chatItem.style.backgroundColor = '#e0e0e0';

                const chatTitleElement = document.getElementById('chat-title');
                if (chatTitleElement) {
                    chatTitleElement.textContent = chatItem.dataset.threadName || 'New Chat';
                }
            } else {
                const chatTitleElement = document.getElementById('chat-title');
                if (chatTitleElement) {
                    chatTitleElement.textContent = data.chat?.threadName || data.threadName || 'New Chat';
                }
            }

            // Clear messages
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) messagesContainer.innerHTML = '';

            ChatUtils.clearSelectedFiles();
            ChatUtils.clearInput();
            ChatUtils.showChatInterface();

            // Build file name map
            let fileNameMap = new Map();
            if (data.projectID) {
                try {
                    const filesResponse = await fetch('/api/project/file/list', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ projectID: data.projectID })
                    });

                    if (filesResponse.ok) {
                        const filesData = await filesResponse.json();
                        filesData.files?.forEach(file => {
                            const ext = file.documentExt || '';
                            let cleanName = (file.documentName || '').replace(/\.+$/, '');
                            const fullFileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
                            fileNameMap.set(file.documentID, fullFileName);
                        });
                    }
                } catch (error) {
                    console.error('Error fetching file names:', error);
                }
            }
            window.chatFileNameMap = fileNameMap;

            // Display conversations
            const conversations = data.conversations || [];
            conversations.forEach(conv => {
                if (conv.conversationMessage) {
                    addMessage('user', conv.conversationMessage, conv.conversationID, conv.chatSeq, conv.documentIDs || []);
                }
                if (conv.responseMessage) {
                    addMessage('ai', conv.responseMessage);
                }
            });

            ChatUtils.scrollToBottom();
        } catch (error) {
            console.error('Error loading chat thread:', error);

            // Clear invalid state
            const currentUrl = new URL(window.location);
            currentUrl.searchParams.delete('chatID');
            localStorage.removeItem('activeChatID');
            localStorage.removeItem('activeChatProjectID');
            window.history.replaceState({}, '', currentUrl.pathname);
            window.backToInitialScreen?.();
        }
    },

    /**
     * Back to initial screen
     */
    backToInitialScreen() {
        console.log('Returning to initial screen');

        this.currentChatID = null;
        window.currentChatID = null;

        localStorage.removeItem('activeChatID');
        localStorage.removeItem('activeChatProjectID');

        const currentUrl = new URL(window.location);
        if (currentUrl.searchParams.has('chatID')) {
            currentUrl.searchParams.delete('chatID');
            window.history.pushState({}, '', currentUrl);
        }

        localStorage.setItem('wentBackToInitial', 'true');

        ChatUtils.hideChatInterface();

        const mainScreenTitle = document.querySelector('.main-screen-title');
        if (mainScreenTitle) mainScreenTitle.style.display = 'flex';

        const mainScreen = document.querySelector('.main-screen');
        if (mainScreen) mainScreen.classList.remove('chat-mode');

        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) messagesContainer.innerHTML = '';

        ChatUtils.clearSelectedFiles();
        ChatUtils.clearInput();

        const chatTitle = document.getElementById('chat-title');
        if (chatTitle) chatTitle.textContent = 'New Chat';

        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.remove('selected');
            item.style.backgroundColor = 'transparent';
        });
    }
};

// ===== SUGGESTION CHIPS =====

/**
 * Predefined follow-up suggestions shown after AI responses.
 * A random subset is displayed each time.
 */
const SUGGESTION_PROMPTS = [
    'Summarize all the requirements',
    'List all user stories',
    'What are the non-functional requirements?',
    'Are there any missing requirements?',
    'Compare functional vs non-functional requirements',
    'What are the key roles identified?',
    'Suggest improvements for the user stories',
    'Generate a requirements report',
    'Generate a user stories report',
];

/**
 * Picks a random subset of suggestions (avoiding repeating the last set).
 */
let _lastSuggestionSet = [];
function pickSuggestions(count = 3) {
    // Filter out prompts used last time to keep it fresh
    let pool = SUGGESTION_PROMPTS.filter(s => !_lastSuggestionSet.includes(s));
    if (pool.length < count) pool = [...SUGGESTION_PROMPTS];

    const picked = [];
    const copy = [...pool];
    for (let i = 0; i < count && copy.length > 0; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        picked.push(copy.splice(idx, 1)[0]);
    }
    _lastSuggestionSet = picked;
    return picked;
}

/**
 * Removes any existing suggestion chips from the chat.
 */
function removeSuggestionChips() {
    document.querySelectorAll('.suggestion-chips-container').forEach(el => el.remove());
}

/**
 * Creates and appends suggestion chips after an AI message element.
 * @param {HTMLElement} parentContentWrapper - The content wrapper div of the AI message
 */
function appendSuggestionChips(parentContentWrapper) {
    if (!parentContentWrapper) return;

    const suggestions = pickSuggestions(3);

    const container = document.createElement('div');
    container.className = 'suggestion-chips-container';

    const label = document.createElement('span');
    label.className = 'suggestion-chips-label';
    label.textContent = 'Suggestion';
    container.appendChild(label);

    suggestions.forEach(text => {
        const chip = document.createElement('button');
        chip.className = 'suggestion-chip';
        chip.textContent = text;
        chip.onclick = () => {
            // Fill the input and submit immediately
            const input = document.getElementById('main-message-input');
            if (input) {
                input.value = text;
                input.style.height = 'auto';
                input.style.height = input.scrollHeight + 'px';
            }
            removeSuggestionChips();
            if (typeof window.submitConversationRequest === 'function') {
                window.submitConversationRequest();
            }
        };
        container.appendChild(chip);
    });

    parentContentWrapper.appendChild(container);
}

// ===== ADD MESSAGE FUNCTION =====

function addMessage(role, text, conversationID = null, chatSeq = null, attachedFileIDs = []) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageTimestamp = Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.id = `chat-message-${role}-${messageTimestamp}`;
    messageDiv.className = role === 'user' ? 'message user-message' : 'message ai-message';

    // Remove any previous suggestion chips when a new message arrives
    removeSuggestionChips();

    if (conversationID) messageDiv.dataset.conversationId = conversationID;
    if (chatSeq) messageDiv.dataset.chatSeq = chatSeq;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';

    if (role === 'user') {
        const avatarUrl = window.userAvatarUrl || './img/user.svg';
        avatar.innerHTML = `<img src="${avatarUrl}" alt="User" style="width: 80%; height: 80%; object-fit: cover; border-radius: 50%;">`;
    } else {
        avatar.innerHTML = `<img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">`;
    }

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    if (role === 'ai') {
        bubble.dataset.role = 'ai';
        ChatUtils.setBubbleContent(bubble, text, { allowMarkdown: true });
    } else {
        bubble.textContent = text;
    }

    // Build message structure
    if (role === 'user') {
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 8px; max-width: 600px;';

        contentWrapper.appendChild(bubble);

        // Timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.style.cssText = 'font-size: 12px; color: #999; padding-left: 12px;';
        const now = new Date();
        timestamp.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        contentWrapper.appendChild(timestamp);

        // Bottom row with files
        const bottomRow = document.createElement('div');
        bottomRow.className = 'message-bottom-row';
        bottomRow.style.cssText = 'display: flex; align-items: center; gap: 8px; padding-left: 12px; min-height: 24px;';

        if (attachedFileIDs?.length) {
            const filesContainer = document.createElement('div');
            filesContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; flex: 1;';

            attachedFileIDs.forEach(fileId => {
                let fileName = fileId;
                const chipElement = document.querySelector(`[data-file-id="${fileId}"]`);
                if (chipElement) {
                    fileName = chipElement.getAttribute('data-file-name') || chipElement.querySelector('span')?.textContent || fileId;
                } else {
                    const sourceElement = document.getElementById(`source-file-name-${fileId}`);
                    if (sourceElement) fileName = sourceElement.textContent;
                    else if (window.chatFileNameMap?.has(fileId)) fileName = window.chatFileNameMap.get(fileId);
                }

                const fileChip = document.createElement('div');
                fileChip.dataset.fileId = fileId;
                fileChip.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background-color: rgba(195, 171, 111, 0.15); border: 1px solid rgba(195, 171, 111, 0.3); border-radius: 12px; font-size: 11px; color: #666;';
                fileChip.innerHTML = `📎 ${fileName}`;
                filesContainer.appendChild(fileChip);
            });

            bottomRow.appendChild(filesContainer);
        }

        contentWrapper.appendChild(bottomRow);

        // Avatar wrapper with edit/cancel buttons
        const avatarWrapper = document.createElement('div');
        avatarWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 4px;';
        avatarWrapper.appendChild(avatar);

        const editBtn = document.createElement('button');
        editBtn.className = 'message-edit-btn';
        editBtn.innerHTML = 'Edit';
        editBtn.style.cssText = 'background: transparent; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; color: #999; opacity: 0; margin-top: 9px;';
        editBtn.onclick = () => conversationID && chatSeq ? EditMode.start(text, conversationID, chatSeq) : alert('Please wait for the message to finish sending.');
        avatarWrapper.appendChild(editBtn);

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'message-cancel-btn';
        cancelBtn.innerHTML = 'Cancel';
        cancelBtn.style.cssText = 'background: transparent; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; color: #e57373; display: none; margin-top: 8px;';
        cancelBtn.onclick = () => EditMode.cancel();
        avatarWrapper.appendChild(cancelBtn);

        messageDiv.appendChild(avatarWrapper);
        messageDiv.appendChild(contentWrapper);
    } else {
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
        contentWrapper.appendChild(bubble);

        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.style.cssText = 'font-size: 12px; color: #999; padding-left: 12px;';
        const now = new Date();
        timestamp.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        contentWrapper.appendChild(timestamp);

        // Add suggestion chips after AI message
        appendSuggestionChips(contentWrapper);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentWrapper);
    }

    messagesContainer.appendChild(messageDiv);
    ChatUtils.scrollToBottom();
}

// ===== PROJECT DATA FUNCTIONS =====

async function fetchProjectChats(projectID) {
    let chatHistoryContainer = document.getElementById("div-chat-history-list");

    if (!chatHistoryContainer) {
        await new Promise(resolve => setTimeout(resolve, 300));
        chatHistoryContainer = document.getElementById("div-chat-history-list");
        if (!chatHistoryContainer) return;
    }

    chatHistoryContainer.innerHTML = '';

    try {
        const data = await ChatService.fetchProjectChats(projectID);

        if (data.chats) {
            for (let chat of data.chats) {
                const chatHistoryElement = createChatHistoryItem(chat.threadName, chat.chatID);
                const wrapper = document.createElement('div');
                chatHistoryContainer.appendChild(wrapper);
                const root = ReactDOM.createRoot(wrapper);
                root.render(chatHistoryElement);
            }

            // Handle pending chat restoration
            if (window.pendingChatRestoration) {
                const chatIDToRestore = window.pendingChatRestoration;
                const savedProjectID = localStorage.getItem('activeChatProjectID');

                if (savedProjectID === projectID) {
                    const chatExists = data.chats.some(chat => chat.chatID === chatIDToRestore);
                    if (chatExists) {
                        window.pendingChatRestoration = null;
                        setTimeout(() => window.loadChatThread?.(chatIDToRestore), 100);
                    } else {
                        window.pendingChatRestoration = null;
                        localStorage.removeItem('activeChatID');
                        localStorage.removeItem('activeChatProjectID');
                    }
                } else {
                    window.pendingChatRestoration = null;
                    localStorage.removeItem('activeChatID');
                    localStorage.removeItem('activeChatProjectID');
                }
            }
        }

        const noChatHistoryLabel = document.getElementById("p-label-chat-history-no-entry");
        if (noChatHistoryLabel) {
            noChatHistoryLabel.style.display = data.chats?.length > 0 ? "none" : "block";
        }
    } catch (error) {
        console.error("Error fetching chats:", error);
    }
}

async function fetchProjectFiles(projectID) {
    const response = await fetch('/api/project/file/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectID })
    });

    if (response.ok) {
        const data = await response.json();
        const sourceContainer = document.getElementById("div-project-source-list");

        if (sourceContainer) {
            sourceContainer.innerHTML = '';

            if (data.files?.length) {
                for (let file of data.files) {
                    const ext = file.documentExt || '';
                    let cleanName = (file.documentName || '').replace(/\.+$/, '');
                    const fullFileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
                    const fileElement = createFileItem(fullFileName, file.documentID);

                    const wrapper = document.createElement('div');
                    sourceContainer.appendChild(wrapper);
                    const root = ReactDOM.createRoot(wrapper);
                    root.render(fileElement);
                }
            }
        }

        const noSourceLabel = document.getElementById("p-label-source-no-entry");
        if (noSourceLabel) {
            noSourceLabel.style.display = data.files?.length > 0 ? "none" : "block";
        }
    }
}

async function showUploadedFilesSelectionModal() {
    const projectID = window.getCurrentProjectID?.();
    if (!projectID) {
        await window.showNotification?.({
            type: 'warning',
            title: 'Warning',
            message: 'Please create a project before selecting files.',
            actionText: 'OK'
        });
        return;
    }

    try {
        const response = await fetch('/api/project/file/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectID })
        });

        const data = await response.json();

        if (!data.files?.length) {
            await window.showNotification?.({
                type: 'info',
                title: 'No Files',
                message: 'No files uploaded yet. Please upload files first.',
                actionText: 'OK'
            });
            return;
        }

        FileSelectionModal.show(data.files, projectID, (selectedFiles, selectedFilesMap) => {
            FileChipsManager.updateFromSelection(selectedFiles, selectedFilesMap);
        });
    } catch (error) {
        console.error('Error fetching files:', error);
        await window.showNotification?.({
            type: 'error',
            title: 'Error',
            message: 'Failed to fetch uploaded files.',
            actionText: 'OK'
        });
    }
}

function openRequirementsPanel() {
    const projectID = window.getCurrentProjectID?.();
    if (!projectID) {
        alert('Please select a project first');
        return;
    }
    window.dispatchEvent(new CustomEvent('openRequirementsPanel', { detail: { projectID } }));
}

// ===== GLOBAL EXPORTS =====
Object.assign(window, {
    ChatController,
    addMessage,
    fetchProjectChats,
    fetchProjectFiles,
    refreshProjectFiles: fetchProjectFiles,
    loadChatThread: ChatController.loadChatThread.bind(ChatController),
    backToInitialScreen: ChatController.backToInitialScreen.bind(ChatController),
    submitConversationRequest: ChatController.submitConversation.bind(ChatController),
    showUploadedFilesSelectionModal,
    openRequirementsPanel
});
