/**
 * ChatUtils - Utility functions for chat
 */
const ChatUtils = {
    // ADDED: Track loading timeout
    loadingTimeoutRef: null,
    LOADING_WARNING_DELAY: 3 * 60 * 1000, // 3 minutes

    /** rAF id for coalesced scroll during token streaming */
    _streamScrollRafId: null,

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
     * Scroll chat to bottom (instant; avoids overlapping smooth scroll during rapid updates)
     */
    scrollToBottom() {
        const chatInterface = document.getElementById('chat-interface');
        if (!chatInterface) return;
        const top = chatInterface.scrollHeight;
        if (typeof chatInterface.scrollTo === 'function') {
            chatInterface.scrollTo({ top, behavior: 'auto' });
        } else {
            chatInterface.scrollTop = top;
        }
    },

    /**
     * During SSE streaming, scroll at most once per frame to avoid layout thrash and visible jumping.
     */
    scheduleScrollToBottomDuringStream() {
        if (this._streamScrollRafId != null) return;
        this._streamScrollRafId = requestAnimationFrame(() => {
            this._streamScrollRafId = null;
            this.scrollToBottom();
        });
    },

    /**
     * Show loading indicator (avatar + "Loading..." + 3x3 grid spinner)
     */
    showLoadingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        // Clear any existing loader first
        this.removeLoadingIndicator();

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'ai-loading-indicator';
        loadingDiv.className = 'message ai-message';
        loadingDiv.innerHTML = `
            <div class="message-avatar">
                <img src="./img/union.svg" alt="AI" style="width: 50%; height: 50%; object-fit: contain;">
            </div>
            <div style="padding: 8px 4px;">
                <div class="loader-text"></div>
                <!-- 3-minute warning, hidden by default -->
                <div id="loading-warning" style="margin-top:6px; font-size:12px; color:#9ca3af; display:none;">
                    This may take a moment, please wait.
                </div>
            </div>
        `;
        messagesContainer.appendChild(loadingDiv);
        this.scrollToBottom();

        // Show warning after 3 minutes of loading
        this.loadingTimeoutRef = setTimeout(() => {
            const warning = document.getElementById('loading-warning');
            if (warning) warning.style.display = 'block';
            this.scrollToBottom();
        }, this.LOADING_WARNING_DELAY);
    },

    /**
     * Remove loading indicator & clear timeout
     */
    removeLoadingIndicator() {
        // Clear the 3-minute timeout
        if (this.loadingTimeoutRef) {
            clearTimeout(this.loadingTimeoutRef);
            this.loadingTimeoutRef = null;
        }

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
    scheduleScrollToBottomDuringStream: ChatUtils.scheduleScrollToBottomDuringStream.bind(ChatUtils),
    showLoadingIndicator: ChatUtils.showLoadingIndicator.bind(ChatUtils),
    removeLoadingIndicator: ChatUtils.removeLoadingIndicator.bind(ChatUtils),
    showChatInterface: ChatUtils.showChatInterface.bind(ChatUtils),
    hideChatInterface: ChatUtils.hideChatInterface.bind(ChatUtils),
    getSelectedSource: ChatUtils.getSelectedSource.bind(ChatUtils)
});