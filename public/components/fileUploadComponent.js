
(function () {
    const { useState, useEffect } = React;

    console.log('[FileUpload] fileUploadComponent.js loading...');

    // Check if dependencies are loaded
    if (!window.DocumentUploadSection) {
        console.error('[FileUpload] ❌ DocumentUploadSection NOT loaded! Check script order in HTML.');
    } else {
        console.log('[FileUpload] ✅ DocumentUploadSection loaded');
    }

    if (!window.AudioUploadSection) {
        console.error('[FileUpload] ❌ AudioUploadSection NOT loaded! Check script order in HTML.');
    } else {
        console.log('[FileUpload] ✅ AudioUploadSection loaded');
    }

    // Main File Upload Component
    window.FileUploadComponent = ({ projectID, onClose, onFilesUploaded }) => {
        console.log('[FileUpload] Component rendered with projectID:', projectID);
        const [uploadStage, setUploadStage] = useState('initial'); // 'initial', 'mixed-choice', 'document', 'audio'
        const [selectedFiles, setSelectedFiles] = useState([]); // Files selected but not yet uploaded
        const [isUploading, setIsUploading] = useState(false);
        const [uploadedFilesList, setUploadedFilesList] = useState([]); // Track all uploaded files
        const [isDragging, setIsDragging] = useState(false); // Track drag state

        // Initial upload screen
        const renderInitialScreen = () => {
            const handleFileSelect = async (event) => {
                const files = event.target.files;
                if (!files || files.length === 0) return;

                const fileArray = Array.from(files);

                // Audio file extensions
                const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'];

                // Process files for preview (NOT uploading yet)
                const processedFilesList = [];

                for (const file of fileArray) {
                    // Check if this specific file is audio
                    const fileName = file.name.toLowerCase();
                    const isAudio = audioExtensions.some(ext => fileName.endsWith(ext));

                    // Extract extension (without dot)
                    const lastDotIndex = file.name.lastIndexOf('.');
                    const fileExt = lastDotIndex > 0 ? file.name.substring(lastDotIndex + 1) : '';

                    // Extract filename without extension
                    let fileNameWithoutExt = lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;

                    // Clean trailing dots (e.g., "file.." → "file")
                    fileNameWithoutExt = fileNameWithoutExt.replace(/\.+$/, '');

                    // Check if filename already ends with extension (e.g., "file.pdf.pdf" case)
                    if (fileExt && fileNameWithoutExt.toLowerCase().endsWith(`.${fileExt.toLowerCase()}`)) {
                        fileNameWithoutExt = fileNameWithoutExt.substring(0, fileNameWithoutExt.length - fileExt.length - 1);
                        fileNameWithoutExt = fileNameWithoutExt.replace(/\.+$/, '');
                    }

                    // Get audio duration if it's an audio file
                    let duration = null;
                    if (isAudio) {
                        duration = await getAudioDuration(file);
                    }

                    processedFilesList.push({
                        file: file, // Keep the actual File object for later upload
                        fileName: fileNameWithoutExt,
                        originalName: fileExt ? `${fileNameWithoutExt}.${fileExt}` : fileNameWithoutExt, // Only add extension if it exists
                        fileExt: fileExt,
                        fileSize: file.size,
                        uploadDate: new Date(),
                        isAudio: isAudio,
                        duration: duration,
                        tempID: Date.now() + '-' + Math.random() // Temporary ID before upload
                    });
                }

                // Add to existing selected files (for multi-batch selection)
                setSelectedFiles(prev => [...prev, ...processedFilesList]);

                // DON'T auto-route - stay on initial screen to show files
                console.log('[FileUpload] Files added to selection. Total:', selectedFiles.length + processedFilesList.length);
            };

            // Handle drag and drop
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

                    // Extract extension (without dot)
                    const lastDotIndex = file.name.lastIndexOf('.');
                    const fileExt = lastDotIndex > 0 ? file.name.substring(lastDotIndex + 1) : '';

                    // Extract filename without extension
                    let fileNameWithoutExt = lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;

                    // Clean trailing dots (e.g., "file.." → "file")
                    fileNameWithoutExt = fileNameWithoutExt.replace(/\.+$/, '');

                    // Check if filename already ends with extension (e.g., "file.pdf.pdf" case)
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
                        originalName: fileExt ? `${fileNameWithoutExt}.${fileExt}` : fileNameWithoutExt, // Only add extension if it exists
                        fileExt: fileExt,
                        fileSize: file.size,
                        uploadDate: new Date(),
                        isAudio: isAudio,
                        duration: duration,
                        tempID: Date.now() + '-' + Math.random()
                    });
                }

                setSelectedFiles(prev => [...prev, ...processedFilesList]);
                console.log('[FileUpload] Files dropped. Total:', selectedFiles.length + processedFilesList.length);
            };

            const handleNextClick = () => {
                // Determine which section to show based on selected files
                if (selectedFiles.length > 0) {
                    // Check if we have any audio files
                    const hasAudio = selectedFiles.some(f => f.isAudio);
                    // Check if we have any document files
                    const hasDocuments = selectedFiles.some(f => !f.isAudio);

                    console.log('[FileUpload] Navigating to section. Total files:', selectedFiles.length,
                                'Audio:', hasAudio, 'Documents:', hasDocuments);

                    // Route to appropriate section
                    if (hasAudio && hasDocuments) {
                        console.log('[FileUpload] Mixed file types detected. Showing choice screen.');
                        // Show mixed choice screen - let user choose which type first
                        setUploadStage('mixed-choice');
                    } else if (hasAudio) {
                        setUploadStage('audio');
                    } else {
                        setUploadStage('document');
                    }
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

            return React.createElement('div', {
                id: 'file-upload-initial-screen-container',
                'aria-label': 'File upload interface',
                style: {
                    width: '650px',
                    height: '422px',
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }
            },
                // Header
                React.createElement('div', {
                    id: 'file-upload-initial-header',
                    style: {
                        padding: '18px 17px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #e4e4e4'
                    }
                },
                    // Back button
                    React.createElement('button', {
                        id: 'file-upload-back-button',
                        'aria-label': 'Close file upload',
                        onClick: onClose,
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
                            id: 'file-upload-back-icon',
                            src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                            style: { width: '13px', height: '13px' },
                            alt: 'Back arrow'
                        })
                    ),
                    // Title
                    React.createElement('div', {
                        id: 'file-upload-title',
                        style: {
                            fontFamily: '"SF Pro-Bold", Helvetica',
                            fontWeight: '400',
                            fontSize: '18px',
                            color: '#000000',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '10px'
                        }
                    }, 'Import Files'),
                    // Next button
                    React.createElement('button', {
                        id: 'file-upload-initial-next-button',
                        'aria-label': 'Proceed to upload selected files',
                        onClick: handleNextClick,
                        disabled: selectedFiles.length === 0,
                        style: {
                            padding: '8px 24px',
                            backgroundColor: selectedFiles.length > 0 ? 'rgb(30, 41, 59)' : '#e4e4e4',
                            borderRadius: '50px',
                            border: 'none',
                            fontFamily: '"Inter-Bold", Helvetica',
                            fontWeight: '700',
                            fontSize: '15px',
                            color: selectedFiles.length > 0 ? '#ffffff' : '#1c1d21',
                            cursor: selectedFiles.length > 0 ? 'pointer' : 'not-allowed',
                            justifyContent: 'right',
                            marginLeft: 'auto'
                        }
                    }, 'Next'),
                    React.createElement('div', {
                        id: 'file-upload-header-spacer',
                        style: { width: '12px' }
                    })
                ),
                // Upload area
                React.createElement('div', {
                    id: 'file-upload-content-area',
                    style: {
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }
                },
                    // Show file list if files are selected, otherwise show upload prompt
                    selectedFiles.length > 0 ?
                        // File list view
                        React.createElement('div', {
                            id: 'file-upload-file-list-container',
                            style: {
                                width: '100%',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }
                        },
                            selectedFiles.map((file, index) =>
                                React.createElement('div', {
                                    key: file.tempID,
                                    style: {
                                        padding: '12px',
                                        backgroundColor: '#f5f5f5',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }
                                },
                                    // File icon
                                    React.createElement('div', {
                                        style: {
                                            width: '40px',
                                            height: '40px',
                                            backgroundColor: file.isAudio ? '#c3ab6f' : '#e4e4e4',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px'
                                        }
                                    }, file.isAudio ? '🎵' : '📄'),
                                    // File info
                                    React.createElement('div', {
                                        style: {
                                            flex: 1,
                                            overflow: 'hidden'
                                        }
                                    },
                                        React.createElement('div', {
                                            style: {
                                                fontFamily: '"Inter-Medium", Helvetica',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                color: '#000',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }
                                        }, file.originalName),
                                        React.createElement('div', {
                                            style: {
                                                fontFamily: '"Inter-Regular", Helvetica',
                                                fontSize: '11px',
                                                color: '#666',
                                                marginTop: '2px'
                                            }
                                        }, `${file.fileExt.toUpperCase()} • ${formatFileSize(file.fileSize)}`)
                                    ),
                                    // Remove button
                                    React.createElement('button', {
                                        onClick: () => {
                                            setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                        },
                                        style: {
                                            width: '24px',
                                            height: '24px',
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            cursor: 'pointer',
                                            fontSize: '18px',
                                            color: '#999',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        },
                                        onMouseEnter: (e) => e.currentTarget.style.color = '#c1281e',
                                        onMouseLeave: (e) => e.currentTarget.style.color = '#999'
                                    }, '×')
                                )
                            ),
                            // Add more files button - supports both click and drag-and-drop
                            React.createElement('button', {
                                id: 'file-upload-add-more-button',
                                'aria-label': 'Add more files to selection',
                                onClick: triggerFileInput,
                                onDragOver: (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.style.backgroundColor = '#e8f4f8';
                                    e.currentTarget.style.borderColor = 'rgb(51, 65, 85)';
                                    e.currentTarget.style.borderWidth = '3px';
                                },
                                onDragLeave: (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                    e.currentTarget.style.borderColor = 'rgb(30, 41, 59)';
                                    e.currentTarget.style.borderWidth = '2px';
                                },
                                onDrop: async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                    e.currentTarget.style.borderColor = 'rgb(30, 41, 59)';
                                    e.currentTarget.style.borderWidth = '2px';

                                    // Process dropped files
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

                                    setSelectedFiles(prev => [...prev, ...processedFilesList]);
                                    console.log('[FileUpload] Files dropped on Add More button. Total:', selectedFiles.length + processedFilesList.length);
                                },
                                style: {
                                    padding: '12px',
                                    backgroundColor: '#ffffff',
                                    border: '2px dashed rgb(30, 41, 59)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontFamily: '"Inter-Medium", Helvetica',
                                    fontSize: '13px',
                                    color: 'rgb(30, 41, 59)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                },
                                onMouseEnter: (e) => {
                                    e.currentTarget.style.backgroundColor = '#f0f4f8';
                                    e.currentTarget.style.borderColor = 'rgb(51, 65, 85)';
                                },
                                onMouseLeave: (e) => {
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                    e.currentTarget.style.borderColor = 'rgb(30, 41, 59)';
                                }
                            },
                                React.createElement('span', { style: { fontSize: '18px' } }, '+'),
                                'Add More Files'
                            )
                        )
                    :
                        // Upload prompt (empty state)
                        React.createElement('div', {
                            id: 'file-upload-prompt-container',
                            'aria-label': 'Click to select files for upload',
                            onClick: triggerFileInput,
                            onDragOver: handleDragOver,
                            onDragLeave: handleDragLeave,
                            onDrop: handleDrop,
                            style: {
                                width: '570px',
                                height: '290px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '20px',
                                backgroundColor: 'rgb(255, 255, 255)',
                                border: '1px solid rgb(0, 0, 0)',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: '0.2s'
                            }
                        },
                            React.createElement('div', {
                                id: 'file-upload-cloud-icon',
                                style: {
                                    width: '85px',
                                    height: '85px',
                                    backgroundColor: 'rgb(228, 228, 228)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '48px',
                                    pointerEvents: 'none'
                                }
                            }, '☁️'),
                            React.createElement('p', {
                                id: 'file-upload-prompt-text',
                                style: {
                                    fontFamily: '"SF Pro-Regular", Helvetica',
                                    fontWeight: '400',
                                    color: 'rgb(126, 126, 126)',
                                    fontSize: '20px',
                                    textAlign: 'center',
                                    margin: '0px',
                                    pointerEvents: 'none'
                                }
                            }, isDragging ? 'Drop files here' : 'Import Files for Analysis')
                        )
                )
            );
        };

        // Mixed file type choice screen
        const renderMixedChoiceScreen = () => {
            const documentFiles = selectedFiles.filter(f => !f.isAudio);
            const audioFiles = selectedFiles.filter(f => f.isAudio);

            return React.createElement('div', {
                id: 'mixed-choice-screen-container',
                'aria-label': 'Choose upload order screen',
                style: {
                    width: '650px',
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                }
            },
                // Header
                React.createElement('div', {
                    id: 'mixed-choice-header',
                    style: {
                        padding: '18px 17px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #e4e4e4'
                    }
                },
                    // Back button
                    React.createElement('button', {
                        id: 'mixed-choice-back-button',
                        'aria-label': 'Go back to file selection',
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
                            id: 'mixed-choice-back-icon',
                            src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                            style: { width: '13px', height: '13px' },
                            alt: 'Back arrow'
                        })
                    ),
                    // Title
                    React.createElement('div', {
                        id: 'mixed-choice-title',
                        style: {
                            fontFamily: '"SF Pro-Bold", Helvetica',
                            fontWeight: '400',
                            fontSize: '14px',
                            color: '#000000',
                            marginLeft: '10px'
                        }
                    }, 'Choose Upload Order'),
                    React.createElement('div', {
                        id: 'mixed-choice-header-spacer',
                        style: { width: '47px' }
                    })
                ),

                // Content - File type selection
                React.createElement('div', {
                    id: 'mixed-choice-content',
                    style: {
                        padding: '24px 30px 30px 30px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }
                },
                    // Info text
                    React.createElement('div', {
                        id: 'mixed-choice-info-text',
                        style: {
                            fontFamily: '"Inter-Regular", Helvetica',
                            fontSize: '14px',
                            color: '#666',
                            textAlign: 'center',
                            marginBottom: '10px'
                        }
                    }, 'You have selected both documents and audio files. Please choose which type to upload first:'),

                    // Document option
                    React.createElement('button', {
                        id: 'upload-order-documents-first-button',
                        'aria-label': `Upload ${documentFiles.length} document(s) first`,
                        onClick: () => setUploadStage('document'),
                        style: {
                            padding: '20px',
                            backgroundColor: '#f8f8f8',
                            border: '2px solid #e4e4e4',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s'
                        },
                        onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = '#f0f0f0';
                            e.currentTarget.style.borderColor = 'rgb(30, 41, 59)';
                        },
                        onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = '#f8f8f8';
                            e.currentTarget.style.borderColor = '#e4e4e4';
                        }
                    },
                        React.createElement('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px'
                            }
                        },
                            React.createElement('div', {
                                style: {
                                    width: '50px',
                                    height: '50px',
                                    backgroundColor: '#e4e4e4',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '30px'
                                }
                            }, '📄'),
                            React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: '5px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        fontFamily: '"Inter-Bold", Helvetica',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#000'
                                    }
                                }, 'Upload Documents First'),
                                React.createElement('div', {
                                    style: {
                                        fontFamily: '"Inter-Regular", Helvetica',
                                        fontSize: '13px',
                                        color: '#666'
                                    }
                                }, `${documentFiles.length} document(s) selected`)
                            )
                        ),
                        React.createElement('div', {
                            style: {
                                fontSize: '20px',
                                color: '#666'
                            }
                        }, '→')
                    ),

                    // Audio option
                    React.createElement('button', {
                        id: 'upload-order-audio-first-button',
                        'aria-label': `Upload ${audioFiles.length} audio file(s) first`,
                        onClick: () => setUploadStage('audio'),
                        style: {
                            padding: '20px',
                            backgroundColor: '#f8f8f8',
                            border: '2px solid #e4e4e4',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s'
                        },
                        onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = '#f0f0f0';
                            e.currentTarget.style.borderColor = 'rgb(30, 41, 59)';
                        },
                        onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = '#f8f8f8';
                            e.currentTarget.style.borderColor = '#e4e4e4';
                        }
                    },
                        React.createElement('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px'
                            }
                        },
                            React.createElement('div', {
                                style: {
                                    width: '50px',
                                    height: '50px',
                                    backgroundColor: '#c3ab6f',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '30px'
                                }
                            }, '🎵'),
                            React.createElement('div', {
                                style: {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: '5px'
                                }
                            },
                                React.createElement('div', {
                                    style: {
                                        fontFamily: '"Inter-Bold", Helvetica',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#000'
                                    }
                                }, 'Upload Audio First'),
                                React.createElement('div', {
                                    style: {
                                        fontFamily: '"Inter-Regular", Helvetica',
                                        fontSize: '13px',
                                        color: '#666'
                                    }
                                }, `${audioFiles.length} audio file(s) selected`)
                            )
                        ),
                        React.createElement('div', {
                            style: {
                                fontSize: '20px',
                                color: '#666'
                            }
                        }, '→')
                    ),

                    // Edit Selection button
                    React.createElement('button', {
                        id: 'mixed-choice-edit-selection-button',
                        'aria-label': 'Go back to edit file selection',
                        onClick: () => setUploadStage('initial'),
                        style: {
                            padding: '12px 20px',
                            backgroundColor: '#f5f5f5',
                            border: '2px solid #e4e4e4',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontFamily: '"Inter-Medium", Helvetica',
                            fontSize: '13px',
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        },
                        onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = '#ebebeb';
                            e.currentTarget.style.borderColor = '#d0d0d0';
                        },
                        onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                            e.currentTarget.style.borderColor = '#e4e4e4';
                        }
                    },
                        React.createElement('span', {
                            id: 'mixed-choice-edit-icon',
                            style: { fontSize: '16px' }
                        }, '✏️'),
                        'Edit Selection'
                    ),

                    // Info note
                    React.createElement('div', {
                        id: 'mixed-choice-info-note',
                        style: {
                            marginTop: '10px',
                            padding: '15px',
                            backgroundColor: '#f0f8ff',
                            border: '1px solid #d0e8ff',
                            borderRadius: '8px',
                            fontFamily: '"Inter-Regular", Helvetica',
                            fontSize: '12px',
                            color: '#0066cc',
                            textAlign: 'center'
                        }
                    }, 'After uploading the first type, you\'ll be able to upload the remaining files.')
                )
            );
        };

        // Format file size helper
        const formatFileSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        };

        // Get audio duration
        const getAudioDuration = (file) => {
            return new Promise((resolve) => {
                const audio = document.createElement('audio');
                audio.preload = 'metadata';
                audio.onloadedmetadata = function() {
                    window.URL.revokeObjectURL(audio.src);
                    const duration = Math.round(audio.duration);
                    resolve(duration);
                };
                audio.onerror = function() {
                    resolve(null);
                };
                audio.src = URL.createObjectURL(file);
            });
        };

        // Format date
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

        // Format duration
        const formatDuration = (seconds) => {
            if (!seconds) return 'N/A';
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            if (mins > 0) {
                return `${mins}m ${secs}s`;
            }
            return `${secs}s`;
        };

        // Render stage based on state
        if (uploadStage === 'initial') {
            return renderInitialScreen();
        } else if (uploadStage === 'mixed-choice') {
            return renderMixedChoiceScreen();
        } else if (uploadStage === 'document') {
            // Safety check for DocumentUploadSection
            if (!window.DocumentUploadSection) {
                console.error('[FileUpload] DocumentUploadSection is undefined!');
                return React.createElement('div', {
                    style: {
                        padding: '40px',
                        textAlign: 'center',
                        color: 'red'
                    }
                }, 'Error: DocumentUploadSection not loaded. Please refresh the page.');
            }

            return React.createElement(window.DocumentUploadSection, {
                files: selectedFiles,
                projectID: projectID,
                onClose: onClose,
                onReupload: () => setUploadStage('initial'),
                onNext: async (checkedFiles) => {
                    // Upload files (confirmation already shown in documentUploadSection)
                    console.log('[FileUpload] Uploading document files:', checkedFiles);
                    setIsUploading(true);

                    const newlyUploaded = [];
                    for (const fileData of checkedFiles) {
                        try {
                            const formData = new FormData();

                            // Create a new File object with the renamed filename
                            // This is necessary because File.name is read-only
                            const renamedFile = new File(
                                [fileData.file],
                                fileData.originalName, // Use the renamed filename
                                { type: fileData.file.type }
                            );

                            formData.append('file', renamedFile);
                            formData.append('projectID', projectID);

                            const response = await fetch('/api/project/file/upload', {
                                method: 'POST',
                                body: formData
                            });

                            const data = await response.json();

                            if (data.successful) {
                                newlyUploaded.push({
                                    ...fileData,
                                    documentID: data.documentID
                                });
                            }
                        } catch (error) {
                            console.error('Error uploading file:', error);
                            window.showNotification({
                                type: 'error',
                                title: 'Upload Failed',
                                message: `Failed to upload ${fileData.originalName}. Please try again.`,
                                actionText: 'OK'
                            });
                        }
                    }

                    setIsUploading(false);

                    // Add to uploaded files list
                    const allUploaded = [...uploadedFilesList, ...newlyUploaded];
                    setUploadedFilesList(allUploaded);

                    // Remove uploaded files from selectedFiles to prevent re-showing them
                    const uploadedTempIds = new Set(newlyUploaded.map(f => f.tempID));
                    const remainingFiles = selectedFiles.filter(f => !uploadedTempIds.has(f.tempID));
                    setSelectedFiles(remainingFiles);

                    // Check if there are audio files remaining (that haven't been uploaded)
                    const remainingAudioFiles = remainingFiles.filter(f => f.isAudio);

                    if (remainingAudioFiles.length > 0) {
                        console.log('[FileUpload] Documents uploaded. Now showing audio files:', remainingAudioFiles.length);

                        // Ask user if they want to continue with audio or skip
                        window.showNotification({
                            type: 'confirm',
                            title: 'Documents Uploaded!',
                            message: `${newlyUploaded.length} document(s) uploaded successfully!\n\nYou have ${remainingAudioFiles.length} audio file(s) remaining.\n\nWould you like to upload the audio files now?`,
                            actionText: 'Upload Audio'
                        }).then((uploadAudio) => {
                            if (uploadAudio) {
                                // User chose to continue with audio
                                setUploadStage('audio');
                            } else {
                                // User chose to skip audio files
                                console.log('[FileUpload] User skipped audio files');

                                // Show final success for documents only
                                if (onFilesUploaded) {
                                    onFilesUploaded(allUploaded);
                                }

                                window.showNotification({
                                    type: 'success',
                                    title: 'Upload Complete!',
                                    message: `${newlyUploaded.length} document(s) uploaded successfully.\n\n${remainingAudioFiles.length} audio file(s) were skipped.`,
                                    actionText: 'Done'
                                }).then(() => {
                                    onClose();
                                });
                            }
                        });
                    } else {
                        // All files uploaded - show notification first, then close
                        if (onFilesUploaded) {
                            onFilesUploaded(allUploaded);
                        }

                        window.showNotification({
                            type: 'success',
                            title: 'Upload Complete!',
                            message: `All ${allUploaded.length} file(s) have been uploaded successfully.`,
                            actionText: 'Done'
                        }).then(() => {
                            // Close modal AFTER user dismisses notification
                            onClose();
                        });
                    }
                },
                formatFileSize: formatFileSize,
                formatDate: formatDate,
                isUploading: isUploading
            });
        } else if (uploadStage === 'audio') {
            // Safety check
            if (!window.AudioUploadSection) {
                console.error('[FileUpload] ERROR: window.AudioUploadSection is undefined!');
                return React.createElement('div', {
                    style: {
                        padding: '20px',
                        color: 'red',
                        textAlign: 'center'
                    }
                }, 'Error: Audio upload section failed to load. Please refresh the page.');
            }

            return React.createElement(window.AudioUploadSection, {
                files: selectedFiles,
                projectID: projectID,
                onClose: onClose,
                onReupload: () => setUploadStage('initial'),
                onNext: async (checkedFiles) => {
                    // Upload files (confirmation already shown in audioUploadSection)
                    console.log('[FileUpload] Uploading audio files:', checkedFiles);
                    setIsUploading(true);

                    const newlyUploaded = [];
                    for (const fileData of checkedFiles) {
                        try {
                            const formData = new FormData();

                            // Create a new File object with the renamed filename
                            // This is necessary because File.name is read-only
                            const renamedFile = new File(
                                [fileData.file],
                                fileData.originalName, // Use the renamed filename
                                { type: fileData.file.type }
                            );

                            formData.append('file', renamedFile);
                            formData.append('projectID', projectID);

                            const response = await fetch('/api/project/file/upload', {
                                method: 'POST',
                                body: formData
                            });

                            const data = await response.json();

                            if (data.successful) {
                                newlyUploaded.push({
                                    ...fileData,
                                    documentID: data.documentID
                                });
                            }
                        } catch (error) {
                            console.error('Error uploading file:', error);
                            window.showNotification({
                                type: 'error',
                                title: 'Upload Failed',
                                message: `Failed to upload ${fileData.originalName}. Please try again.`,
                                actionText: 'OK'
                            });
                        }
                    }

                    setIsUploading(false);

                    // Add to uploaded files list
                    const allUploaded = [...uploadedFilesList, ...newlyUploaded];
                    setUploadedFilesList(allUploaded);

                    // Remove uploaded files from selectedFiles to prevent re-showing them
                    const uploadedTempIds = new Set(newlyUploaded.map(f => f.tempID));
                    const remainingFiles = selectedFiles.filter(f => !uploadedTempIds.has(f.tempID));
                    setSelectedFiles(remainingFiles);

                    // Check if there are document files remaining (that haven't been uploaded)
                    const remainingDocumentFiles = remainingFiles.filter(f => !f.isAudio);

                    if (remainingDocumentFiles.length > 0) {
                        console.log('[FileUpload] Audio files uploaded. Now showing document files:', remainingDocumentFiles.length);

                        // Ask user if they want to continue with documents or skip
                        window.showNotification({
                            type: 'confirm',
                            title: 'Audio Files Uploaded!',
                            message: `${newlyUploaded.length} audio file(s) uploaded successfully!\n\nYou have ${remainingDocumentFiles.length} document(s) remaining.\n\nWould you like to upload the documents now?`,
                            actionText: 'Upload Documents'
                        }).then((uploadDocs) => {
                            if (uploadDocs) {
                                // User chose to continue with documents
                                setUploadStage('document');
                            } else {
                                // User chose to skip documents
                                console.log('[FileUpload] User skipped document files');

                                // Show final success for audio only
                                if (onFilesUploaded) {
                                    onFilesUploaded(allUploaded);
                                }

                                window.showNotification({
                                    type: 'success',
                                    title: 'Upload Complete!',
                                    message: `${newlyUploaded.length} audio file(s) uploaded successfully.\n\n${remainingDocumentFiles.length} document(s) were skipped.`,
                                    actionText: 'Done'
                                }).then(() => {
                                    onClose();
                                });
                            }
                        });
                    } else {
                        // All files uploaded - show notification first, then close
                        if (onFilesUploaded) {
                            onFilesUploaded(allUploaded);
                        }

                        window.showNotification({
                            type: 'success',
                            title: 'Upload Complete!',
                            message: `All ${allUploaded.length} file(s) have been uploaded successfully.`,
                            actionText: 'Done'
                        }).then(() => {
                            // Close modal AFTER user dismisses notification
                            onClose();
                        });
                    }
                },
                formatFileSize: formatFileSize,
                formatDate: formatDate,
                formatDuration: formatDuration,
                isUploading: isUploading
            });
        }
    };

    console.log('[FileUpload] ============================================');
    console.log('[FileUpload] ✅ FileUploadComponent exported successfully');
    console.log('[FileUpload] Component type:', typeof window.FileUploadComponent);
    console.log('[FileUpload] Component available:', !!window.FileUploadComponent);
    console.log('[FileUpload] VERSION: 2.9 - SYNTAX ERRORS FIXED!');
    console.log('[FileUpload] ============================================');
})();


