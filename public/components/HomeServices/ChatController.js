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
        // Check for project first, before checking message
        const projectDropdown = document.getElementById("select-project-drop-down");
        // get the project ID
        const projectID = projectDropdown?.value;
        
        if (!projectID) {
            console.error("No project selected");
            
            // Show warning notification if no project is selected
            if (typeof window.showNotification === 'function') {
                window.showNotification({
                    type: 'warning',
                    title: 'No Project Selected',
                    message: 'Please create or select a project before starting a chat.',
                    actionText: 'OK'
                });
            } else {
                alert('Please create or select a project before starting a chat.');
            }
            
            return;
        }

        // Then check if there's a message
        const input = document.getElementById("main-message-input");
        const userMessage = input?.value?.trim();
        if (!userMessage) return;

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

        // get the selected source
        const selectedSource = ChatUtils.getSelectedSource();
        // get the chip file IDs
        const chipFileIDs = ChatUtils.getChipFileIDs();
        // merge the attached documents
        const allAttachedDocuments = ChatUtils.mergeAttachedDocuments(selectedSource, chipFileIDs);

        // clear the input
        ChatUtils.clearInput();
        // clear the selected files
        ChatUtils.clearSelectedFiles();
        // remove the messages from the sequence
        EditMode.removeMessagesFromSeq(chatSeq);
        // add the user message
        // show the loading indicator
        addMessage('user', userMessage, conversationID, chatSeq, allAttachedDocuments);

        ChatUtils.showLoadingIndicator();
        // try to stream the edit response
        try {
            await this._streamEditResponse({
                projectID,
                chatID: this.currentChatID,
                chatSeq,
                conversationID,
                message: userMessage,
                attachedDocumentIDs: allAttachedDocuments
            });
        } catch (error) {
            ChatUtils.removeLoadingIndicator();
            addMessage('ai', 'Sorry, there was an error editing your message.');
            console.error('Error editing message:', error);
        } finally {
            EditMode.cancel();
        }
    },

    /**
     * Stream edit response from server (mirrors _streamChatResponse)
     */
    async _streamEditResponse(data) {
        const response = await fetch('/api/agent/conversation-edit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify(data)
        });
        // if the response is not ok, throw an error
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // get the messages container
        const messagesContainer = document.getElementById('chat-messages');
        // remove the suggestion chips
        removeSuggestionChips();

        // Prepare AI message (hidden until first chunk)
        const messageTimestamp = Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = `chat-message-ai-edit-${messageTimestamp}`;
        messageDiv.className = 'message ai-message';
        messageDiv.style.display = 'none';

        // build the avatar element
        const avatar = document.createElement('div');
        avatar.id = `message-avatar-ai-edit-${messageTimestamp}`;
        avatar.className = 'message-avatar';
        avatar.innerHTML = `<img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">`;

        // build the bubble element
        const bubble = document.createElement('div');
        bubble.id = `message-bubble-ai-edit-${messageTimestamp}`;
        bubble.className = 'message-bubble';
        bubble.dataset.role = 'ai';

        // build the stream content wrapper element
        const streamContentWrapper = document.createElement('div');
        streamContentWrapper.id = `message-content-wrapper-ai-edit-${messageTimestamp}`;
        streamContentWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1; max-width: 600px;';
        streamContentWrapper.appendChild(bubble);

        // add the avatar and stream content wrapper to the message div
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(streamContentWrapper);
        messagesContainer.appendChild(messageDiv);

        // initialize the full response and buffer
        let fullResponse = '';
        let buffer = '';

        // get the reader and decoder
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // process the SSE event
        const processSSEEvent = async (eventData) => {
            if (!eventData?.trim()) return;
            try {
                const jsonData = JSON.parse(eventData);

                if (jsonData.type === 'chunk') {
                    // console.log('[Edit] Received chunk:', jsonData.content?.substring(0, 50));
                    ChatUtils.removeLoadingIndicator();
                    messageDiv.style.display = '';
                    // add the content to the full response
                    fullResponse += jsonData.content || '';
                    ChatUtils.setBubbleContent(bubble, fullResponse, { allowMarkdown: true });
                    ChatUtils.scrollToBottom();
                } else if (jsonData.type === 'done') {
                    ChatUtils.removeLoadingIndicator();
                    messageDiv.style.display = '';

                    // Add timestamp
                    const tsDiv = document.createElement('div');
                    tsDiv.id = `message-timestamp-ai-edit-${messageTimestamp}`;
                    tsDiv.className = 'message-timestamp';
                    tsDiv.style.cssText = 'font-size: 12px; color: #999; padding-left: 12px;';
                    const tsNow = new Date();
                    tsDiv.textContent = `${tsNow.getHours().toString().padStart(2, '0')}:${tsNow.getMinutes().toString().padStart(2, '0')}`;
                    streamContentWrapper.appendChild(tsDiv);
                    // add the suggestion chips
                    appendSuggestionChips(streamContentWrapper);
                    ChatUtils.scrollToBottom();
                } else if (jsonData.type === 'error') {
                    ChatUtils.removeLoadingIndicator();
                    messageDiv.style.display = '';
                    ChatUtils.setBubbleContent(bubble, `Error: ${jsonData.message}`, { allowMarkdown: false });
                    bubble.style.color = '#f44336';
                    
                } else if (jsonData.type === 'stage') {
                    // if the stage is 2 and the status is complete and the refresh requirements flag is true, dispatch the requirements updated event
                    if (jsonData.stage === 2 && jsonData.status === 'complete' && jsonData.refreshRequirements) {
                        // dispatch the requirements updated event
                        window.dispatchEvent(new CustomEvent('requirementsUpdated', { detail: { projectID: jsonData.projectID || data.projectID } }));
                        // fetch the project requirements and user stories
                        window.fetchProjectRequirements?.(jsonData.projectID || data.projectID);
                        window.fetchProjectUserStories?.(jsonData.projectID || data.projectID);
                    }
                }
            } catch (e) {
                console.error('Error parsing SSE event:', e.message);
            }
        };

        // read the stream
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
        // process the remaining buffer
        if (buffer.trim()) {
            for (const line of buffer.split('\n')) {
                if (line.startsWith('data: ')) {
                    await processSSEEvent(line.substring(6));
                }
            }
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

        ChatUtils.showLoadingIndicator();

        try {
            const result = await this._streamChatResponse(data);
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
            ChatUtils.removeLoadingIndicator();
            addMessage('ai', `Sorry, there was an error processing your request: ${error.message || 'Unknown error'}`);
        }
    },

    /**
     * Stream chat response from server
     */
    async _streamChatResponse(data) {
        // console.log('=== STREAM CHAT RESPONSE ===');

        const response = await fetch('/api/agent/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify(data)
        });
        // if the response is not ok, throw an error
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // get the messages container
        const messagesContainer = document.getElementById('chat-messages');

        // Remove any previous suggestion chips
        removeSuggestionChips();

        // Prepare the actual AI message (hidden until first chunk arrives)
        const messageTimestamp = Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.id = `chat-message-ai-stream-${messageTimestamp}`;
        messageDiv.className = 'message ai-message';
        messageDiv.style.display = 'none';

        // build the avatar element
        const avatar = document.createElement('div');
        avatar.id = `message-avatar-ai-stream-${messageTimestamp}`;
        avatar.className = 'message-avatar';
        avatar.innerHTML = `<img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">`;

        // build the bubble element
        const bubble = document.createElement('div');
        bubble.id = `message-bubble-ai-stream-${messageTimestamp}`;
        bubble.className = 'message-bubble';
        bubble.dataset.role = 'ai';

        // build the stream content wrapper element
        const streamContentWrapper = document.createElement('div');
        streamContentWrapper.id = `message-content-wrapper-ai-stream-${messageTimestamp}`;
        streamContentWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1; max-width: 600px;';
        streamContentWrapper.appendChild(bubble);

        // add the avatar and stream content wrapper to the message div
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(streamContentWrapper);
        messagesContainer.appendChild(messageDiv);

        // initialize the full response, chat ID received, conversation ID received, chat sequence received, and buffer
        let fullResponse = '';
        let chatIDReceived = null;
        let conversationIDReceived = null;
        let chatSeqReceived = null;
        let buffer = '';

        // get the reader and decoder
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // process the SSE event
        const processSSEEvent = async (eventData) => {
            if (!eventData?.trim()) return;

            try {
                const jsonData = JSON.parse(eventData);

                if (jsonData.type === 'chatID') {
                    chatIDReceived = jsonData.chatID;
                    // if the chat ID is empty, fetch the project chats
                    if (data.chatID === '') {
                        await fetchProjectChats(data.projectID);
                    }
                } else if (jsonData.type === 'reportGenerated') {
                    // wait for 500ms
                    await new Promise(resolve => setTimeout(resolve, 500));
                    // fetch the project reports and dispatch the report generated event
                    await window.fetchProjectReports?.(jsonData.projectID || data.projectID);
                    window.dispatchEvent(new CustomEvent('reportGenerated', {
                        detail: { projectID: jsonData.projectID || data.projectID, reportType: jsonData.reportType }
                    }));    
                    // fetch the project reports and dispatch the report generated event
                } else if (jsonData.type === 'stage') {
                    // if the stage is 2 and the status is complete and the refresh requirements flag is true, dispatch the requirements updated event
                    if (jsonData.stage === 2 && jsonData.status === 'complete' && jsonData.refreshRequirements) {
                        // dispatch the requirements updated event
                        window.dispatchEvent(new CustomEvent('requirementsUpdated', {
                            detail: { projectID: jsonData.projectID || data.projectID }
                        }));
                        // fetch the project requirements and user stories
                        window.fetchProjectRequirements?.(jsonData.projectID || data.projectID);
                        window.fetchProjectUserStories?.(jsonData.projectID || data.projectID);
                    }
                } else if (jsonData.type === 'chunk') {
                    // Remove the loading indicator and show the real message on first chunk
                    ChatUtils.removeLoadingIndicator();
                    messageDiv.style.display = '';
                    // add the content to the full response
                    fullResponse += jsonData.content || '';
                    // set the bubble content
                    ChatUtils.setBubbleContent(bubble, fullResponse, { allowMarkdown: true });
                    // scroll to bottom
                    ChatUtils.scrollToBottom();
                } else if (jsonData.type === 'done') {
                    // Ensure loading indicator is removed and message is visible
                    ChatUtils.removeLoadingIndicator();
                    messageDiv.style.display = '';
                    // if the conversation ID and chat sequence are received, set the conversation ID and chat sequence
                    if (jsonData.conversationID && jsonData.chatSeq) {
                        conversationIDReceived = jsonData.conversationID;
                        chatSeqReceived = jsonData.chatSeq;
                    }

                    // get the thread name
                    const threadName = jsonData.threadName || 'New Chat';
                    // try to get the chat title element and set the text content
                    const chatTitleElement = document.getElementById('chat-title');
                    if (chatTitleElement && threadName !== 'New Chat') {
                        chatTitleElement.textContent = threadName;
                    }

                    if (chatIDReceived) {
                        if (data.chatID === '') {
                            // if the chat ID is empty, fetch the project chats
                            await fetchProjectChats(data.projectID);
                        }

                        // try to get the chat item by the chat ID
                        const chatItem = document.querySelector(`.chat-history-item[data-chat-id="${chatIDReceived}"]`);
                        if (chatItem) {
                            // deselect all chat items and set the background color to transparent
                            document.querySelectorAll('.chat-history-item').forEach(item => {
                                item.classList.remove('selected');
                                item.style.backgroundColor = 'transparent';
                            });
                            // select the chat item and set the background color to #e0e0e0
                            chatItem.classList.add('selected');
                            chatItem.style.backgroundColor = '#e0e0e0';
                            // set the thread name data attribute
                            chatItem.dataset.threadName = threadName;
                            // try to get the name element and set the text content
                            const nameElement = chatItem.querySelector('.chat-item-name, span:first-child, span');
                            if (nameElement && threadName !== 'New Chat') {
                                nameElement.textContent = threadName;
                            }
                        }
                    }

                    // if the fetch project reports function is defined, call it
                    if (typeof window.fetchProjectReports === 'function') {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        await window.fetchProjectReports(data.projectID);
                    }

                    // Add timestamp to the streamed message
                    const tsDiv = document.createElement('div');
                    tsDiv.id = `message-timestamp-ai-stream-${messageTimestamp}`;
                    tsDiv.className = 'message-timestamp';
                    tsDiv.style.cssText = 'font-size: 12px; color: #999; padding-left: 12px;';
                    const tsNow = new Date();
                    tsDiv.textContent = `${tsNow.getHours().toString().padStart(2, '0')}:${tsNow.getMinutes().toString().padStart(2, '0')}`;
                    streamContentWrapper.appendChild(tsDiv);

                    // Add suggestion chips after streaming completes
                    appendSuggestionChips(streamContentWrapper);
                    ChatUtils.scrollToBottom();
                } else if (jsonData.type === 'error') {
                    ChatUtils.removeLoadingIndicator();
                    messageDiv.style.display = '';

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
    'Summarize all requirements',
    'List all user stories',
    'What are the non-functional requirements?',
    'Are there any missing requirements?',
    'Compare functional vs non-functional requirements',
    'What are the key roles identified?',
    'Suggest improvements for the user stories',
    'Generate a requirements report',
    'Generate a user stories report',
    'What are the main objectives?',
    'Identify potential risks',
    'Show dependencies between requirements',
    'What are the priority requirements?',
    'Suggest system architecture',
];

/**
 * Picks a random subset of suggestions (avoiding repeating the last set).
 */
let _lastSuggestionSet = [];
function pickSuggestions(count = 3) {
    // Filter out prompts used last time to keep it fresh
    let pool = SUGGESTION_PROMPTS.filter(s => !_lastSuggestionSet.includes(s));
    if (pool.length < count) pool = [...SUGGESTION_PROMPTS];

    // pick the suggestions
    const picked = [];
    const copy = [...pool];
    for (let i = 0; i < count && copy.length > 0; i++) {
        const idx = Math.floor(Math.random() * copy.length);
        picked.push(copy.splice(idx, 1)[0]);
    }
    // set the last suggestion set
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

    // pick 3 random suggestions
    const suggestions = pickSuggestions(3);

    // build the suggestion chips container
    const container = document.createElement('div');
    container.id = 'suggestion-chips-container';
    container.className = 'suggestion-chips-container';

    // build the suggestion chips label
    const label = document.createElement('div');
    label.id = 'suggestion-chips-label';
    label.className = 'suggestion-chips-label';
    label.innerHTML = 'Suggestions';
    container.appendChild(label);

    // Create chips wrapper for list layout
    const chipsWrapper = document.createElement('div');
    chipsWrapper.className = 'suggestion-chips-wrapper';

    // iterate over the suggestions
    suggestions.forEach((text, index) => {
        // build the suggestion chip as a list item
        const chip = document.createElement('button');
        chip.id = `suggestion-chip-${index}`;
        chip.className = 'suggestion-chip';
        chip.textContent = text;
        
        chip.onclick = () => {
            
            setTimeout(() => {
                // Fill the input and submit immediately
                const input = document.getElementById('main-message-input');
                if (input) {
                    // set the input value
                    input.value = text;
                    // set the input height
                    input.style.height = 'auto';
                    // set the input height to the scroll height
                    input.style.height = input.scrollHeight + 'px';
                }
                // remove the suggestion chips with fade out
                container.style.opacity = '0';
                container.style.transform = 'translateY(-5px)';
                setTimeout(() => removeSuggestionChips(), 200);
                // if the submit conversation request function is defined, call it
                if (typeof window.submitConversationRequest === 'function') window.submitConversationRequest();
            }, 100);
        };
        // add the suggestion chip to the wrapper
        chipsWrapper.appendChild(chip);
    });

    // add the chips wrapper to container
    container.appendChild(chipsWrapper);

    // add the suggestion chips container to the parent content wrapper
    parentContentWrapper.appendChild(container);
    
    // Trigger animation by setting opacity and transform to visible state
    // Use requestAnimationFrame to ensure the browser registers the initial state first
    requestAnimationFrame(() => {
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    });
}

// ===== ADD MESSAGE FUNCTION =====


/**
 * Adds a message to the chat messages container.
 * @param {string} role - The role of the message (user or ai)
 * @param {string} text - The text of the message
 * @param {string} conversationID - The conversation ID
 * @param {string} chatSeq - The chat sequence
 * @param {array} attachedFileIDs - The attached file IDs
 */
function addMessage(role, text, conversationID = null, chatSeq = null, attachedFileIDs = []) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageTimestamp = Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.id = `chat-message-${role}-${messageTimestamp}`;
    messageDiv.className = role === 'user' ? 'message user-message' : 'message ai-message';

    // Remove any previous suggestion chips when a new message arrives
    removeSuggestionChips();

    // set the conversation ID and chat sequence data attributes
    if (conversationID) messageDiv.dataset.conversationId = conversationID;
    if (chatSeq) messageDiv.dataset.chatSeq = chatSeq;

    // build the avatar element
    const avatar = document.createElement('div');
    avatar.id = `message-avatar-${role}-${messageTimestamp}`;
    avatar.className = 'message-avatar';

    // if the role is user, set the avatar image
    if (role === 'user') {
        // set the avatar image
        const avatarUrl = window.userAvatarUrl || './img/user.svg';
        avatar.innerHTML = `<img src="${avatarUrl}" alt="User" style="width: 80%; height: 80%; object-fit: cover; border-radius: 50%;">`;
    } else {
        // set the AI avatar image
        avatar.innerHTML = `<img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">`;
    }

    // build the bubble element
    const bubble = document.createElement('div');
    bubble.id = `message-bubble-${role}-${messageTimestamp}`;
    bubble.className = 'message-bubble';

    // if the role is AI, set the bubble content
    if (role === 'ai') {
        bubble.dataset.role = 'ai';
        // set the bubble content
        ChatUtils.setBubbleContent(bubble, text, { allowMarkdown: true });
    } else {
        // set the bubble text content
        bubble.textContent = text;
    }

    // Build message structure
    if (role === 'user') {
        // build the content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.id = `message-content-wrapper-user-${messageTimestamp}`;
        contentWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 8px; max-width: 600px;';

        // add the bubble to the content wrapper
        contentWrapper.appendChild(bubble);

        // build the timestamp element
        const timestamp = document.createElement('div');
        timestamp.id = `message-timestamp-user-${messageTimestamp}`;
        timestamp.className = 'message-timestamp';
        timestamp.style.cssText = 'font-size: 12px; color: #999; padding-left: 12px;';
        const now = new Date();
        timestamp.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        contentWrapper.appendChild(timestamp);

        // Bottom row with files
        const bottomRow = document.createElement('div');
        bottomRow.id = `message-bottom-row-${messageTimestamp}`;
        bottomRow.className = 'message-bottom-row';
        bottomRow.style.cssText = 'display: flex; align-items: center; gap: 8px; padding-left: 12px; min-height: 24px;';

        // if there are attached file IDs
        if (attachedFileIDs?.length) {
            // build the files container
            const filesContainer = document.createElement('div');
            filesContainer.id = `message-files-container-${messageTimestamp}`;
            filesContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; flex: 1;';

            // iterate over the attached file IDs
            attachedFileIDs.forEach(fileId => {
                let fileName = fileId;
                const chipElement = document.querySelector(`[data-file-id="${fileId}"]`);
                if (chipElement) {
                    // try to get the file name from the chip element
                    fileName = chipElement.getAttribute('data-file-name') || chipElement.querySelector('span')?.textContent || fileId;
                } else {
                    // try to get the file name from the source element
                    const sourceElement = document.getElementById(`source-file-name-${fileId}`);
                    if (sourceElement) fileName = sourceElement.textContent;
                    else if (window.chatFileNameMap?.has(fileId)) fileName = window.chatFileNameMap.get(fileId);
                }

                // build the file chip
                const fileChip = document.createElement('div');
                fileChip.dataset.fileId = fileId;
                fileChip.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background-color: rgba(195, 171, 111, 0.15); border: 1px solid rgba(195, 171, 111, 0.3); border-radius: 12px; font-size: 11px; color: #666;';
                fileChip.innerHTML = `📎 ${fileName}`;
                filesContainer.appendChild(fileChip);
            });

            // add the files container to the bottom row
            bottomRow.appendChild(filesContainer);
        }

        // add the bottom row to the content wrapper
        contentWrapper.appendChild(bottomRow);

        // Avatar wrapper with edit/cancel buttons
        const avatarWrapper = document.createElement('div');
        avatarWrapper.id = `message-avatar-wrapper-${messageTimestamp}`;
        avatarWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 4px;';
        avatarWrapper.appendChild(avatar);

        // build the edit button
        const editBtn = document.createElement('button');
        editBtn.id = `message-edit-btn-${messageTimestamp}`;
        editBtn.className = 'message-edit-btn';
        editBtn.innerHTML = 'Edit';
        editBtn.style.cssText = 'background: transparent; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; color: #999; opacity: 0; margin-top: 9px;';
        editBtn.onclick = () => conversationID && chatSeq ? EditMode.start(text, conversationID, chatSeq) : alert('Please wait for the message to finish sending.');
        avatarWrapper.appendChild(editBtn);

        // build the cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.id = `message-cancel-btn-${messageTimestamp}`;
        cancelBtn.className = 'message-cancel-btn';
        cancelBtn.innerHTML = 'Cancel';
        cancelBtn.style.cssText = 'background: transparent; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; color: #e57373; display: none; margin-top: 8px;';
        cancelBtn.onclick = () => EditMode.cancel();
        avatarWrapper.appendChild(cancelBtn);

        // add the avatar wrapper and content wrapper to the message div
        messageDiv.appendChild(avatarWrapper);
        messageDiv.appendChild(contentWrapper);
    } else {
        // build the AI message structure
        const contentWrapper = document.createElement('div');
        contentWrapper.id = `message-content-wrapper-ai-${messageTimestamp}`;
        contentWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1; max-width: 600px;';
        contentWrapper.appendChild(bubble);

        // build the timestamp element
        const timestamp = document.createElement('div');
        timestamp.id = `message-timestamp-ai-${messageTimestamp}`;
        timestamp.className = 'message-timestamp';
        timestamp.style.cssText = 'font-size: 12px; color: #999; padding-left: 12px;';
        const now = new Date();
        timestamp.textContent = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        contentWrapper.appendChild(timestamp);

        // add suggestion chips after the AI message
        appendSuggestionChips(contentWrapper);

        // add the avatar and content wrapper to the message div
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentWrapper);
    }

    messagesContainer.appendChild(messageDiv);
    ChatUtils.scrollToBottom();
}

