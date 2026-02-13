/**
 * QuickPrompts Component
 * Displays suggested prompts for new chats to guide users on platform capabilities
 */

const QuickPrompts = () => {
    /**
     * Handle prompt click - fills input field and automatically submits the chat
     * @param {string} promptText - The text to fill in the input and submit
     */
    const handlePromptClick = (promptText) => {
        // Check if a project is selected
        // const projectDropdown = document.getElementById("select-project-drop-down");
        // const projectID = projectDropdown?.value;
        
        // if (!projectID) {
        //     // Show warning notification if no project is selected
        //     if (typeof window.showNotification === 'function') {
        //         window.showNotification({
        //             type: 'warning',
        //             title: 'No Project Selected',
        //             message: 'Please create or select a project before starting a chat.',
        //             actionText: 'OK'
        //         });
        //     } else {
        //         alert('Please create or select a project before starting a chat.');
        //     }
        //     return;
        // }
        
        // Fill input field
        const input = document.getElementById('main-message-input');
        if (input) {
            input.value = promptText;
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
            // input.focus(); // use this if you want to focus the input field after filling it
        }
        
        // Automatically submit the conversation request
        // enable this if you want to automatically submit the chat after filling the input field
        if (typeof window.submitConversationRequest === 'function') {
            window.submitConversationRequest();
        }
    };

    const prompts = [
        {
            category: 'FR/NFR',
            title: 'FR/NFR',
            prompt: 'Classify and identify functional and non-functional requirements from the uploaded documents',
            displayText: 'Classify requirements from documents'
        },
        {
            category: 'Report',
            title: 'Report',
            prompt: 'Generate a comprehensive requirements report for this project',
            displayText: 'Generate requirements report'
        },
        {
            category: 'User Stories',
            title: 'User Stories',
            prompt: 'Generate user stories based on the project requirements',
            displayText: 'Generate user stories from requirements'
        },
        {
            category: 'Completion',
            title: 'Completion',
            prompt: 'Suggest missing or incomplete requirements for this project',
            displayText: 'Suggest missing requirements'
        }
    ];

    return React.createElement('div', {
        id: 'quick-prompts-container',
        className: 'quick-prompts-container',
        style: { display: 'none' }
    },
        React.createElement('div', { className: 'quick-prompts-title' }, 'Quick Prompts'),
        React.createElement('div', { className: 'quick-prompts-grid' },
            ...prompts.map((item, index) =>
                React.createElement('div', {
                    key: `quick-prompt-category-${index}`,
                    className: 'quick-prompt-category'
                },
                    React.createElement('div', {
                        className: 'quick-prompt-category-title'
                    }, item.title),
                    React.createElement('button', {
                        className: 'quick-prompt-item',
                        onClick: () => handlePromptClick(item.prompt)
                    }, item.displayText)
                )
            )
        )
    );
};

// Export to window for global access
window.QuickPrompts = QuickPrompts;
