/**
 * EditMode - Handles message editing functionality
 */

const EditMode = {
    // Current editing state
    _state: null,

    /**
     * Get current editing state
     * @returns {Object|null}
     */
    get state() {
        return this._state;
    },

    /**
     * Check if currently editing
     * @returns {boolean}
     */
    get isEditing() {
        return this._state !== null;
    },

    /**
     * Start editing a message
     * @param {string} text - Original message text
     * @param {string} conversationID
     * @param {number} chatSeq
     */
    start(text, conversationID, chatSeq) {

        console.log(`chatSeq is ${chatSeq}`)

        // Set input value
        const input = document.getElementById('main-message-input') || document.getElementById('message-input');
        if (input) {
            input.value = text;
            input.focus();
        }

        const inputBox = document.getElementById('input-field-form');
        inputBox.style.transition = "border 0.5s";
        inputBox.style.border = "3px solid #000000"

        const suggestionChipsContainer = document.getElementById('suggestion-chips');

        if (!suggestionChipsContainer.querySelector('.chip.cancel-edit')) {
            const button = document.createElement('button');
            button.className = 'chip cancel-edit';
            button.style.background = '#1E293B';
            button.style.color = '#FFFFFF';
            button.textContent = 'Cancel Edit';
            button.addEventListener('click', () => this.cancel());

            suggestionChipsContainer.prepend(button);
        }

        // Find attached file IDs from the message
        let attachedFileIDs = [];
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            const messageElements = messagesContainer.querySelectorAll('.message');
            messageElements.forEach(msg => {
                if (msg.dataset.conversationId === conversationID && parseInt(msg.dataset.chatSeq) === chatSeq) {
                    const fileChips = msg.querySelectorAll('[data-file-id]');
                    if (fileChips.length > 0) {
                        attachedFileIDs = Array.from(fileChips).map(chip => chip.dataset.fileId);
                    }
                }
            });
        }

        // Store state
        this._state = {
            conversationID,
            chatSeq,
            originalText: text,
            attachedFileIDs
        };

        // Also set on window for backward compatibility
        window.editingMessage = this._state;

        // Show cancel button on the message
        this._showCancelButton(conversationID, chatSeq);

        // Restore file chips if any
        if (attachedFileIDs.length > 0) {
            this._restoreFileChips(attachedFileIDs);
        }

        // Update UI
        this._showEditIndicator();
        this._updateSendButton(true);
        this._updateCancelButton();

        console.log('Editing message:', { conversationID, chatSeq, attachedFileIDs });
    },

    /**
     * Cancel editing
     */
    cancel() {
        this._state = null;
        window.editingMessage = null;

        // Reset send button
        this._updateSendButton(false);

        // Remove edit indicator
        const indicator = document.getElementById('edit-mode-indicator');
        if (indicator) indicator.remove();

        // Hide cancel buttons and restore edit buttons
        this._hideCancelButtons();

        // Clear input
        ChatUtils.clearInput();

        // Clear selected files
        ChatUtils.clearSelectedFiles();

        const inputBox = document.getElementById('input-field-form');
        inputBox.style.transition = "border 0.5s";
        inputBox.style.border = ""

        const cancelBtn = document.querySelector('.chip.cancel-edit');
        if (cancelBtn) cancelBtn.remove();

    },

    /**
     * Show edit mode indicator in chat title
     */
    _showEditIndicator() {
        // Remove existing
        const existing = document.getElementById('edit-mode-indicator');
        if (existing) existing.remove();

        const chatTitle = document.getElementById('chat-title');
        if (!chatTitle) return;

        // Add ripple animation style
        if (!document.getElementById('edit-ripple-style')) {
            const style = document.createElement('style');
            style.id = 'edit-ripple-style';
            style.textContent = `
                @keyframes ripple {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.3); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        const indicator = document.createElement('span');
        indicator.id = 'edit-mode-indicator';
        indicator.style.cssText = `
            margin-left: 12px;
            margin-right: 12px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            vertical-align: middle;
        `;

        indicator.innerHTML = `
            <span style="width: 8px; height: 8px; background-color: #ff9800; border-radius: 50%; animation: ripple 1.5s ease-in-out infinite;"></span>
            <span style="font-family: 'Inter', Helvetica; font-size: 13px; color: #999;">On Edit</span>
        `;

        chatTitle.appendChild(indicator);
    },

    /**
     * Update send button appearance
     * @param {boolean} editing
     */
    _updateSendButton(editing) {
        const sendBtn = document.querySelector('.btn-send') || document.getElementById('btn-send-message');
        if (sendBtn) {
            sendBtn.style.backgroundColor = editing ? '#ff9800' : '';
            sendBtn.title = editing ? 'Send edited message' : 'Send message';
        }
    },

    /**
     * Show cancel button on the message being edited
     */
    _showCancelButton(conversationID, chatSeq) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        // First, reset ALL messages
        messagesContainer.querySelectorAll('.message').forEach(msg => {
            const editingLabel = msg.querySelector(".message-edit-indicator");
            if (editingLabel) editingLabel.style.display = 'none';

            const editButton = msg.querySelector(".message-edit-btn");
            if (editButton) editButton.style.display = "flex";

            const messageBubble = msg.querySelector('.message-bubble.user-bubble');
            if (messageBubble) {
                messageBubble.style.transition = "border 0.5s";
                messageBubble.style.border = null
            }
        });

        // Then apply editing state to the specific message
        messagesContainer.querySelectorAll('.message').forEach(msg => {
            if (msg.dataset.conversationId === conversationID && parseInt(msg.dataset.chatSeq) === chatSeq) {
            const editingLabel = msg.querySelector(".message-edit-indicator");
            if (editingLabel) editingLabel.style.display = 'inline-flex';

                const editButton = msg.querySelector(".message-edit-btn");
                if (editButton) editButton.style.display = "none";

                const messageBubble = msg.querySelector('.message-bubble.user-bubble');
                if (messageBubble) {
                    messageBubble.style.transition = "border 0.5s";
                    messageBubble.style.border = "3px solid #000"
                }

            }
        });
    },

    /**
     * Hide cancel buttons on all messages
     */
    _hideCancelButtons() {
        document.querySelectorAll('.message-cancel-btn').forEach(btn => {
            btn.style.display = 'none';
            const editBtn = btn.parentNode?.querySelector('.message-edit-btn');
            if (editBtn) editBtn.style.display = '';
        });

        document.querySelectorAll(".message-edit-indicator").forEach(indicator => {
            indicator.style.display = 'none'
        });
        document.querySelectorAll(".message-edit-btn").forEach(btn => {
            btn.style.display = 'flex'
        });

        document.querySelectorAll('.message-bubble.user-bubble').forEach(bubble => {
            bubble.style.transition = "border 0.5s";
            bubble.style.border = null
        });

    },

    /**
     * Restore file chips for the message being edited
     */
    async _restoreFileChips(fileIDs) {
        if (!fileIDs?.length) return;

        const projectID = window.getCurrentProjectID?.();
        if (!projectID) return;

        try {
            const response = await fetch('/api/project/file/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectID })
            });

            const data = await response.json();
            if (!data.files) return;

            // Create or get chips container
            let wrapper = document.getElementById('selected-files-wrapper');
            let container = document.getElementById('selected-files-container');

            if (!container) {
                wrapper = document.createElement('div');
                wrapper.id = 'selected-files-wrapper';
                wrapper.style.cssText = `
                    margin: 0 auto;
                    width: 90%;
                    max-width: 650px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;

                container = document.createElement('div');
                container.id = 'selected-files-container';
                container.style.cssText = `
                    flex: 1;
                    display: flex;
                    flex-wrap: nowrap;
                    gap: 8px;
                    padding: 10px 15px;
                    border-radius: 16px 16px 0 0;
                    align-items: center;
                    overflow-x: auto;
                    white-space: nowrap;
                `;

                wrapper.appendChild(container);

                const inputForm = document.querySelector('.input-field');
                if (inputForm?.parentNode) {
                    inputForm.parentNode.insertBefore(wrapper, inputForm);
                }
            }

            container.innerHTML = '';

            // Add chips
            fileIDs.forEach(fileId => {
                const fileData = data.files.find(f => f.documentID === fileId);
                if (fileData) {
                    const ext = fileData.documentExt || '';
                    let cleanName = (fileData.documentName || '').replace(/\.+$/, '');
                    const fileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;

                    const chip = document.createElement('div');
                    chip.setAttribute('data-file-id', fileId);
                    chip.setAttribute('data-file-name', fileName);
                    chip.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 6px 12px;
                        background-color: #fff;
                        border: 1px solid #e4e4e4;
                        border-radius: 20px;
                        font-family: 'Inter', Helvetica;
                        font-size: 13px;
                        color: #000;
                    `;

                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = fileName;
                    nameSpan.style.cssText = 'max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

                    const removeBtn = document.createElement('button');
                    removeBtn.textContent = '×';
                    removeBtn.style.cssText = 'border: none; background: transparent; font-size: 18px; color: #666; cursor: pointer; padding: 0; width: 20px; height: 20px;';
                    removeBtn.onclick = () => {
                        chip.remove();
                        if (!container.children.length) container.remove();
                    };

                    chip.appendChild(nameSpan);
                    chip.appendChild(removeBtn);
                    container.appendChild(chip);
                }
            });

            this._updateCancelButton();
        } catch (error) {
            console.error('Error restoring file chips:', error);
        }
    },

    /**
     * Add cancel edit button to file wrapper
     */
    _updateCancelButton() {
        if (!this.isEditing) return;

        const wrapper = document.getElementById('selected-files-wrapper');
        if (!wrapper) return;

        // Remove existing
        const existing = wrapper.querySelector('.cancel-edit-btn');
        if (existing) existing.remove();

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-edit-btn';
        cancelBtn.textContent = 'Cancel Edit';
        cancelBtn.style.cssText = `
            padding: 6px 12px;
            background: transparent;
            border: none;
            font-family: 'Inter', Helvetica;
            font-size: 13px;
            color: #666;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;
        `;
        cancelBtn.onclick = () => this.cancel();

        wrapper.appendChild(cancelBtn);
    },

    /**
     * Remove messages from a specific sequence onwards
     * @param {number} chatSeq
     */
    removeMessagesFromSeq(chatSeq) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        let shouldRemove = false;
        container.querySelectorAll('.message').forEach(message => {
            if (parseInt(message.dataset.chatSeq) >= chatSeq) {
                shouldRemove = true;
            }
            if (shouldRemove) {
                message.remove();
            }
        });
    }
};

// Export
Object.assign(window, {
    EditMode,
    // Backward compatibility
    handleEditMessage: EditMode.start.bind(EditMode),
    cancelEditMode: EditMode.cancel.bind(EditMode),
    removeMessagesFromSeq: EditMode.removeMessagesFromSeq.bind(EditMode)
});