// ===== PROJECT DATA FUNCTIONS =====

async function fetchProjectChats(projectID) {
    let chatHistoryContainer = document.getElementById("div-chat-history-list");

    // wait for the chat history container to be found
    if (!chatHistoryContainer) {
        await new Promise(resolve => setTimeout(resolve, 300));
        chatHistoryContainer = document.getElementById("div-chat-history-list");
        if (!chatHistoryContainer) return;
    }

    chatHistoryContainer.innerHTML = '';

    try {
        const data = await ChatService.fetchProjectChats(projectID);

        // add chat history items to the chat history container
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

        // Show quick prompts if on initial screen (chat interface hidden)
        const quickPromptsContainer = document.getElementById('quick-prompts-container');
        const chatInterface = document.getElementById('chat-interface');
        if (quickPromptsContainer && chatInterface) {
            // Show quick prompts only if chat interface is hidden (on initial screen)
            if (chatInterface.style.display === 'none') {
                quickPromptsContainer.style.display = 'flex';
            }
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

// ===== UPLOADED FILES SELECTION MODAL FUNCTIONS =====
async function showUploadedFilesSelectionModal() {
    // get the current project ID
    const projectID = window.getCurrentProjectID?.();
    // if the project ID is not found, show a notification
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

// ===== OPEN REQUIREMENTS PANEL FUNCTION =====
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
