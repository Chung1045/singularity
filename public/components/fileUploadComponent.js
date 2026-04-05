(function () {
    const { useState, useEffect, useRef } = React;
    console.log('[FileUpload] fileUploadComponent.js loading...');

    const uploadRenameCheckIcon = React.createElement('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        width: 12,
        height: 12,
        viewBox: '0 0 24 24',
        fill: 'currentColor',
        'aria-hidden': 'true',
        focusable: false
    }, React.createElement('path', {
        d: 'M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z'
    }));

    const uploadRenameCloseIcon = React.createElement('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        width: 12,
        height: 12,
        viewBox: '0 0 24 24',
        fill: 'currentColor',
        'aria-hidden': 'true',
        focusable: false
    }, React.createElement('path', {
        d: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
    }));

    window.FileUploadComponent = ({ projectID, onClose, onFilesUploaded}) => {
        console.log('[FileUpload] Component rendered with projectID:', projectID);
        const [uploadStage, setUploadStage] = useState('initial');
        const [selectedFiles, setSelectedFiles] = useState([]);
        const [isUploading, setIsUploading] = useState(false);
        const [isDragging, setIsDragging] = useState(false);
        const [checkedTempIDs, setCheckedTempIDs] = useState(new Set());
        const [menuOpen, setMenuOpen] = useState(null);
        const [menuFixedPos, setMenuFixedPos] = useState(null);
        const [editingFile, setEditingFile] = useState(null);
        const [editingFilename, setEditingFilename] = useState('');
        const headerCheckboxRef = useRef(null);
        const renameContainerRef = useRef(null);
        const uploadAbortController = useRef(null);

        // config check
        const [enforceTimeLimit, setEnforceTimeLimit] = useState(true);
        const [maxDurationMin, setMaxDuration] = useState(5);

        useEffect(() => {
            // Fetch both config values
            Promise.all([
                fetch('/api/status/ENFORCE_TRANSCRIPT_TIME_LIMIT').then(r => r.json()),
                fetch('/api/status/ENFORCE_TRANSCRIPT_TIME_LIMIT_MAX').then(r => r.json())
            ])
                .then(([limitConfig, maxConfig]) => {
                    const enforce = limitConfig.value === 1; // Backend returns 1 or 0, not boolean
                    const maxMin = maxConfig.value;

                    console.log(`✅ Config loaded: Enforce=${JSON.stringify(limitConfig)}, MaxDuration=${JSON.stringify(maxConfig)}`)

                    setEnforceTimeLimit(enforce);
                    setMaxDuration(maxMin);

                    // Fixed typo: maxDu -> maxMin
                    console.log(`✅ Config loaded: Enforce=${enforce}, MaxDuration=${maxMin} minutes`);
                })
                .catch(err => {
                    console.error('❌ Failed to load config:', err);
                    // Set defaults on error
                    setEnforceTimeLimit(true);
                    setMaxDuration(5);
                });
        }, []);

        const modalShellStyle = {
            width: '100%',
            maxWidth: 'min(650px, calc(100vw - 32px))',
            height: 'min(422px, calc(100vh - 32px))',
            maxHeight: 'min(422px, calc(100vh - 32px))',
            minHeight: '240px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        };

        const closeFileMenu = () => {
            setMenuOpen(null);
            setMenuFixedPos(null);
        };

        const toggleFileRowMenu = (tempID, anchorEl) => {
            if (menuOpen === tempID) {
                closeFileMenu();
                return;
            }
            const rect = anchorEl.getBoundingClientRect();
            const MENU_W = 150;
            const MENU_H = 92;
            const GAP = 6;
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const spaceBelow = vh - rect.bottom - GAP;
            const spaceAbove = rect.top - GAP;
            const openUpward = spaceBelow < MENU_H && spaceAbove > spaceBelow;
            let top = openUpward ? rect.top - MENU_H - GAP : rect.bottom + GAP;
            let left = rect.right - MENU_W;
            left = Math.max(GAP, Math.min(left, vw - MENU_W - GAP));
            top = Math.max(GAP, Math.min(top, vh - MENU_H - GAP));
            setMenuFixedPos({ top, left });
            setMenuOpen(tempID);
        };

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

        // Close menu when clicking outside (dropdown is fixed; match portal class too)
        useEffect(() => {
            const handleClickOutside = (event) => {
                if (menuOpen === null) return;
                if (event.target.closest('.file-menu-container') || event.target.closest('.upload-file-menu-dropdown-fixed')) {
                    return;
                }
                closeFileMenu();
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [menuOpen]);

        useEffect(() => {
            if (menuOpen === null) return;
            const dismiss = () => closeFileMenu();
            window.addEventListener('scroll', dismiss, true);
            window.addEventListener('resize', dismiss);
            return () => {
                window.removeEventListener('scroll', dismiss, true);
                window.removeEventListener('resize', dismiss);
            };
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
                }
            });
        };

        const startRename = (tempID) => {
            const file = selectedFiles.find(f => f.tempID === tempID);
            if (file) {
                setEditingFile(tempID);
                setEditingFilename(file.fileName);
                closeFileMenu();
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

        const getMediaDuration = (file) => {
            return new Promise((resolve, reject) => {

                console.log('File type:', file.type);
                console.log('Starts with audio?', file.type.startsWith("audio"));

                const media = document.createElement(
                    file.type.startsWith("video") ? "video" : "audio"
                );

                media.preload = "metadata";

                media.onloadedmetadata = () => {
                    if (!isFinite(media.duration)) {
                        reject(new Error("Invalid duration"));
                        return;
                    }

                    const duration = media.duration;
                    URL.revokeObjectURL(media.src);
                    resolve(duration);
                };

                media.onerror = (e) => {
                    console.error(`Failed to load: ${file.name}`, e);
                    URL.revokeObjectURL(media.src);
                    reject(new Error("Failed to load media metadata"));
                };

                media.src = URL.createObjectURL(file);
                console.log(`Loading metadata for: ${file.name}`);
            });
        };

        const handleUpload = async () => {

            const filesToUpload =
                selectedFiles.filter(f =>
                    checkedTempIDs.has(f.tempID)
                );

            if (filesToUpload.length === 0) {

                window.showNotification({
                    type: 'info',
                    title: 'No Files Selected',
                    message: 'Please select at least one file.',
                    actionText: 'OK'
                });

                return;
            }

            let uploadThese = filesToUpload;

            // ask whether to upload all files first
            const allChecked =
                filesToUpload.length === selectedFiles.length;

            if (!allChecked && selectedFiles.length > 1) {

                const uploadAll =
                    await window.showNotification({
                        type: 'confirm',
                        title: 'Upload Selection',
                        message:
                            `Upload all ${selectedFiles.length} files?`,
                        actionText: 'Upload All'
                    });

                if (uploadAll) {
                    uploadThese = [...selectedFiles];
                }
            }

            // Declare validFiles here, outside the if block
            let validFiles = uploadThese;

            if (enforceTimeLimit) {
                const tempValidFiles = [];
                const rejectedFiles = [];

                console.log('=== Starting Duration Check ===');
                console.log('Files to check:', uploadThese.map(f => f.originalName));

                for (const fileData of uploadThese) {
                    const file = fileData.file;

                    console.log(`\nChecking: ${fileData.originalName}, Type: ${file.type}`);

                    if (file.type.startsWith("audio") || file.type.startsWith("video")) {
                        try {
                            const duration = await getMediaDuration(file);

                            if (duration > maxDurationMin * 60) {
                                rejectedFiles.push({
                                    name: fileData.originalName,
                                    duration
                                });
                                continue;
                            }
                        }
                        catch (err) {
                            console.error(`ERROR reading duration:`, err);
                            rejectedFiles.push({
                                name: fileData.originalName,
                                duration: "unknown"
                            });
                            continue;
                        }
                    } else {
                        console.log(`Skipping (not audio/video)`);
                    }

                    tempValidFiles.push(fileData);
                }

                if (rejectedFiles.length > 0) {
                    const rejectedList = rejectedFiles
                        .map(f => {
                            const d = f.duration;

                            return `• ${f.name} (${
                                typeof d === "number"
                                    ? `${(d / 60).toFixed(0)}m ${(d % 60).toFixed(0)}s`
                                    : "unknown"
                            })`;
                        })
                        .join("\n");

                    await window.showNotification({
                        type: 'warning',
                        title: `${maxDurationMin} Minute Limit`,
                        message:
                            `These files exceed ${maxDurationMin} minutes and will not be uploaded:\n\n${rejectedList}`,
                        actionText: 'OK'
                    });
                }

                if (tempValidFiles.length === 0) {
                    return;
                }

                // Update validFiles with filtered results
                validFiles = tempValidFiles;
            }

            setIsUploading(true);

            uploadAbortController.current =
                new AbortController();

            const uploadedFiles = [];

            for (const fileData of validFiles) {

                try {
                    const formData = new FormData();
                    const renamedFile =
                        new File(
                            [fileData.file],
                            fileData.originalName,
                            {
                                type: fileData.file.type
                            }
                        );

                    formData.append('file', renamedFile);
                    formData.append('projectID', projectID);

                    const response = await fetch(
                        '/api/project/file/upload',
                        {
                            method: 'POST',
                            headers: {
                                'CSRF-Token':
                                window.csrfToken
                            },
                            body: formData,
                            signal:
                            uploadAbortController.current.signal
                        }
                    );

                    const data = await response.json();
                    if (data.successful) {
                        uploadedFiles.push({
                            ...fileData,
                            documentID:
                            data.documentID
                        });
                    }

                }
                catch (error) {
                    if (error.name === 'AbortError') {
                        break;
                    }
                    console.error(error);

                }
            }

            setIsUploading(false);
            uploadAbortController.current = null;

            if (onFilesUploaded) {
                onFilesUploaded(uploadedFiles);
            }

            window.showNotification({
                type: 'success',
                title: 'Upload Complete',
                message:
                    `${uploadedFiles.length} file(s) uploaded.`,
                actionText: 'Done'
            }).then(() => {
                onClose();
            });

        };

        const handleClose = async () => {
            if (isUploading) {
                const confirmCancel = await window.showNotification({
                    type: 'confirm',
                    title: 'Cancel Upload?',
                    message: 'Upload is in progress.\nAre you sure you want to cancel?',
                    actionText: 'Cancel Upload',
                    cancelText: 'Continue Upload'
                });

                if (!confirmCancel) return;

                // Abort the ongoing uploads
                if (uploadAbortController.current) {
                    uploadAbortController.current.abort();
                }
            }
            onClose();
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
                    style: modalShellStyle
                },
                React.createElement('div', { id: 'import-header-container', style: { padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', borderBottom: '1px solid #e4e4e4' } },
                    React.createElement('button', { id: 'import-back-button', onClick: handleClose, style: { width: '32px', height: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e4e4e4', borderRadius: '8px', backgroundColor: '#ffffff', cursor: 'pointer' } },
                        React.createElement('img', { id: 'import-back-icon', src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg', style: { width: '18px', height: '18px' } })
                    ),
                    React.createElement('div', { id: 'import-title-text', style: { fontFamily: '"SF Pro-Bold", Helvetica', fontWeight: '400', fontSize: '16px', color: '#000000', marginLeft: '6px', flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, 'Import Files'),
                    React.createElement('button', { id: 'import-next-button', onClick: handleNextClick, disabled: selectedFiles.length === 0, style: { padding: '8px 16px', flexShrink: 0, lineHeight: 1.25, backgroundColor: selectedFiles.length > 0 ? 'rgb(30, 41, 59)' : '#e4e4e4', borderRadius: '8px', border: 'none', fontFamily: '"Inter-SemiBold", "Inter-Bold", Helvetica', fontWeight: '400', fontSize: '14px', color: selectedFiles.length > 0 ? '#ffffff' : '#1c1d21', cursor: selectedFiles.length > 0 ? 'pointer' : 'not-allowed', marginLeft: 'auto' } }, 'Next')
                ),
                React.createElement('div', { id: 'import-content-container', style: { flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(12px, 4vw, 20px)' } },
                    selectedFiles.length > 0 ?
                        React.createElement('div', { id: 'import-file-list-container', style: { width: '100%', maxHeight: 'min(300px, calc(50vh - 100px))', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' } },
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
                                    onMouseEnter: (e) => {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f0f4f8';
                                        e.currentTarget.style.borderColor = isDark ? '#ffffff' : 'rgb(51, 65, 85)';
                                    },
                                    onMouseLeave: (e) => {
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        e.currentTarget.style.backgroundColor = isDark ? 'transparent' : '#ffffff';
                                        e.currentTarget.style.borderColor = isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgb(30, 41, 59)';
                                    },
                                    onDragOver: (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        e.currentTarget.style.backgroundColor = isDark ? '#111827' : '#e8f4f8';
                                        e.currentTarget.style.borderColor = isDark ? '#ffffff' : 'rgb(51, 65, 85)';
                                    },
                                    onDragLeave: (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                        e.currentTarget.style.backgroundColor = isDark ? 'transparent' : '#ffffff';
                                        e.currentTarget.style.borderColor = isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgb(30, 41, 59)';
                                    },
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
                            enforceTimeLimit && React.createElement('div', {
                                id: 'import-empty-title-text',
                                style: {
                                    fontFamily: '"Inter-Bold", Helvetica',
                                    fontSize: '16px',
                                    fontWeight: '400',
                                    color: '#000',
                                    textAlign: 'center'
                                }
                            }, `Maximum ${maxDurationMin} minutes of audio or video per file`)
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
                style: modalShellStyle
            },
            React.createElement('div', {
                    id: 'upload-header-container',
                    style: {
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        borderBottom: '1px solid #e4e4e4'
                    }
                },
                React.createElement('button', {
                        id: 'upload-back-button',
                        onClick: isUploading ? handleClose : () => setUploadStage('initial'),
                        style: {
                            width: '32px',
                            height: '32px',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #e4e4e4',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer'
                        }
                    },
                    React.createElement('img', {
                        id: 'upload-back-icon',
                        src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                        style: { width: '18px', height: '18px' }
                    })
                ),
                React.createElement('div', {
                    id: 'upload-title-text',
                    style: {
                        fontFamily: '"SF Pro-Bold", Helvetica',
                        fontWeight: '400',
                        fontSize: '16px',
                        color: '#000000',
                        marginLeft: '6px',
                        flex: '1 1 auto',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }
                }, 'Upload Files'),
                React.createElement('div', {
                        id: 'upload-header-buttons-container',
                        style: { display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexShrink: 0 }
                    },
                    React.createElement('button', {
                            id: 'upload-reupload-button',
                            onClick: () => setUploadStage('initial'),
                            disabled: isUploading,
                            style: {
                                padding: '8px 16px',
                                minHeight: '30px',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                border: '1px solid #e4e4e4',
                                fontFamily: '"Inter-Medium", Helvetica',
                                fontWeight: '500',
                                fontSize: '14px',
                                lineHeight: 1.2,
                                color: '#000',
                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            },
                            onMouseEnter: (e) => {
                                if (!isUploading) {
                                    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                    e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f5f5f5';
                                }
                            },
                            onMouseLeave: (e) => {
                                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                e.currentTarget.style.backgroundColor = isDark ? 'var(--dm-surface-2)' : '#ffffff';
                            }
                        },
                        React.createElement('img', {
                            id: 'upload-reupload-icon',
                            src: './img/reupload-icon.svg',
                            style: { width: '16px', height: '16px', flexShrink: 0, transform: 'rotate(180deg)' }
                        }),
                        React.createElement('span', { id: 'upload-reupload-text' }, 'Reupload')
                    ),
                    React.createElement('button', {
                        id: 'upload-submit-button',
                        onClick: handleUpload,
                        disabled: isUploading,
                        style: {
                            padding: '8px 16px',
                            minHeight: '30px',
                            lineHeight: 1.2,
                            backgroundColor: isUploading ? '#e4e4e4' : 'rgb(30, 41, 59)',
                            borderRadius: '8px',
                            border: 'none',
                            fontFamily: '"Inter-SemiBold", "Inter-Bold", Helvetica',
                            fontWeight: '600',
                            fontSize: '13px',
                            color: isUploading ? '#1c1d21' : '#ffffff',
                            cursor: isUploading ? 'not-allowed' : 'pointer'
                        }
                    }, isUploading ? 'Uploading...' : 'Upload')
                )
            ),
            React.createElement('div', {
                    id: 'upload-file-list-outer-container',
                    style: { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 'clamp(12px, 4vw, 20px)' }
                },
                selectedFiles.length === 0
                    ? React.createElement('div', { id: 'upload-empty-state-container', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '14px' } }, 'No files selected')
                    : React.createElement('div', { id: 'upload-file-list-inner-container', className: 'upload-file-table-wrapper' },
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
                            React.createElement('div', { id: 'upload-header-actions-cell', className: 'upload-file-row-actions' })
                        ),
                        selectedFiles.map(file => {
                            const isChecked = checkedTempIDs.has(file.tempID);
                            const isEditing = editingFile === file.tempID;
                            const isMenuOpen = menuOpen === file.tempID;

                            return React.createElement('div', {
                                    id: `upload-file-row-${file.tempID}`,
                                    key: file.tempID,
                                    'data-upload-row-editing': isEditing ? 'true' : 'false',
                                    style: {
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(150px, 1fr) 80px 120px 150px 50px',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #f0f0f0',
                                        alignItems: 'center',
                                        backgroundColor: isEditing
                                            ? (document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#f9fafb')
                                            : 'transparent',
                                        transition: 'background-color 0.2s'
                                    },
                                    onMouseEnter: (e) => {
                                        if (!isEditing) {
                                            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                            e.currentTarget.style.backgroundColor = isDark ? '#1f2937' : '#f5f5f5';
                                        }
                                    },
                                    onMouseLeave: (e) => { if (!isEditing) e.currentTarget.style.backgroundColor = 'transparent'; }
                                },
                                React.createElement('div', {
                                        id: `upload-filename-cell-${file.tempID}`,
                                        style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            minWidth: 0,
                                            overflowX: isEditing ? 'auto' : 'hidden',
                                            overflowY: 'hidden'
                                        }
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
                                                id: `upload-rename-controls-${file.tempID}`,
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    flex: '1 1 auto',
                                                    minWidth: 'min-content',
                                                    flexWrap: 'nowrap'
                                                }
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
                                                style: {
                                                    flex: '1 1 0%',
                                                    minWidth: '48px',
                                                    width: 0,
                                                    padding: '4px 8px',
                                                    minHeight: '26px',
                                                    fontSize: '13px',
                                                    fontFamily: '"Inter-Medium", Helvetica',
                                                    border: '1px solid rgb(30, 41, 59)',
                                                    borderRadius: '6px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }
                                            }),
                                            React.createElement('div', {
                                                id: `upload-rename-actions-${file.tempID}`,
                                                style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    flexShrink: 0
                                                }
                                            },
                                            React.createElement('button', {
                                                id: `upload-rename-save-button-${file.tempID}`,
                                                type: 'button',
                                                className: 'upload-rename-action-btn',
                                                'aria-label': 'Save name',
                                                title: 'Save (Enter)',
                                                onClick: (e) => { e.stopPropagation(); saveRename(); },
                                                style: {
                                                    width: '20px',
                                                    height: '20px',
                                                    padding: 0,
                                                    borderRadius: '6px',
                                                    lineHeight: 0,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'inherit'
                                                }
                                            }, uploadRenameCheckIcon),
                                            React.createElement('button', {
                                                id: `upload-rename-cancel-button-${file.tempID}`,
                                                type: 'button',
                                                className: 'upload-rename-action-btn',
                                                'aria-label': 'Cancel rename',
                                                title: 'Cancel (Escape)',
                                                onClick: (e) => { e.stopPropagation(); cancelRename(); },
                                                style: {
                                                    width: '20px',
                                                    height: '20px',
                                                    padding: 0,
                                                    borderRadius: '6px',
                                                    lineHeight: 0,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'inherit'
                                                }
                                            }, uploadRenameCloseIcon)
                                            )
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
                                React.createElement('div', {
                                    id: `upload-type-cell-${file.tempID}`,
                                    style: { fontSize: '13px', color: isEditing ? '#999' : '#666' }
                                }, file.fileExt ? file.fileExt.toLowerCase() : '-'),
                                React.createElement('div', {
                                    id: `upload-duration-size-cell-${file.tempID}`,
                                    style: { fontSize: '13px', color: isEditing ? '#999' : '#666' }
                                }, file.isAudio && file.duration ? formatDuration(file.duration) : formatFileSize(file.fileSize)),
                                React.createElement('div', {
                                    id: `upload-date-cell-${file.tempID}`,
                                    style: { fontSize: '13px', color: isEditing ? '#999' : '#666' }
                                }, formatDate(file.uploadDate)),
                                isEditing || !isChecked
                                    ? React.createElement('div', { id: `upload-menu-placeholder-${file.tempID}`, className: 'upload-file-row-actions' })
                                    : React.createElement('div', { className: 'file-menu-container upload-file-row-actions', id: `upload-menu-wrapper-${file.tempID}`, style: { position: 'relative', display: 'flex', justifyContent: 'center' } },
                                        React.createElement('button', {
                                                id: `upload-menu-toggle-button-${file.tempID}`,
                                                onClick: (e) => {
                                                    e.stopPropagation();
                                                    toggleFileRowMenu(file.tempID, e.currentTarget);
                                                },
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
                                                onMouseEnter: (e) => {
                                                    if (!isMenuOpen) {
                                                        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f0f0f0';
                                                    }
                                                },
                                                onMouseLeave: (e) => { if (!isMenuOpen) e.currentTarget.style.backgroundColor = 'transparent'; }
                                            },
                                            React.createElement('img', { id: `upload-menu-icon-${file.tempID}`, src: './img/more_vert_24.svg', style: { width: '24px', height: '24px' } })
                                        ),
                                        isMenuOpen && menuFixedPos && React.createElement('div', {
                                                id: `upload-menu-dropdown-${file.tempID}`,
                                                className: 'upload-file-menu-dropdown-fixed',
                                                style: {
                                                    position: 'fixed',
                                                    top: `${menuFixedPos.top}px`,
                                                    left: `${menuFixedPos.left}px`,
                                                    width: '150px',
                                                    backgroundColor: '#ffffff',
                                                    border: '1px solid #e4e4e4',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                    zIndex: 10050,
                                                    overflow: 'hidden'
                                                }
                                            },
                                            React.createElement('button', {
                                                id: `upload-menu-rename-button-${file.tempID}`,
                                                onClick: () => startRename(file.tempID),
                                                style: { width: '100%', padding: '10px 15px', textAlign: 'left', background: 'transparent', border: 'none', fontSize: '13px', color: '#000' },
                                                onMouseEnter: (e) => {
                                                    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                                    e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f5f5f5';
                                                },
                                                onMouseLeave: (e) => e.currentTarget.style.backgroundColor = 'transparent'
                                            }, 'Rename'),
                                            React.createElement('button', {
                                                id: `upload-menu-delete-button-${file.tempID}`,
                                                onClick: () => {
                                                    closeFileMenu();
                                                    handleDelete(file.tempID);
                                                },
                                                style: { width: '100%', padding: '10px 15px', textAlign: 'left', background: 'transparent', border: 'none', fontSize: '13px', color: '#c1281e' },
                                                onMouseEnter: (e) => {
                                                    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                                                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(127, 29, 29, 0.3)' : '#fff5f5';
                                                },
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

    const fileUploadResponsiveStyleEl = document.createElement('style');
    fileUploadResponsiveStyleEl.id = 'file-upload-component-responsive-styles';
    fileUploadResponsiveStyleEl.textContent = `
/* ≥641px: original table layout (no sticky column, no forced horizontal scroll) */
@media (min-width: 641px) {
    .upload-file-table-wrapper {
        overflow-x: visible;
        min-width: 0;
    }
    .upload-file-table-wrapper #upload-table-header-row .upload-file-row-actions,
    .upload-file-table-wrapper [id^='upload-file-row-'] .upload-file-row-actions {
        position: static;
        right: auto;
        z-index: auto;
        justify-self: stretch;
        min-width: unset;
        padding-left: 0;
        margin-left: 0;
        background-color: transparent;
        background-clip: border-box;
        box-shadow: none;
    }
}
/* ≤640px: scroll wide table + sticky ⋮ column */
@media (max-width: 640px) {
    .upload-file-table-wrapper {
        min-width: 0;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }
    .upload-file-table-wrapper #upload-table-header-row,
    .upload-file-table-wrapper [id^='upload-file-row-'] {
        min-width: 500px;
    }
    /* Keep ⋮ menu aligned to visible right edge — no need to scroll full width */
    .upload-file-table-wrapper #upload-table-header-row .upload-file-row-actions,
    .upload-file-table-wrapper [id^='upload-file-row-'] .upload-file-row-actions {
        position: sticky;
        right: 0;
        z-index: 4;
        justify-self: end;
        min-width: 44px;
        padding-left: 8px;
        margin-left: -8px;
        background-color: #ffffff;
        background-clip: padding-box;
        box-shadow: -8px 0 14px -6px rgba(0, 0, 0, 0.12);
    }
    html[data-theme='dark'] .upload-file-table-wrapper #upload-table-header-row .upload-file-row-actions,
    html[data-theme='dark'] .upload-file-table-wrapper [id^='upload-file-row-'] .upload-file-row-actions {
        background-color: var(--dm-surface);
        box-shadow: -8px 0 16px -6px rgba(0, 0, 0, 0.45);
    }
    .upload-file-table-wrapper [id^='upload-file-row-']:hover .upload-file-row-actions {
        background-color: #f5f5f5;
    }
    html[data-theme='dark'] .upload-file-table-wrapper [id^='upload-file-row-']:hover .upload-file-row-actions {
        background-color: var(--dm-surface-3);
    }
    .upload-file-table-wrapper [id^='upload-file-row-'][data-upload-row-editing='true'] .upload-file-row-actions,
    .upload-file-table-wrapper [id^='upload-file-row-'][data-upload-row-editing='true']:hover .upload-file-row-actions {
        background-color: #f9fafb;
    }
    html[data-theme='dark'] .upload-file-table-wrapper [id^='upload-file-row-'][data-upload-row-editing='true'] .upload-file-row-actions,
    html[data-theme='dark'] .upload-file-table-wrapper [id^='upload-file-row-'][data-upload-row-editing='true']:hover .upload-file-row-actions {
        background-color: #1e293b;
    }
}
@media (max-width: 540px) {
    #upload-header-container,
    #import-header-container {
        flex-wrap: wrap;
        row-gap: 8px;
        padding-left: 12px !important;
        padding-right: 12px !important;
    }
    #upload-header-buttons-container {
        margin-left: 0 !important;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 8px !important;
    }
    #upload-title-text,
    #import-title-text {
        font-size: 15px !important;
    }
    #upload-reupload-button,
    #upload-submit-button,
    #import-next-button {
        padding-top: 5px !important;
        padding-bottom: 5px !important;
    }
}
`;
    if (!document.getElementById('file-upload-component-responsive-styles')) {
        document.head.appendChild(fileUploadResponsiveStyleEl);
    }

    console.log('[FileUpload] FileUploadComponent exported successfully');
})();
