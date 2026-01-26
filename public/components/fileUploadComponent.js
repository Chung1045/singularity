(function () {
    const { useState, useEffect, useRef } = React;
    console.log('[FileUpload] fileUploadComponent.js loading...');

    window.FileUploadComponent = ({ projectID, onClose, onFilesUploaded }) => {
        console.log('[FileUpload] Component rendered with projectID:', projectID);
        const [uploadStage, setUploadStage] = useState('initial');
        const [selectedFiles, setSelectedFiles] = useState([]);
        const [isUploading, setIsUploading] = useState(false);
        const [isDragging, setIsDragging] = useState(false);
        const [checkedTempIDs, setCheckedTempIDs] = useState(new Set());
        const [menuOpen, setMenuOpen] = useState(null);
        const [editingFile, setEditingFile] = useState(null);
        const [editingFilename, setEditingFilename] = useState('');
        const headerCheckboxRef = useRef(null);
        const renameContainerRef = useRef(null);

        // Preserve existing checked state - new files start unchecked
        useEffect(() => {
            setCheckedTempIDs(prev => {
                const newSet = new Set();
                selectedFiles.forEach(file => {
                    if (prev.has(file.tempID)) {
                        newSet.add(file.tempID);
                    }
                });
                return newSet;
            });
        }, [selectedFiles]);

        // Header checkbox indeterminate state
        useEffect(() => {
            if (headerCheckboxRef.current && selectedFiles.length > 0) {
                const allChecked = selectedFiles.every(f => checkedTempIDs.has(f.tempID));
                const someChecked = selectedFiles.some(f => checkedTempIDs.has(f.tempID));
                headerCheckboxRef.current.indeterminate = someChecked && !allChecked;
            }
        }, [checkedTempIDs, selectedFiles]);

        // Close menu when clicking outside
        useEffect(() => {
            const handleClickOutside = (event) => {
                if (menuOpen !== null && !event.target.closest('.file-menu-container')) {
                    setMenuOpen(null);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [menuOpen]);

        // Cancel rename when clicking outside rename controls (desktop only)
        useEffect(() => {
            if (editingFile === null) return;

            // Skip click-outside behavior on touch devices to prevent accidental cancels
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            if (isTouchDevice) return;

            const handleClickOutsideRename = (event) => {
                if (renameContainerRef.current && !renameContainerRef.current.contains(event.target)) {
                    cancelRename();
                }
            };

            document.addEventListener('mousedown', handleClickOutsideRename);
            return () => document.removeEventListener('mousedown', handleClickOutsideRename);
        }, [editingFile]);

        const toggleChecked = (tempID) => {
            setCheckedTempIDs(prev => {
                const newSet = new Set(prev);
                if (newSet.has(tempID)) {
                    newSet.delete(tempID);
                } else {
                    newSet.add(tempID);
                }
                return newSet;
            });
        };

        const handleDelete = (tempID) => {
            const file = selectedFiles.find(f => f.tempID === tempID);
            if (!file) return;

            window.showNotification({
                type: 'confirm',
                title: 'Delete File?',
                message: `Are you sure you want to remove "${file.originalName}" from the upload list?`,
                actionText: 'Delete'
            }).then((confirmed) => {
                if (confirmed) {
                    setSelectedFiles(prev => prev.filter(f => f.tempID !== tempID));
                    setMenuOpen(null);
                }
            });
        };

        const startRename = (tempID) => {
            const file = selectedFiles.find(f => f.tempID === tempID);
            if (file) {
                setEditingFile(tempID);
                setEditingFilename(file.fileName);
                setMenuOpen(null);
            }
        };

        const saveRename = () => {
            const trimmed = editingFilename.trim();
            if (!trimmed) {
                window.showNotification({
                    type: 'error',
                    title: 'Invalid Filename',
                    message: 'Filename cannot be empty.',
                    actionText: 'OK'
                });
                return;
            }
            setSelectedFiles(prev => prev.map(f =>
                f.tempID === editingFile
                    ? { ...f, fileName: trimmed, originalName: f.fileExt ? `${trimmed}.${f.fileExt}` : trimmed }
                    : f
            ));
            setEditingFile(null);
            setEditingFilename('');
        };

        const cancelRename = () => {
            setEditingFile(null);
            setEditingFilename('');
        };

        const handleUpload = async () => {
            const filesToUpload = selectedFiles.filter(f => checkedTempIDs.has(f.tempID));

            if (filesToUpload.length === 0) {
                window.showNotification({
                    type: 'info',
                    title: 'No Files Selected',
                    message: 'Please select at least one file to upload by checking the checkbox next to it.',
                    actionText: 'OK'
                });
                return;
            }

            let uploadThese = filesToUpload;

            const allChecked = filesToUpload.length === selectedFiles.length;

            if (!allChecked && selectedFiles.length > 1) {
                const selectedList = filesToUpload.map(f => `• ${f.originalName}`).join('\n');
                const uncheckedFiles = selectedFiles.filter(f => !checkedTempIDs.has(f.tempID));
                const uncheckedList = uncheckedFiles.map(f => `• ${f.originalName}`).join('\n');

                const uploadAll = await window.showNotification({
                    type: 'confirm',
                    title: 'Upload Selection',
                    message: `You have selected ${filesToUpload.length} of ${selectedFiles.length} file(s).\n\n Checked (${filesToUpload.length}):\n${selectedList}\n\n Unchecked (${uncheckedFiles.length}):\n${uncheckedList}\n\nChoose:\n• Click "Upload All" to upload all ${selectedFiles.length} files\n• Click "Cancel" to upload only the checked ones`,
                    actionText: 'Upload All'
                });

                if (uploadAll) {
                    uploadThese = [...selectedFiles];
                }
            }

            setIsUploading(true);
            const uploadedFiles = [];
            for (const fileData of uploadThese) {
                try {
                    const formData = new FormData();
                    const renamedFile = new File([fileData.file], fileData.originalName, { type: fileData.file.type });
                    formData.append('file', renamedFile);
                    formData.append('projectID', projectID);
                    const response = await fetch('/api/project/file/upload', { method: 'POST', body: formData });
                    const data = await response.json();
                    if (data.successful) {
                        uploadedFiles.push({ ...fileData, documentID: data.documentID });
                    }
                } catch (error) {
                    console.error('Error uploading file:', error);
                    window.showNotification({ type: 'error', title: 'Upload Failed', message: `Failed to upload ${fileData.originalName}.`, actionText: 'OK' });
                }
            }
            setIsUploading(false);

            if (onFilesUploaded) {
                onFilesUploaded(uploadedFiles);
            }

            window.showNotification({
                type: 'success',
                title: 'Upload Complete!',
                message: `${uploadedFiles.length} file(s) uploaded successfully.`,
                actionText: 'Done'
            }).then(() => { onClose(); });
        };

        const formatFileSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        };

        const getAudioDuration = (file) => {
            return new Promise((resolve) => {
                const audio = document.createElement('audio');
                audio.preload = 'metadata';
                audio.onloadedmetadata = () => {
                    window.URL.revokeObjectURL(audio.src);
                    resolve(Math.round(audio.duration));
                };
                audio.onerror = () => resolve(null);
                audio.src = URL.createObjectURL(file);
            });
        };

        const formatDuration = (seconds) => {
            if (!seconds) return 'N/A';
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        };

        const formatDate = (date) => {
            const d = new Date(date);
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const year = d.getFullYear();
            const hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'pm' : 'am';
            const hour12 = hours % 12 || 12;
            return `${month}-${day}-${year} ${hour12}:${minutes}${ampm}`;
        };

        const renderInitialScreen = () => {
            const handleFileSelect = async (event) => {
                const files = event.target.files;
                if (!files || files.length === 0) return;
                const fileArray = Array.from(files);
                const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
                const processedFilesList = [];
                for (const file of fileArray) {
                    const fileName = file.name.toLowerCase();
                    const isAudio = audioExtensions.some(ext => fileName.endsWith(ext));
                    const lastDotIndex = file.name.lastIndexOf('.');
                    const fileExt = lastDotIndex > 0 ? file.name.substring(lastDotIndex + 1) : '';
                    let fileNameWithoutExt = lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;
                    fileNameWithoutExt = fileNameWithoutExt.replace(/\.+$/, '');
                    if (fileExt && fileNameWithoutExt.toLowerCase().endsWith(`.${fileExt.toLowerCase()}`)) {
                        fileNameWithoutExt = fileNameWithoutExt.substring(0, fileNameWithoutExt.length - fileExt.length - 1);
                        fileNameWithoutExt = fileNameWithoutExt.replace(/\.+$/, '');
                    }
                    let duration = null;
                    if (isAudio) {
                        duration = await getAudioDuration(file);
                    }
                    processedFilesList.push({
                        file: file,
                        fileName: fileNameWithoutExt,
                        originalName: fileExt ? `${fileNameWithoutExt}.${fileExt}` : fileNameWithoutExt,
                        fileExt: fileExt,
                        fileSize: file.size,
                        uploadDate: new Date(),
                        isAudio: isAudio,
                        duration: duration,
                        tempID: Date.now() + '-' + Math.random()
                    });
                }
                setSelectedFiles(prev => {
                    const existingFileKeys = new Set(prev.map(f => `${f.originalName}-${f.fileSize}-${f.isAudio}`));
                    const newFiles = processedFilesList.filter(f => {
                        const fileKey = `${f.originalName}-${f.fileSize}-${f.isAudio}`;
                        return !existingFileKeys.has(fileKey);
                    });
                    return [...prev, ...newFiles];
                });
                event.target.value = '';
            };

            const handleDragOver = (e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
            };

            const handleDragLeave = (e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
            };

            const handleDrop = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const files = e.dataTransfer.files;
                if (!files || files.length === 0) return;
                const fileArray = Array.from(files);
                const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];
                const processedFilesList = [];
                for (const file of fileArray) {
                    const fileName = file.name.toLowerCase();
                    const isAudio = audioExtensions.some(ext => fileName.endsWith(ext));
                    const lastDotIndex = file.name.lastIndexOf('.');
                    const fileExt = lastDotIndex > 0 ? file.name.substring(lastDotIndex + 1) : '';
                    let fileNameWithoutExt = lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;
                    fileNameWithoutExt = fileNameWithoutExt.replace(/\.+$/, '');
                    if (fileExt && fileNameWithoutExt.toLowerCase().endsWith(`.${fileExt.toLowerCase()}`)) {
                        fileNameWithoutExt = fileNameWithoutExt.substring(0, fileNameWithoutExt.length - fileExt.length - 1);
                        fileNameWithoutExt = fileNameWithoutExt.replace(/\.+$/, '');
                    }
                    let duration = null;
                    if (isAudio) {
                        duration = await getAudioDuration(file);
                    }
                    processedFilesList.push({
                        file: file,
                        fileName: fileNameWithoutExt,
                        originalName: fileExt ? `${fileNameWithoutExt}.${fileExt}` : fileNameWithoutExt,
                        fileExt: fileExt,
                        fileSize: file.size,
                        uploadDate: new Date(),
                        isAudio: isAudio,
                        duration: duration,
                        tempID: Date.now() + '-' + Math.random()
                    });
                }
                setSelectedFiles(prev => {
                    const existingFileKeys = new Set(prev.map(f => `${f.originalName}-${f.fileSize}-${f.isAudio}`));
                    const newFiles = processedFilesList.filter(f => {
                        const fileKey = `${f.originalName}-${f.fileSize}-${f.isAudio}`;
                        return !existingFileKeys.has(fileKey);
                    });
                    return [...prev, ...newFiles];
                });
            };

            const handleNextClick = () => {
                if (selectedFiles.length > 0) {
                    setUploadStage('upload');
                }
            };

            const triggerFileInput = () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = '*/*';
                input.onchange = handleFileSelect;
                input.click();
            };

            const removeFile = (tempID) => {
                setSelectedFiles(prev => prev.filter(f => f.tempID !== tempID));
            };

            return React.createElement('div', {
                    id: 'file-upload-modal-root',
                    style: { width: '650px', height: '422px', maxWidth: '650px', backgroundColor: '#ffffff', borderRadius: '10px', display: 'flex', flexDirection: 'column' }
                },
                React.createElement('div', { id: 'import-header-container', style: { padding: '18px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e4' } },
                    React.createElement('button', { id: 'import-back-button', onClick: onClose, style: { width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e4e4e4', borderRadius: '10px', backgroundColor: '#ffffff', cursor: 'pointer' } },
                        React.createElement('img', { id: 'import-back-icon', src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg', style: { width: '20px', height: '20px' } })
                    ),
                    React.createElement('div', { id: 'import-title-text', style: { fontFamily: '"SF Pro-Bold", Helvetica', fontWeight: '400', fontSize: '18px', color: '#000000', marginLeft: '10px' } }, 'Import Files'),
                    React.createElement('button', { id: 'import-next-button', onClick: handleNextClick, disabled: selectedFiles.length === 0, style: { padding: '8px 24px', backgroundColor: selectedFiles.length > 0 ? 'rgb(30, 41, 59)' : '#e4e4e4', borderRadius: '50px', border: 'none', fontFamily: '"Inter-Bold", Helvetica', fontWeight: '700', fontSize: '15px', color: selectedFiles.length > 0 ? '#ffffff' : '#1c1d21', cursor: selectedFiles.length > 0 ? 'pointer' : 'not-allowed', marginLeft: 'auto' } }, 'Next')
                ),
                React.createElement('div', { id: 'import-content-container', style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' } },
                    selectedFiles.length > 0 ?
                        React.createElement('div', { id: 'import-file-list-container', style: { width: '100%', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' } },
                            selectedFiles.map((file) =>
                                React.createElement('div', { id: `import-file-item-${file.tempID}`, key: file.tempID, style: { padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' } },
                                    React.createElement('div', { id: `import-file-icon-bg-${file.tempID}`, style: { width: '40px', height: '40px', backgroundColor: file.isAudio ? '#876fc3' : '#e4e4e4', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontFamily: '"Inter-Bold", Helvetica', color: file.isAudio ? '#fff' : '#666', fontWeight: '600', textTransform: 'uppercase' } }, file.fileExt || '?'),
                                    React.createElement('div', { id: `import-file-info-container-${file.tempID}`, style: { flex: 1, overflow: 'hidden' } },
                                        React.createElement('div', { id: `import-file-name-${file.tempID}`, style: { fontFamily: '"Inter-Medium", Helvetica', fontSize: '13px', fontWeight: '500', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, file.originalName),
                                        React.createElement('div', { id: `import-file-meta-${file.tempID}`, style: { fontFamily: '"Inter-Regular", Helvetica', fontSize: '11px', color: '#666', marginTop: '2px' } }, `${file.fileExt.toUpperCase()} • ${formatFileSize(file.fileSize)}`)
                                    ),
                                    React.createElement('button', { id: `import-remove-button-${file.tempID}`, onClick: () => removeFile(file.tempID), style: { width: '24px', height: '24px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' }, onMouseEnter: (e) => e.currentTarget.style.color = '#c1281e', onMouseLeave: (e) => e.currentTarget.style.color = '#999' }, '×')
                                )
                            ),
                            React.createElement('button', {
                                    id: 'import-add-more-button',
                                    onClick: triggerFileInput,
                                    style: { padding: '12px', backgroundColor: '#ffffff', border: '2px dashed rgb(30, 41, 59)', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Inter-Medium", Helvetica', fontSize: '13px', color: 'rgb(30, 41, 59)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' },
                                    onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = '#f0f4f8'; e.currentTarget.style.borderColor = 'rgb(51, 65, 85)'; },
                                    onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = 'rgb(30, 41, 59)'; },
                                    onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.backgroundColor = '#e8f4f8'; e.currentTarget.style.borderColor = 'rgb(51, 65, 85)'; },
                                    onDragLeave: (e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = 'rgb(30, 41, 59)'; },
                                    onDrop: handleDrop
                                },
                                React.createElement('span', { id: 'import-add-more-plus-icon', style: { fontSize: '18px' } }, '+'),
                                React.createElement('span', { id: 'import-add-more-text' }, 'Add More Files')
                            )
                        )
                        :
                        React.createElement('div', {
                                id: 'import-empty-drop-zone',
                                onDragOver: handleDragOver,
                                onDragLeave: handleDragLeave,
                                onDrop: handleDrop,
                                onClick: triggerFileInput,
                                style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: isDragging ? '3px solid rgb(0,0,0)' : '2px solid #000000', borderRadius: '12px', backgroundColor: isDragging ? 'rgb(225,225,225)' : '#ffffff', cursor: 'pointer', transition: 'all 0.2s', gap: '16px' }
                            },
                            React.createElement('div', { id: 'import-empty-icon-bg', style: { width: '85px', height: '85px', backgroundColor: isDragging ? 'rgba(0,0,0,0)' : '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' } },
                                React.createElement('img', { id: 'import-empty-icon-img', src: './img/cloud-upload.svg', style: { width: '85px', height: '85px', filter: isDragging ? 'brightness(0) invert(0)' : 'none' } })
                            ),
                            React.createElement('div', { id: 'import-empty-title-text', style: { fontFamily: '"Inter-Bold", Helvetica', fontSize: '16px', fontWeight: '400', color: '#000', textAlign: 'center' } }, isDragging ? 'Drop files here' : 'Import Files for Analysis'),
                            // React.createElement('div', { id: 'import-empty-subtitle-text', style: { fontFamily: '"Inter-Regular", Helvetica', fontSize: '13px', color: '#666', textAlign: 'center' } }, 'All file types supported')
                        )
                )
            );
        };

        if (uploadStage === 'initial') {
            return renderInitialScreen();
        }

        // Upload stage
        return React.createElement('div', {
                id: 'upload-modal-root',
                style: {
                    width: '650px',
                    minWidth: '350px',
                    height: '422px',
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }
            },
            React.createElement('div', {
                    id: 'upload-header-container',
                    style: {
                        padding: '18px 17px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #e4e4e4'
                    }
                },
                React.createElement('button', {
                        id: 'upload-back-button',
                        onClick: () => setUploadStage('initial'),
                        style: {
                            width: '35px',
                            height: '35px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #e4e4e4',
                            borderRadius: '10px',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer'
                        }
                    },
                    React.createElement('img', {
                        id: 'upload-back-icon',
                        src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                        style: { width: '20px', height: '20px' }
                    })
                ),
                React.createElement('div', {
                    id: 'upload-title-text',
                    style: {
                        fontFamily: '"SF Pro-Bold", Helvetica',
                        fontWeight: '400',
                        fontSize: '18px',
                        color: '#000000',
                        marginLeft: '10px'
                    }
                }, 'Upload Files'),
                React.createElement('div', {
                        id: 'upload-header-buttons-container',
                        style: { display: 'flex', gap: '12px', marginLeft: 'auto' }
                    },
                    React.createElement('button', {
                            id: 'upload-reupload-button',
                            onClick: () => setUploadStage('initial'),
                            disabled: isUploading,
                            style: {
                                padding: '8px 16px',
                                backgroundColor: '#ffffff',
                                borderRadius: '50px',
                                border: '1px solid #e4e4e4',
                                fontFamily: '"Inter-Medium", Helvetica',
                                fontWeight: '500',
                                fontSize: '14px',
                                color: '#000',
                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            },
                            onMouseEnter: (e) => { if (!isUploading) e.currentTarget.style.backgroundColor = '#f5f5f5'; },
                            onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }
                        },
                        React.createElement('img', {
                            id: 'upload-reupload-icon',
                            src: './img/reupload-icon.svg',
                            style: { width: '24px', height: '24px', transform: 'rotate(180deg)' }
                        }),
                        React.createElement('span', { id: 'upload-reupload-text' }, 'Reupload')
                    ),
                    React.createElement('button', {
                        id: 'upload-submit-button',
                        onClick: handleUpload,
                        disabled: isUploading,
                        style: {
                            padding: '8px 24px',
                            backgroundColor: isUploading ? '#e4e4e4' : 'rgb(30, 41, 59)',
                            borderRadius: '50px',
                            border: 'none',
                            fontFamily: '"Inter-Bold", Helvetica',
                            fontWeight: '700',
                            fontSize: '15px',
                            color: isUploading ? '#1c1d21' : '#ffffff',
                            cursor: isUploading ? 'not-allowed' : 'pointer'
                        }
                    }, isUploading ? 'Uploading...' : 'Upload')
                )
            ),
            React.createElement('div', {
                    id: 'upload-file-list-outer-container',
                    style: { flex: 1, overflowY: 'auto', padding: '20px' }
                },
                selectedFiles.length === 0
                    ? React.createElement('div', { id: 'upload-empty-state-container', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '14px' } }, 'No files selected')
                    : React.createElement('div', { id: 'upload-file-list-inner-container' },
                        React.createElement('div', {
                                id: 'upload-table-header-row',
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(150px, 1fr) 80px 120px 150px 50px',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    borderBottom: '1px solid #e4e4e4',
                                    alignItems: 'center'
                                }
                            },
                            React.createElement('div', {
                                    id: 'upload-header-filename-cell',
                                    style: { display: 'flex', alignItems: 'center', gap: '8px', fontFamily: '"Inter-Medium", Helvetica', fontSize: '13px', color: '#666' }
                                },
                                React.createElement('input', {
                                    id: 'upload-select-all-checkbox',
                                    type: 'checkbox',
                                    ref: headerCheckboxRef,
                                    checked: selectedFiles.length > 0 && selectedFiles.every(f => checkedTempIDs.has(f.tempID)),
                                    onChange: () => {
                                        const allChecked = selectedFiles.every(f => checkedTempIDs.has(f.tempID));
                                        setCheckedTempIDs(allChecked ? new Set() : new Set(selectedFiles.map(f => f.tempID)));
                                    },
                                    style: { width: '18px', height: '18px', accentColor: 'rgb(30, 41, 59)', cursor: 'pointer' }
                                }),
                                React.createElement('span', { id: 'upload-header-filename-label' }, 'File Name')
                            ),
                            React.createElement('div', { id: 'upload-header-type-cell', style: { fontFamily: '"Inter-Medium", Helvetica', fontSize: '13px', color: '#666' } }, 'Type'),
                            React.createElement('div', { id: 'upload-header-duration-size-cell', style: { fontFamily: '"Inter-Medium", Helvetica', fontSize: '13px', color: '#666' } }, 'Duration/Size'),
                            React.createElement('div', { id: 'upload-header-date-cell', style: { fontFamily: '"Inter-Medium", Helvetica', fontSize: '13px', color: '#666' } }, 'Date Uploaded'),
                            React.createElement('div', { id: 'upload-header-actions-cell' })
                        ),
                        selectedFiles.map(file => {
                            const isChecked = checkedTempIDs.has(file.tempID);
                            const isEditing = editingFile === file.tempID;
                            const isMenuOpen = menuOpen === file.tempID;

                            return React.createElement('div', {
                                    id: `upload-file-row-${file.tempID}`,
                                    key: file.tempID,
                                    style: {
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(150px, 1fr) 80px 120px 150px 50px',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #f0f0f0',
                                        alignItems: 'center',
                                        backgroundColor: isEditing ? '#f9fafb' : 'transparent',
                                        transition: 'background-color 0.2s'
                                    },
                                    onMouseEnter: (e) => { if (!isEditing) e.currentTarget.style.backgroundColor = '#f5f5f5'; },
                                    onMouseLeave: (e) => { if (!isEditing) e.currentTarget.style.backgroundColor = 'transparent'; }
                                },
                                React.createElement('div', {
                                        id: `upload-filename-cell-${file.tempID}`,
                                        style: { display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }
                                    },
                                    !isEditing && React.createElement('input', {
                                        id: `upload-checkbox-${file.tempID}`,
                                        type: 'checkbox',
                                        checked: isChecked,
                                        onChange: () => toggleChecked(file.tempID),
                                        style: { width: '18px', height: '18px', accentColor: 'rgb(30, 41, 59)', flexShrink: 0 }
                                    }),
                                    React.createElement('div', {
                                            id: `upload-icon-container-${file.tempID}`,
                                            style: { width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
                                        },
                                        React.createElement('img', {
                                            id: `upload-icon-img-${file.tempID}`,
                                            src: file.isAudio ? './img/audio-icon.svg' : './img/document-icon.svg',
                                            style: { width: '18px', height: '18px' }
                                        })
                                    ),
                                    isEditing
                                        ? React.createElement('div', {
                                                ref: renameContainerRef,
                                                style: { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }
                                            },
                                            React.createElement('input', {
                                                id: `upload-rename-input-${file.tempID}`,
                                                type: 'text',
                                                value: editingFilename,
                                                onChange: (e) => setEditingFilename(e.target.value),
                                                onKeyDown: (e) => {
                                                    if (e.key === 'Enter') saveRename();
                                                    if (e.key === 'Escape') cancelRename();
                                                },
                                                onFocus: (e) => e.target.select(),
                                                onTouchStart: (e) => e.stopPropagation(),
                                                autoFocus: true,
                                                style: (() => {
                                                    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                                                    return {
                                                        flex: 1,
                                                        minWidth: '120px',
                                                        padding: isMobile ? '6px 8px' : '1px 8px',
                                                        fontSize: '13px',
                                                        fontFamily: '"Inter-Medium", Helvetica',
                                                        border: '1px solid rgb(30, 41, 59)',
                                                        borderRadius: '4px',
                                                        outline: 'none',
                                                        boxSizing: 'border-box'
                                                    };
                                                })()
                                            }),
                                            file.fileExt && React.createElement('span', {
                                                id: `upload-rename-extension-${file.tempID}`,
                                                style: { color: '#666', fontSize: '13px', whiteSpace: 'nowrap' }
                                            }, `.${file.fileExt}`),
                                            // Only show buttons on mobile, desktop uses Enter/Escape keys
                                            ('ontouchstart' in window || navigator.maxTouchPoints > 0) && React.createElement('button', {
                                                id: `upload-rename-save-button-${file.tempID}`,
                                                onClick: (e) => { e.stopPropagation(); saveRename(); },
                                                style: {
                                                    padding: '6px 12px',
                                                    minWidth: '36px',
                                                    minHeight: '36px',
                                                    backgroundColor: 'rgb(30, 41, 59)',
                                                    color: '#fff',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }
                                            }, '✓'),
                                            ('ontouchstart' in window || navigator.maxTouchPoints > 0) && React.createElement('button', {
                                                id: `upload-rename-cancel-button-${file.tempID}`,
                                                onClick: (e) => { e.stopPropagation(); cancelRename(); },
                                                style: {
                                                    padding: '6px 12px',
                                                    minWidth: '36px',
                                                    minHeight: '36px',
                                                    backgroundColor: '#e4e4e4',
                                                    color: '#666',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }
                                            }, '✕')
                                        )
                                        : React.createElement('div', {
                                            id: `upload-filename-text-${file.tempID}`,
                                            style: {
                                                flex: 1,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontSize: '13px',
                                                color: '#000'
                                            },
                                            title: file.originalName
                                        }, file.originalName)
                                ),
                                React.createElement('div', { id: `upload-type-cell-${file.tempID}`, style: { fontSize: '13px', color: isEditing ? '#999' : '#666' } }, file.fileExt ? file.fileExt.toLowerCase() : '-'),
                                React.createElement('div', { id: `upload-duration-size-cell-${file.tempID}`, style: { fontSize: '13px', color: isEditing ? '#999' : '#666' } }, file.isAudio && file.duration ? formatDuration(file.duration) : formatFileSize(file.fileSize)),
                                React.createElement('div', { id: `upload-date-cell-${file.tempID}`, style: { fontSize: '13px', color: isEditing ? '#999' : '#666' } }, formatDate(file.uploadDate)),
                                isEditing || !isChecked
                                    ? React.createElement('div', { id: `upload-menu-placeholder-${file.tempID}` })
                                    : React.createElement('div', { className: 'file-menu-container', id: `upload-menu-wrapper-${file.tempID}`, style: { position: 'relative', display: 'flex', justifyContent: 'center' } },
                                        React.createElement('button', {
                                                id: `upload-menu-toggle-button-${file.tempID}`,
                                                onClick: () => setMenuOpen(isMenuOpen ? null : file.tempID),
                                                style: {
                                                    width: '20px',
                                                    height: '20px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    backgroundColor: isMenuOpen ? '#e4e4e4' : 'transparent',
                                                    cursor: 'pointer'
                                                },
                                                onMouseEnter: (e) => { if (!isMenuOpen) e.currentTarget.style.backgroundColor = '#f0f0f0'; },
                                                onMouseLeave: (e) => { if (!isMenuOpen) e.currentTarget.style.backgroundColor = 'transparent'; }
                                            },
                                            React.createElement('img', { id: `upload-menu-icon-${file.tempID}`, src: './img/more_vert_24.svg', style: { width: '24px', height: '24px' } })
                                        ),
                                        isMenuOpen && React.createElement('div', {
                                                id: `upload-menu-dropdown-${file.tempID}`,
                                                style: {
                                                    position: 'absolute',
                                                    top: '35px',
                                                    right: '0',
                                                    width: '150px',
                                                    backgroundColor: '#ffffff',
                                                    border: '1px solid #e4e4e4',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                    zIndex: 1000,
                                                    overflow: 'hidden'
                                                }
                                            },
                                            React.createElement('button', {
                                                id: `upload-menu-download-button-${file.tempID}`,
                                                onClick: () => {
                                                    const url = URL.createObjectURL(file.file);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = file.originalName;
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                    setMenuOpen(null);
                                                },
                                                style: { width: '100%', padding: '10px 15px', textAlign: 'left', background: 'transparent', border: 'none', fontSize: '13px', color: '#000' },
                                                onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f5f5f5',
                                                onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent'
                                            }, 'Download'),
                                            React.createElement('button', {
                                                id: `upload-menu-rename-button-${file.tempID}`,
                                                onClick: () => startRename(file.tempID),
                                                style: { width: '100%', padding: '10px 15px', textAlign: 'left', background: 'transparent', border: 'none', fontSize: '13px', color: '#000' },
                                                onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f5f5f5',
                                                onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent'
                                            }, 'Rename'),
                                            React.createElement('button', {
                                                id: `upload-menu-delete-button-${file.tempID}`,
                                                onClick: () => handleDelete(file.tempID),
                                                style: { width: '100%', padding: '10px 15px', textAlign: 'left', background: 'transparent', border: 'none', fontSize: '13px', color: '#c1281e' },
                                                onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#fff5f5',
                                                onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent'
                                            }, 'Delete')
                                        )
                                    )
                            );
                        })
                    )
            )
        );
    };

    console.log('[FileUpload] FileUploadComponent exported successfully');
})();