/**
 * ChatUtils - Utility functions for chat
 */

const ChatUtils = {
    /**
     * Render markdown to HTML
     * @param {string} text
     * @returns {string}
     */
    renderMarkdown(text) {
        const source = text || '';
        if (window.marked && typeof window.marked.parse === 'function') {
            try {
                const rawHtml = window.marked.parse(source, { breaks: true });
                if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
                    return window.DOMPurify.sanitize(rawHtml);
                }
                return rawHtml;
            } catch (e) {
                console.error('Error rendering markdown:', e);
                return source.replace(/\n/g, '<br>');
            }
        }
        return source.replace(/\n/g, '<br>');
    },

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        const chatInterface = document.getElementById('chat-interface');
        if (chatInterface) {
            chatInterface.scrollTop = chatInterface.scrollHeight;
        }
    },

    /**
     * Show loading indicator (avatar + "Working on it..." + spinner)
     */
    showLoadingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        // Add spinner animation style if not present
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'ai-loading-indicator';
        loadingDiv.className = 'message ai-message';
        loadingDiv.innerHTML = `
            <div class="message-avatar">
                <img src="./img/Union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">
            </div>
            <div style="display: flex; align-items: center; gap: 10px; padding: 8px 0; font-family: Inter, Helvetica; font-size: 14px; color: #777;">
                <span>Working on it...</span>
                <div style="width: 14px; height: 14px; border: 2px solid #ddd; border-top-color: #555; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            </div>
        `;
        messagesContainer.appendChild(loadingDiv);
        this.scrollToBottom();
    },

    /**
     * Remove loading indicator
     */
    removeLoadingIndicator() {
        const loader = document.getElementById('ai-loading-indicator');
        if (loader) loader.remove();
    },

    /**
     * Show chat interface
     */
    showChatInterface() {
        const chatInterface = document.getElementById('chat-interface');
        const chatTopBar = document.getElementById('chat-top-bar');
        const suggestionChips = document.getElementById('suggestion-chips');
        const mainScreenTitle = document.querySelector('.main-screen-title');
        const quickPromptsContainer = document.getElementById('quick-prompts-container');

        if (chatInterface) chatInterface.style.display = 'flex';
        if (chatTopBar) chatTopBar.style.display = 'flex';
        if (suggestionChips) suggestionChips.style.display = 'flex';
        if (mainScreenTitle) mainScreenTitle.style.display = 'none';
        if (quickPromptsContainer) quickPromptsContainer.style.display = 'none';
    },

    /**
     * Hide chat interface
     */
    hideChatInterface() {
        const chatInterface = document.getElementById('chat-interface');
        const chatTopBar = document.getElementById('chat-top-bar');
        const suggestionChips = document.getElementById('suggestion-chips');
        const mainScreenTitle = document.querySelector('.main-screen-title');
        const quickPromptsContainer = document.getElementById('quick-prompts-container');

        if (chatInterface) chatInterface.style.display = 'none';
        if (chatTopBar) chatTopBar.style.display = 'none';
        if (suggestionChips) suggestionChips.style.display = 'none';
        if (mainScreenTitle) mainScreenTitle.style.display = 'flex';
        
        // Show quick prompts when on initial screen (no active chat)
        if (quickPromptsContainer) {
            quickPromptsContainer.style.display = 'flex';
        }
    },

    /**
     * Post-process download links in AI messages
     * @param {HTMLElement} bubble
     */
    postProcessDownloadLinks(bubble) {
        if (!bubble) return;

        const html = bubble.innerHTML;
        const docxPattern = /([A-Za-z0-9_\-\s]+\.docx)/gi;

        const processedHtml = html.replace(docxPattern, (match) => {
            if (html.includes(`data-report-download="${match}"`)) {
                return match;
            }
            return `<a href="#" class="report-download-link" data-report-download="${match}" style="color: #007bff; text-decoration: underline; cursor: pointer;">${match}</a>`;
        });

        if (processedHtml !== html) {
            bubble.innerHTML = processedHtml;

            const downloadLinks = bubble.querySelectorAll('.report-download-link');
            downloadLinks.forEach(link => {
                link.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const fileName = link.dataset.reportDownload;
                    await ReportService.downloadByName(fileName);
                });
            });
        }
    },

    /**
     * Set bubble content with optional markdown
     * @param {HTMLElement} bubble
     * @param {string} text
     * @param {Object} options
     */
    setBubbleContent(bubble, text, { allowMarkdown = false } = {}) {
        if (!bubble) return;
        if (allowMarkdown) {
            bubble.innerHTML = this.renderMarkdown(text);
            this.postProcessDownloadLinks(bubble);
        } else {
            bubble.textContent = text;
        }
    },

    /**
     * Get selected source documents from sidebar
     * @returns {Array<string>}
     */
    getSelectedSource() {
        const selectedSource = [];
        const sourceElements = document.querySelectorAll(".sidebar-items.source-item");

        for (let sourceElement of sourceElements) {
            const checkbox = sourceElement.querySelector('input[type="checkbox"]');
            if (checkbox?.checked) {
                selectedSource.push(sourceElement.dataset.documentId);
            }
        }

        console.log("Selected sources:", selectedSource);
        return selectedSource;
    },

    /**
     * Get selected file IDs from chips
     * @returns {Array<string>}
     */
    getChipFileIDs() {
        const chips = document.querySelectorAll('#selected-files-container [data-file-id]');
        return Array.from(chips).map(chip => chip.getAttribute('data-file-id'));
    },

    /**
     * Merge attached documents (dedupe)
     * @param {Array<string>} selectedSource
     * @param {Array<string>} chipFileIDs
     * @returns {Array<string>}
     */
    mergeAttachedDocuments(selectedSource = [], chipFileIDs = []) {
        return Array.from(new Set([...selectedSource, ...chipFileIDs].filter(Boolean)));
    },

    /**
     * Clear selected files wrapper
     */
    clearSelectedFiles() {
        const wrapper = document.getElementById('selected-files-wrapper');
        if (wrapper) wrapper.remove();
    },

    /**
     * Clear input field
     */
    clearInput() {
        const input = document.getElementById('main-message-input');
        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }
    }
};

// Export
Object.assign(window, {
    ChatUtils,
    // Aliases for backward compatibility
    renderMarkdownContent: ChatUtils.renderMarkdown.bind(ChatUtils),
    scrollToBottom: ChatUtils.scrollToBottom.bind(ChatUtils),
    showLoadingIndicator: ChatUtils.showLoadingIndicator.bind(ChatUtils),
    removeLoadingIndicator: ChatUtils.removeLoadingIndicator.bind(ChatUtils),
    showChatInterface: ChatUtils.showChatInterface.bind(ChatUtils),
    hideChatInterface: ChatUtils.hideChatInterface.bind(ChatUtils),
    getSelectedSource: ChatUtils.getSelectedSource.bind(ChatUtils)
});
