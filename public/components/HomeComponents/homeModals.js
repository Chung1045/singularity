/**
 * FileSelectionModal Component
 * Modal for selecting files from the project to attach to chat
 */

const FileSelectionModal = {
    /**
     * Show file selection modal
     * @param {Array} files - Array of file objects
     * @param {string} projectID - Project ID
     * @param {Function} onConfirm - Callback when files are selected
     */
    show(files, projectID, onConfirm) {
        const selectedFilesMap = new Map();

        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'file-selection-modal-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: ${window.ZIndex?.MODAL || 10003};
            padding: 20px;
        `;

        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'file-selection-modal';
        modal.style.cssText = `
            background-color: #ffffff;
            border-radius: 10px;
            width: 100%;
            max-width: 600px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 18px 17px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #e4e4e4;
        `;
        header.innerHTML = `
            <div style="font-family: 'SF Pro-Bold', Helvetica; font-weight: 400; font-size: 18px; color: #000;">Select Files</div>
            <button id="close-file-selection-modal" style="width: 30px; height: 30px; border: none; background: transparent; cursor: pointer; font-size: 20px; color: #666;">×</button>
        `;

        // File list container
        const fileListContainer = document.createElement('div');
        fileListContainer.id = 'file-selection-list';
        fileListContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px 17px;
        `;

        // Render file items
        files.forEach((file, index) => {
            const ext = file.documentExt || '';
            let cleanName = (file.documentName || '').replace(/\.+$/, '');
            const fileName = ext.startsWith('.') ? `${cleanName}${ext}` : `${cleanName}.${ext}`;

            const fileItem = document.createElement('div');
            fileItem.style.cssText = `
                display: flex;
                align-items: center;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: background-color 0.2s;
            `;
            fileItem.onmouseenter = () => fileItem.style.backgroundColor = '#f5f5f5';
            fileItem.onmouseleave = () => fileItem.style.backgroundColor = 'transparent';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `file-checkbox-${index}`;
            checkbox.style.cssText = `
                width: 18px;
                height: 18px;
                margin-right: 12px;
                cursor: pointer;
            `;
            checkbox.onclick = (e) => e.stopPropagation();
            checkbox.onchange = (e) => {
                if (e.target.checked) {
                    selectedFilesMap.set(file.documentID, { fileName, ...file });
                } else {
                    selectedFilesMap.delete(file.documentID);
                }
            };

            const label = document.createElement('label');
            label.htmlFor = `file-checkbox-${index}`;
            label.style.cssText = `
                flex: 1;
                font-family: 'Inter', Helvetica;
                font-size: 13.3px;
                color: #000;
                cursor: pointer;
            `;
            label.textContent = fileName;
            label.onclick = (e) => e.stopPropagation();

            fileItem.appendChild(checkbox);
            fileItem.appendChild(label);
            fileItem.onclick = (e) => {
                if (e.target === fileItem) {
                    checkbox.click();
                }
            };

            fileListContainer.appendChild(fileItem);
        });

        // Footer with buttons
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 15px 17px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            border-top: 1px solid #e4e4e4;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 8px 24px;
            background-color: #e4e4e4;
            border-radius: 50px;
            border: none;
            font-family: 'Inter-Bold', Helvetica;
            font-weight: 700;
            font-size: 12px;
            color: #1c1d21;
            cursor: pointer;
        `;
        cancelBtn.onclick = () => this.close();

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Add to Chat';
        confirmBtn.style.cssText = `
            padding: 8px 24px;
            background-color: rgb(30, 41, 59);
            border-radius: 50px;
            border: none;
            font-family: 'Inter-Bold', Helvetica;
            font-weight: 700;
            font-size: 12px;
            color: #fff;
            cursor: pointer;
        `;
        confirmBtn.onclick = () => {
            const selectedFiles = Array.from(selectedFilesMap.values());
            if (onConfirm) {
                onConfirm(selectedFiles, selectedFilesMap);
            }
            this.close();
        };

        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);

        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(fileListContainer);
        modal.appendChild(footer);
        backdrop.appendChild(modal);

        // Close handlers
        header.querySelector('#close-file-selection-modal').onclick = () => this.close();
        backdrop.onclick = (e) => {
            if (e.target === backdrop) this.close();
        };

        document.body.appendChild(backdrop);
    },

    /**
     * Close the modal
     */
    close() {
        const backdrop = document.getElementById('file-selection-modal-backdrop');
        if (backdrop) {
            document.body.removeChild(backdrop);
        }
    }
};

/**
 * ConfirmModal - Simple confirmation modal
 */
const ConfirmModal = {
    /**
     * Show confirmation modal
     * @param {Object} options - Modal options
     * @returns {Promise<boolean>}
     */
    show({ title, message, confirmText = 'Delete', cancelText = 'Cancel', confirmColor = '#000000' }) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: ${window.ZIndex?.MODAL || 10001};
                padding: 20px;
            `;

            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background-color: #ffffff;
                border-radius: 15px;
                padding: 30px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                gap: 20px;
            `;

            modalContent.innerHTML = `
                <div style="font-family: Urbanist, Helvetica; font-weight: 700; font-size: 24px; color: #000000;">${title}</div>
                <div style="font-family: Inter, Helvetica; font-weight: 400; font-size: 16px; color: #000000; line-height: 1.5;">${message}</div>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px;">
                    <button id="modal-cancel-btn" style="padding: 12px 24px; border-radius: 10px; border: 1px solid #e0e0e0; background-color: #ffffff; color: #000000; font-family: Urbanist, Helvetica; font-weight: 600; font-size: 16px; cursor: pointer; transition: all 0.2s ease;">${cancelText}</button>
                    <button id="modal-confirm-btn" style="padding: 12px 24px; border-radius: 10px; border: none; background-color: ${confirmColor}; color: #ffffff; font-family: Urbanist, Helvetica; font-weight: 600; font-size: 16px; cursor: pointer; transition: all 0.2s ease;">${confirmText}</button>
                </div>
            `;

            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            const cleanup = (result) => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
                resolve(result);
            };

            const confirmBtn = modalContent.querySelector('#modal-confirm-btn');
            const cancelBtn = modalContent.querySelector('#modal-cancel-btn');

            confirmBtn.onclick = () => cleanup(true);
            cancelBtn.onclick = () => cleanup(false);
            modal.onclick = (e) => {
                if (e.target === modal) cleanup(false);
            };
            modalContent.onclick = (e) => e.stopPropagation();
        });
    }
};

/**
 * AlertModal - Simple alert modal
 */
const AlertModal = {
    show({ title, message, buttonText = 'OK', autoClose = 5000 }) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: ${window.ZIndex?.MODAL || 10001};
                padding: 20px;
            `;

            const content = document.createElement('div');
            content.style.cssText = `
                background-color: #ffffff;
                border-radius: 15px;
                padding: 30px;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                gap: 20px;
            `;

            content.innerHTML = `
                <div style="font-family: Urbanist, Helvetica; font-weight: 700; font-size: 24px; color: #000000;">${title}</div>
                <div style="font-family: Inter, Helvetica; font-weight: 400; font-size: 16px; color: #000000; line-height: 1.4;">${message}</div>
                <div style="display: flex; justify-content: flex-end;">
                    <button id="alert-ok-btn" style="padding: 12px 32px; border-radius: 10px; border: none; background-color: #000000; color: #ffffff; font-family: Urbanist, Helvetica; font-weight: 600; font-size: 16px; cursor: pointer; transition: all 0.2s ease;">${buttonText}</button>
                </div>
            `;

            modal.appendChild(content);
            document.body.appendChild(modal);

            const cleanup = () => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
                resolve();
            };

            content.querySelector('#alert-ok-btn').onclick = cleanup;
            content.onclick = (e) => e.stopPropagation();

            if (autoClose) {
                setTimeout(cleanup, autoClose);
            }
        });
    }
};

// Export
Object.assign(window, { FileSelectionModal, ConfirmModal, AlertModal });
