/**
 * EditMode - Handles message editing functionality
 */

function truncateFileNameWithExtension(name, maxBaseChars = 28) {
    const lastDot = name.lastIndexOf('.');
    if (lastDot <= 0) return { base: name, ext: '' };
    const base = name.slice(0, lastDot);
    const ext = name.slice(lastDot);
    if (base.length <= maxBaseChars) return { base, ext };
    return { base: base.slice(0, maxBaseChars) + '...', ext };
}

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
        console.log(`chatSeq is ${chatSeq}`);

        // Find attached file IDs from the message first (before DOM changes)
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
        window.editingMessage = this._state;

        // Set input value and focus (P0: Focus management)
        const input = document.getElementById('main-message-input') || document.getElementById('message-input');
        if (input) {
            input.value = text;
            input.focus();
            input.setAttribute('aria-label', 'Editing message. Press Escape to cancel.');
        }

        const inputBox = document.getElementById('input-field-form');
        if (inputBox) inputBox.classList.add('edit-mode-active');

        const suggestionChipsContainer = document.getElementById('suggestion-chips');
        if (!suggestionChipsContainer.querySelector('.chip.cancel-edit')) {
            const button = document.createElement('button');
            button.className = 'chip cancel-edit';
            button.setAttribute('aria-label', 'Cancel editing');
            button.textContent = 'Cancel Edit';
            button.addEventListener('click', () => this.cancel());
            suggestionChipsContainer.prepend(button);
        }

        // P0: Escape key to cancel
        this._escapeHandler = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.cancel();
            }
        };
        document.addEventListener('keydown', this._escapeHandler);

        // P0: ARIA live announcement
        this._announceToScreenReader(`Editing message ${chatSeq}. Modify and press Send, or Escape to cancel.`);

        // P1: Scroll to keep edited message visible
        this._scrollToEditedMessage(conversationID, chatSeq);

        // Show cancel button on the message
        this._showCancelButton(conversationID, chatSeq);

        // Restore file chips if any
        if (attachedFileIDs.length > 0) {
            this._restoreFileChips(attachedFileIDs);
        }

        // Update UI
        this._showEditIndicator();
        this._showInputEditLabel();
        this._updateSendButton(true);
        this._updateCancelButton();

        console.log('Editing message:', { conversationID, chatSeq, attachedFileIDs });
    },

    /**
     * Cancel editing
     */
    cancel() {
        // P0: Remove Escape listener before clearing state
        if (this._escapeHandler) {
            document.removeEventListener('keydown', this._escapeHandler);
            this._escapeHandler = null;
        }

        this._state = null;
        window.editingMessage = null;

        this._updateSendButton(false);

        const indicator = document.getElementById('edit-mode-indicator');
        if (indicator) indicator.remove();

        this._hideInputEditLabel();
        this._hideCancelButtons();

        const input = document.getElementById('main-message-input') || document.getElementById('message-input');
        if (input) input.removeAttribute('aria-label');
        ChatUtils.clearInput();
        ChatUtils.clearSelectedFiles();

        const inputBox = document.getElementById('input-field-form');
        if (inputBox) inputBox.classList.remove('edit-mode-active');

        const cancelBtn = document.querySelector('.chip.cancel-edit');
        if (cancelBtn) cancelBtn.remove();

        this._announceToScreenReader('Edit cancelled.');
    },

    /**
     * Show edit mode indicator in chat title (P2: Progressive disclosure - hover for details)
     */
    _showEditIndicator() {
        const existing = document.getElementById('edit-mode-indicator');
        if (existing) existing.remove();

        const chatTitle = document.getElementById('chat-title');
        if (!chatTitle) return;

        const chatSeq = this._state?.chatSeq ?? 0;
        const preview = (this._state?.originalText ?? '').slice(0, 60);
        const tooltip = preview ? `Original: ${preview}${preview.length >= 60 ? '...' : ''}` : 'Editing message';

        const indicator = document.createElement('button');
        indicator.id = 'edit-mode-indicator';
        indicator.type = 'button';
        indicator.className = 'edit-mode-indicator-btn';
        indicator.setAttribute('aria-label', `Editing message ${chatSeq}. Click to focus input. ${tooltip}`);
        indicator.title = tooltip;
        indicator.onclick = () => {
            const input = document.getElementById('main-message-input') || document.getElementById('message-input');
            if (input) input.focus();
        };

        indicator.innerHTML = `
            <span class="edit-mode-dot" aria-hidden="true"></span>
            <span class="edit-mode-label">Editing #${chatSeq}</span>
            <span class="edit-mode-preview" aria-hidden="true">${preview ? preview + (preview.length >= 60 ? '...' : '') : ''}</span>
        `;

        chatTitle.appendChild(indicator);
    },

    /**
     * Input area label - "Editing message #N" with optional original preview
     */
    _showInputEditLabel() {
        const existing = document.getElementById('edit-input-label');
        if (existing) existing.remove();

        const inputArea = document.getElementById('input-area-wrapper');
        const form = document.getElementById('input-field-form');
        if (!inputArea || !form) return;

        const chatSeq = this._state?.chatSeq ?? 0;
        const originalText = this._state?.originalText ?? '';

        const wrapper = document.createElement('div');
        wrapper.id = 'edit-input-label';
        wrapper.className = 'edit-input-label';
        wrapper.setAttribute('role', 'status');
        wrapper.setAttribute('aria-live', 'polite');

        const label = document.createElement('span');
        label.className = 'edit-input-label-text';
        label.textContent = `Editing message #${chatSeq}`;

        wrapper.appendChild(label);

        if (originalText) {
            const preview = document.createElement('span');
            preview.className = 'edit-input-label-original';
            preview.textContent = originalText.slice(0, 80) + (originalText.length > 80 ? '...' : '');
            preview.title = originalText;
            wrapper.appendChild(preview);
        }

        inputArea.insertBefore(wrapper, form);
    },

    _hideInputEditLabel() {
        const el = document.getElementById('edit-input-label');
        if (el) el.remove();
    },

    /**
     * P0: ARIA live region for screen readers
     */
    _announceToScreenReader(message) {
        let region = document.getElementById('edit-mode-aria-live');
        if (!region) {
            region = document.createElement('div');
            region.id = 'edit-mode-aria-live';
            region.setAttribute('aria-live', 'polite');
            region.setAttribute('aria-atomic', 'true');
            region.className = 'sr-only';
            region.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
            document.body.appendChild(region);
        }
        region.textContent = message;
    },

    /**
     * P1: Scroll to keep edited message visible
     */
    _scrollToEditedMessage(conversationID, chatSeq) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const msg = messagesContainer.querySelector(`.message[data-conversation-id="${conversationID}"][data-chat-seq="${chatSeq}"]`);
        if (msg) {
            msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    /**
     * Update send button appearance
     * @param {boolean} editing
     */
    _updateSendButton(editing) {
        const sendBtn = document.getElementById('input-field-send-button') || document.querySelector('.btn-send') || document.getElementById('btn-send-message');
        if (sendBtn) {
            sendBtn.classList.toggle('edit-mode-send', editing);
            sendBtn.title = editing ? 'Send edited message' : 'Send message';
            sendBtn.setAttribute('aria-label', editing ? 'Send edited message' : 'Send message');
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
            if (messageBubble) messageBubble.classList.remove('edit-mode-editing');
        });

        // Then apply editing state to the specific message (P1: visual connection)
        messagesContainer.querySelectorAll('.message').forEach(msg => {
            if (msg.dataset.conversationId === conversationID && parseInt(msg.dataset.chatSeq) === chatSeq) {
                const editingLabel = msg.querySelector(".message-edit-indicator");
                if (editingLabel) editingLabel.style.display = 'inline-flex';

                const editButton = msg.querySelector(".message-edit-btn");
                if (editButton) editButton.style.display = "none";

                const messageBubble = msg.querySelector('.message-bubble.user-bubble');
                if (messageBubble) messageBubble.classList.add('edit-mode-editing');
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
            bubble.classList.remove('edit-mode-editing');
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
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': window.csrfToken
                },
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
                    chip.id = `selected-file-chip-${fileId}`;
                    chip.setAttribute('data-file-id', fileId);
                    chip.setAttribute('data-file-name', fileName);
                    chip.title = fileName;
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

                    const { base, ext: extPart } = truncateFileNameWithExtension(fileName);
                    const nameSpan = document.createElement('span');
                    nameSpan.id = `selected-file-chip-${fileId}-name`;
                    nameSpan.title = fileName;
                    nameSpan.style.cssText = 'max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-flex; align-items: baseline;';
                    nameSpan.appendChild(document.createTextNode(base));
                    if (extPart) {
                        const extSpan = document.createElement('span');
                        extSpan.id = `selected-file-chip-${fileId}-ext`;
                        extSpan.textContent = extPart;
                        extSpan.style.fontWeight = '600';
                        nameSpan.appendChild(extSpan);
                    }

                    const removeBtn = document.createElement('button');
                    removeBtn.id = `selected-file-chip-${fileId}-remove-btn`;
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
