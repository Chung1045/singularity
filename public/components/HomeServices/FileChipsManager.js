/**
 * FileChipsManager - Manages file chips for chat input
 */

const FileChipsManager = {
    /**
     * Add files as chips to the chat input area
     * @param {Array} files - Array of file objects
     */
    add(files) {
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
                background-color:rgb(33, 51, 79);
                border-radius: 16px 16px 0 0;
                align-items: center;
                justify-content: flex-start;
                overflow-x: auto;
                overflow-y: hidden;
                white-space: nowrap;
            `;

            wrapper.appendChild(container);

            const inputField = document.querySelector('.input-field');
            if (inputField?.parentNode) {
                inputField.parentNode.insertBefore(wrapper, inputField);
            }
        }

        // Update cancel button if in edit mode
        if (window.EditMode?.isEditing) {
            window.EditMode._updateCancelButton();
        }

        // Add chips
        files.forEach(file => {
            // Skip if already added
            if (container.querySelector(`[data-file-id="${file.documentID}"]`)) {
                return;
            }

            const ext = file.documentExt || '';
            let cleanName = (file.documentName || '').replace(/\.+$/, '');
            const fullFileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;
            const displayFileName = file.fileName || fullFileName;

            const chip = document.createElement('div');
            chip.setAttribute('data-file-id', file.documentID);
            chip.setAttribute('data-file-name', displayFileName);
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

            const fileName = document.createElement('span');
            fileName.textContent = displayFileName;
            fileName.style.cssText = 'max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.style.cssText = `
                border: none;
                background: transparent;
                font-size: 18px;
                color: #666;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            removeBtn.onclick = () => {
                chip.remove();
                if (!container.children.length) {
                    wrapper.remove();
                }
            };

            chip.appendChild(fileName);
            chip.appendChild(removeBtn);
            container.appendChild(chip);
        });
    },

    /**
     * Clear all file chips
     */
    clear() {
        const wrapper = document.getElementById('selected-files-wrapper');
        if (wrapper) wrapper.remove();
    },

    /**
     * Get all selected file IDs
     * @returns {Array<string>}
     */
    getSelectedIDs() {
        const chips = document.querySelectorAll('#selected-files-container [data-file-id]');
        return Array.from(chips).map(chip => chip.getAttribute('data-file-id'));
    },

    /**
     * Update chips from selection modal
     * @param {Array} selectedFiles
     * @param {Map} selectedFilesMap
     */
    updateFromSelection(selectedFiles, selectedFilesMap) {
        const container = document.getElementById('selected-files-container');

        // Remove unchecked files
        if (container) {
            const existingChips = container.querySelectorAll('[data-file-id]');
            existingChips.forEach(chip => {
                const fileId = chip.getAttribute('data-file-id');
                if (!selectedFilesMap.has(fileId)) {
                    chip.remove();
                }
            });

            // Remove wrapper if empty
            if (!container.children.length && !selectedFiles.length) {
                const wrapper = document.getElementById('selected-files-wrapper');
                if (wrapper) wrapper.remove();
            }
        }

        // Add new selections
        if (selectedFiles.length > 0) {
            this.add(selectedFiles);
        }
    }
};

// Export
Object.assign(window, {
    FileChipsManager,
    // Backward compatibility
    addFilesToChatInput: FileChipsManager.add.bind(FileChipsManager)
});
