/**
 * ChatService - API calls for chat functionality
 */

const ChatService = {
    /**
     * Send a chat message and stream the response
     * @param {Object} data - Message data
     * @param {Function} onChunk - Callback for each chunk
     * @param {Function} onDone - Callback when done
     * @param {Function} onError - Callback on error
     * @returns {Promise<Object>} - Chat result with chatID, conversationID, chatSeq
     */
    async streamChat(data, { onChunk, onStage, onDone, onError, onChatID, onReportGenerated }) {
        console.log('=== STREAM CHAT REQUEST ===');
        console.log('Sending data:', JSON.stringify(data, null, 2));

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

                switch (jsonData.type) {
                    case 'chatID':
                        chatIDReceived = jsonData.chatID;
                        console.log('Chat ID:', chatIDReceived);
                        onChatID?.(chatIDReceived);
                        break;

                    case 'reportGenerated':
                        console.log('Report generated:', jsonData);
                        onReportGenerated?.(jsonData);
                        break;

                    case 'stage':
                        console.log(`Stage ${jsonData.stage}: ${jsonData.status}`, jsonData.message || '');
                        onStage?.(jsonData);
                        break;

                    case 'chunk':
                        const content = jsonData.content || '';
                        fullResponse += content;
                        onChunk?.(content, fullResponse);
                        break;

                    case 'done':
                        // console.log('Streaming complete');
                        if (jsonData.conversationID && jsonData.chatSeq) {
                            conversationIDReceived = jsonData.conversationID;
                            chatSeqReceived = jsonData.chatSeq;
                        }
                        onDone?.(jsonData);
                        break;

                    case 'error':
                        console.error('Stream error:', jsonData.message);
                        onError?.(jsonData.message);
                        throw new Error(jsonData.message || 'Stream failed');
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

                const lines = message.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        await processSSEEvent(line.substring(6));
                    }
                }
            }
        }

        // Process remaining buffer
        if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    await processSSEEvent(line.substring(6));
                }
            }
        }

        return {
            chatID: chatIDReceived,
            conversationID: conversationIDReceived,
            chatSeq: chatSeqReceived,
            fullResponse
        };
    },

    /**
     * Load a chat thread by ID
     * @param {string} chatID
     * @returns {Promise<Object>}
     */
    async loadThread(chatID) {
        const response = await fetch(`/api/agent/chat/thread/${chatID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': window.csrfToken
            },
        });

        if (!response.ok) {
            throw new Error(`Chat not found (status: ${response.status})`);
        }

        return response.json();
    },

    /**
     * Edit a conversation message
     * @param {Object} data
     * @returns {Promise<Object>}
     */
    async editConversation(data) {
        const response = await fetch('/api/agent/conversation-edit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': window.csrfToken
            },
            body: JSON.stringify(data)
        });

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Server returned non-JSON response: ${text}`);
        }

        return response.json();
    },

    /**
     * Delete a conversation
     * @param {string} projectID
     * @param {string} chatID
     * @param {string} conversationID
     * @returns {Promise<Object>}
     */
    async deleteConversation(projectID, chatID, conversationID) {
        const response = await fetch('/api/agent/conversation-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': window.csrfToken
            },
            body: JSON.stringify({ projectID, chatID, conversationID })
        })
    },

    /**
     * Delete a chat
     * @param {string} projectID
     * @param {string} chatID
     * @returns {Promise<Object>}
     */
    async deleteChat(projectID, chatID) {
        const response = await fetch('/api/agent/chat-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': window.csrfToken
            },
            body: JSON.stringify({ projectID, chatID })
        });

        return response.json();
    },

    /**
     * Fetch all chats for a project
     * @param {string} projectID
     * @returns {Promise<Object>}
     */
    async fetchProjectChats(projectID) {
        const response = await fetch('/api/agent/all-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': window.csrfToken
            },
            body: JSON.stringify({ projectID })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch chats: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Analyze documents
     * @param {Object} data
     * @returns {Promise<Object>}
     */
    async analyzeDocuments(data) {
        const response = await fetch('/api/agent/analyze-documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': window.csrfToken
            },
            body: JSON.stringify(data)
        });

        return response.json();
    },

    async fetchSuggestedActions(projectID, chatID) {
        const response = await fetch('/api/agent/chat/fetch-suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': window.csrfToken
            },
            body: JSON.stringify({ projectID, chatID})
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data = await response.json();
        return data.suggestedNextAction || [];
    }
};

// Export
Object.assign(window, { ChatService });
