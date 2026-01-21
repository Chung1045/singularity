
(function () {
    const { useState, useEffect } = React;

    console.log('[FileUpload] audioUploadSection.js loaded');

    window.AudioUploadSection = ({ files, projectID, onClose, onReupload, onNext, formatFileSize, formatDate, formatDuration, isUploading }) => {
        console.log('[FileUpload] AudioUploadSection rendered with', files.length, 'files');
        console.log('[FileUpload] Files received:', files.map(f => ({ name: f.originalName, isAudio: f.isAudio, fileExt: f.fileExt })));

        // Filter to only show audio files
        const audioFiles = files.filter(f => f.isAudio);
        console.log('[FileUpload] Showing', audioFiles.length, 'audio files');

        const [fileList, setFileList] = useState(audioFiles);
        const [menuOpen, setMenuOpen] = useState(null); // Track which file's menu is open
        const [checkedFiles, setCheckedFiles] = useState({}); // Track which files are checked

        // Update fileList when files prop changes
        useEffect(() => {
            const newAudioFiles = files.filter(f => f.isAudio);
            console.log('[FileUpload] AudioUploadSection useEffect - updating fileList with', newAudioFiles.length, 'audio files');
            setFileList(newAudioFiles);

            // Reset checked files when file list changes
            if (newAudioFiles.length === 0) {
                setCheckedFiles({});
            }
        }, [files]);


        // Toggle checkbox for a file
        const toggleCheckbox = (index) => {
            setCheckedFiles(prev => ({
                ...prev,
                [index]: !prev[index]
            }));
        };

        // Check if any files are checked
        const hasCheckedFiles = Object.values(checkedFiles).some(checked => checked);

        // Handle Next button click
        const handleNext = async () => {
            // Get only checked files
            const selectedFiles = fileList.filter((file, index) => checkedFiles[index]);
            console.log('[FileUpload] Selected files for upload:', selectedFiles);

            if (selectedFiles.length === 0) {
                window.showNotification({
                    type: 'info',
                    title: 'No Files Selected',
                    message: 'Please select at least one file to upload by checking the checkbox next to it.',
                    actionText: 'OK'
                });
                return;
            }

            // If not all files are checked, show option to upload all
            const allFilesChecked = selectedFiles.length === fileList.length;

            if (!allFilesChecked && fileList.length > 1) {
                // Show custom dual-choice dialog
                const selectedList = selectedFiles.map(f => `• ${f.originalName}`).join('\n');
                const uncheckedFiles = fileList.filter((file, index) => !checkedFiles[index]);
                const uncheckedList = uncheckedFiles.map(f => `• ${f.originalName}`).join('\n');

                const uploadAll = await window.showNotification({
                    type: 'confirm',
                    title: 'Upload Selection',
                    message: `You have selected ${selectedFiles.length} of ${fileList.length} audio file(s).\n\n✅ Checked (${selectedFiles.length}):\n${selectedList}\n\n❌ Unchecked (${uncheckedFiles.length}):\n${uncheckedList}\n\nChoose:\n• Click "Upload All" to upload all ${fileList.length} files\n• Click "Cancel" to upload only the ${selectedFiles.length} checked file(s)`,
                    actionText: 'Upload All'
                });

                if (uploadAll) {
                    // User chose to upload all
                    console.log('[FileUpload] User chose to upload ALL audio files');
                    onNext(fileList);
                } else {
                    // User chose to upload only checked (clicked Cancel)
                    console.log('[FileUpload] User chose to upload only checked audio files');
                    onNext(selectedFiles);
                }
            } else {
                // All files checked, just upload them
                onNext(selectedFiles);
            }
        };

        // Close menu when clicking outside
        useEffect(() => {
            const handleClickOutside = (event) => {
                if (menuOpen !== null && !event.target.closest('.file-menu-container')) {
                    setMenuOpen(null);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, [menuOpen]);

        const handleRename = async (file, index) => {
            setMenuOpen(null);

            // Extract filename properly - use lastIndexOf to get the actual extension
            const originalName = file.originalName;
            const lastDotIndex = originalName.lastIndexOf('.');
            let nameWithoutExt = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
            const ext = file.fileExt;

            // Clean trailing dots from the name BEFORE showing in input
            nameWithoutExt = nameWithoutExt.replace(/\.+$/, '');

            // Use showNotification with input for rename (no icon)
            const newName = await window.showNotification({
                type: 'rename-input',
                title: 'File Rename',
                message: `Enter to rename current file: ${nameWithoutExt}.${ext}`,
                actionText: 'Confirm',
                showInput: true,
                inputValue: nameWithoutExt,
                inputPlaceholder: 'Input for new file name'
            });

            if (!newName || newName === nameWithoutExt) return;

            // Remove extension from newName if user accidentally included it
            let finalName = newName.trim();
            if (finalName.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
                finalName = finalName.slice(0, -(ext.length + 1));
            }

            // Remove any trailing dots from the filename
            finalName = finalName.replace(/\.+$/, '');

            // Update local state (just renaming in preview, not uploaded yet)
            const updatedList = [...fileList];
            updatedList[index] = {
                ...file,
                fileName: finalName,
                originalName: ext ? `${finalName}.${ext}` : finalName  // Only add extension if it exists
            };
            setFileList(updatedList);
        };

        const handleDownload = async (file, index) => {
            setMenuOpen(null);

            try {
                // Create a download link for the file
                const url = URL.createObjectURL(file.file);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.originalName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Download error:', error);
                await window.showNotification({
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to download file',
                    actionText: 'OK'
                });
            }
        };

        const handleDelete = async (file, index) => {
            setMenuOpen(null);

            // Use light theme warning confirmation
            const confirmed = await window.showNotification({
                type: 'warning',
                title: 'Warning',
                message: `Are you sure you want to delete "${file.originalName}"?`,
                actionText: 'Confirm'
            });

            if (!confirmed) return;

            // Remove from local state (just preview, not uploaded yet)
            const updatedList = fileList.filter((_, i) => i !== index);
            setFileList(updatedList);

            // Also remove from checked files
            const updatedChecked = { ...checkedFiles };
            delete updatedChecked[index];
            // Reindex checked files
            const reindexedChecked = {};
            Object.keys(updatedChecked).forEach(key => {
                const keyNum = parseInt(key);
                if (keyNum > index) {
                    reindexedChecked[keyNum - 1] = updatedChecked[key];
                } else {
                    reindexedChecked[key] = updatedChecked[key];
                }
            });
            setCheckedFiles(reindexedChecked);
        };


        return React.createElement('div', {
            id: 'audio-upload-section-container',
            'aria-label': 'Audio upload section',
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
                id: 'audio-upload-header',
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
                    id: 'audio-upload-back-button',
                    'aria-label': 'Go back to file selection',
                    onClick: onReupload,
                    style: {
                        width: '35px',
                        height: '35px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #878787',
                        borderRadius: '10px',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer'
                    }
                },
                    React.createElement('img', {
                        id: 'audio-upload-back-icon',
                        src: './img/arrow_back_48dp_1F1F1F_FILL0_wght400_GRAD0_opsz48 1.svg',
                        style: { width: '13px', height: '13px' },
                        alt: 'Back arrow'
                    })
                ),
                // Title
                React.createElement('div', {
                    id: 'audio-upload-title',
                    style: {
                        fontFamily: '"SF Pro-Bold", Helvetica',
                        fontWeight: '700',
                        fontSize: '18px',
                        color: '#000000',
                        flex: 1,
                        marginLeft: '10px'
                    }
                }, 'Import Audio'),
                // Reupload button
                React.createElement('button', {
                    id: 'audio-upload-reupload-button',
                    'aria-label': 'Reupload different audio files',
                    onClick: onReupload,
                    style: {
                        padding: '8px 24px',
                        backgroundColor: 'var(--background)',
                        borderRadius: '50px',
                        border: 'none',
                        fontFamily: '"Inter-Bold", Helvetica',
                        fontWeight: '700',
                        fontSize: '12px',
                        color: '#1c1d21',
                        cursor: 'pointer',
                        marginRight: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }
                },
                    React.createElement('span', {
                        id: 'audio-upload-reupload-icon',
                        'aria-hidden': 'true'
                    }, '↻'),
                    'Reupload'
                ),
                // Next button
                React.createElement('button', {
                    id: 'audio-upload-next-button',
                    'aria-label': isUploading ? 'Uploading files' : 'Upload selected audio files',
                    onClick: handleNext,
                    disabled: !hasCheckedFiles || isUploading,
                    style: {
                        padding: '8px 24px',
                        backgroundColor: hasCheckedFiles && !isUploading ? 'rgb(30, 41, 59)' : '#e4e4e4',
                        borderRadius: '50px',
                        border: 'none',
                        fontFamily: '"Inter-Bold", Helvetica',
                        fontWeight: '700',
                        fontSize: '15px',
                        color: hasCheckedFiles && !isUploading ? '#ffffff' : '#1c1d21',
                        cursor: hasCheckedFiles && !isUploading ? 'pointer' : 'not-allowed'
                    }
                }, isUploading ? 'Uploading...' : 'Next'),
                React.createElement('div', {
                    id: 'audio-upload-header-spacer',
                    style: { width: '12px' }
                })
            ),

            // Table header
            React.createElement('div', {
                id: 'audio-upload-table-header',
                style: {
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    borderBottom: '1px solid #e4e4e4',
                    marginTop: '10px',
                    height: '45px'
                }
            },
                // Checkbox icon placeholder
                React.createElement('div', {
                    id: 'audio-upload-header-checkbox-placeholder',
                    style: { width: '13px', height: '13px', flexShrink: 0 }
                }),
                // File icon placeholder
                React.createElement('div', {
                    id: 'audio-upload-header-icon-placeholder',
                    style: { width: '11px', height: '13px', flexShrink: 0 }
                }),
                // File Name header
                React.createElement('div', {
                    id: 'audio-upload-header-filename',
                    style: {
                        flex: '1 1 140px',
                        minWidth: '100px',
                        fontFamily: '"Inter-Regular", Helvetica',
                        fontSize: '13px',
                        color: 'var(--text)',
                        fontWeight: '500'
                    }
                }, 'File Name'),
                // Type header
                React.createElement('div', {
                    id: 'audio-upload-header-type',
                    style: {
                        width: '60px',
                        flexShrink: 0,
                        fontFamily: '"Inter-Regular", Helvetica',
                        fontSize: '13px',
                        color: 'var(--text)',
                        textAlign: 'center',
                        fontWeight: '500'
                    }
                }, 'Type'),
                // Duration header
                React.createElement('div', {
                    id: 'audio-upload-header-duration',
                    style: {
                        width: '90px',
                        flexShrink: 0,
                        fontFamily: '"Inter-Regular", Helvetica',
                        fontSize: '13px',
                        color: 'var(--text)',
                        textAlign: 'center',
                        fontWeight: '500'
                    }
                }, 'Duration'),
                // Date Uploaded header
                React.createElement('div', {
                    id: 'audio-upload-header-date',
                    style: {
                        width: '160px',
                        flexShrink: 0,
                        fontFamily: '"Inter-Regular", Helvetica',
                        fontSize: '13px',
                        color: 'var(--text)',
                        fontWeight: '500'
                    }
                }, 'Date Uploaded'),
                // More options placeholder
                React.createElement('div', {
                    id: 'audio-upload-header-menu-placeholder',
                    style: { width: '24px', height: '24px', flexShrink: 0 }
                })
            ),

            // Separator line
            React.createElement('div', {
                id: 'audio-upload-header-separator',
                style: {
                    height: '1px',
                    backgroundColor: '#e4e4e4',
                    margin: '0 19px'
                }
            }),

            // Files list
            React.createElement('div', {
                id: 'audio-upload-files-list',
                style: {
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0 15px'
                }
            },
                fileList.length === 0 ?
                    React.createElement('div', {
                        id: 'audio-upload-empty-state',
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: '#999',
                            fontSize: '14px',
                            fontFamily: '"Inter-Regular", Helvetica'
                        }
                    }, 'No audio files uploaded') :
                fileList.map((file, index) =>
                    React.createElement('div', {
                        key: file.tempID || file.documentID || index,
                        id: `audio-upload-file-row-${index}`,
                        'data-file-id': file.tempID || file.documentID,
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            minHeight: '45px',
                            height: '45px'
                        },
                        onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                        },
                        onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }
                    },
                        // Checkbox
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: checkedFiles[index] || false,
                            onChange: (e) => {
                                e.stopPropagation();
                                toggleCheckbox(index);
                            },
                            onClick: (e) => {
                                e.stopPropagation();
                            },
                            style: {
                                width: '13px',
                                height: '13px',
                                cursor: 'pointer',
                                flexShrink: 0
                            }
                        }),
                        // File icon (placeholder - audio icon)
                        React.createElement('div', {
                            style: {
                                width: '11px',
                                height: '13px',
                                backgroundColor: '#c3ab6f',
                                borderRadius: '2px',
                                position: 'relative',
                                flexShrink: 0
                            }
                        },
                            React.createElement('div', {
                                style: {
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '0',
                                    height: '0',
                                    borderLeft: '4px solid #fff',
                                    borderTop: '3px solid transparent',
                                    borderBottom: '3px solid transparent'
                                }
                            })
                        ),
                        // ...existing code...
                        // File Name
                        React.createElement('div', {
                            style: {
                                flex: '1 1 140px',
                                minWidth: '100px',
                                fontFamily: '"Inter-Regular", Helvetica',
                                fontSize: '13px',
                                color: 'var(--text)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }
                        }, file.originalName),
                        // ...existing code...
                        // Type
                        React.createElement('div', {
                            style: {
                                width: '60px',
                                flexShrink: 0,
                                fontFamily: '"Inter-Regular", Helvetica',
                                fontSize: '13px',
                                color: 'var(--text)',
                                textAlign: 'center'
                            }
                        }, file.fileExt),
                        // ...existing code...
                        // Duration
                        React.createElement('div', {
                            style: {
                                width: '90px',
                                flexShrink: 0,
                                fontFamily: '"Inter-Regular", Helvetica',
                                fontSize: '13px',
                                color: 'var(--text)',
                                textAlign: 'center'
                            }
                        }, formatDuration(file.duration)),
                        // ...existing code...
                        // Date Uploaded
                        React.createElement('div', {
                            style: {
                                width: '160px',
                                flexShrink: 0,
                                fontFamily: '"Inter-Regular", Helvetica',
                                fontSize: '13px',
                                color: 'var(--text)'
                            }
                        }, formatDate(file.uploadDate)),
                        // More options button - only show if checkbox is checked, else show placeholder
                        checkedFiles[index] ?
                            React.createElement('div', {
                                className: 'file-menu-container',
                                style: {
                                    position: 'relative',
                                    width: '24px',
                                    height: '24px',
                                    flexShrink: 0
                                }
                            },
                                React.createElement('button', {
                                    onClick: (e) => {
                                        e.stopPropagation();
                                        setMenuOpen(menuOpen === index ? null : index);
                                    },
                                    style: {
                                        width: '24px',
                                        height: '24px',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        cursor: 'pointer',
                                        fontSize: '18px',
                                        color: '#666',
                                        padding: 0
                                    }
                                }, '⋮'),
                                menuOpen === index && React.createElement('div', {
                                    style: {
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '4px',
                                        backgroundColor: '#ffffff',
                                        border: '1.67px solid #e4e4e4',
                                        borderRadius: '11.12px',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        minWidth: '120px',
                                        zIndex: 1000,
                                        overflow: 'hidden'
                                    }
                                },
                                    React.createElement('button', {
                                        style: {
                                            width: '100%',
                                            padding: '12px 14.5px',
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '13.3px',
                                            color: '#000',
                                            fontWeight: '500',
                                            fontFamily: '"Inter", Helvetica',
                                            transition: 'background-color 0.2s ease'
                                        },
                                        onMouseEnter: (e) => {
                                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                                        },
                                        onMouseLeave: (e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        },
                                        onClick: (e) => {
                                            e.stopPropagation();
                                            handleRename(file, index);
                                        }
                                    }, 'Rename'),
                                    React.createElement('button', {
                                        style: {
                                            width: '100%',
                                            padding: '12px 14.5px',
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '13.3px',
                                            color: '#000',
                                            fontWeight: '500',
                                            fontFamily: '"Inter", Helvetica',
                                            transition: 'background-color 0.2s ease'
                                        },
                                        onMouseEnter: (e) => {
                                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                                        },
                                        onMouseLeave: (e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        },
                                        onClick: (e) => {
                                            e.stopPropagation();
                                            handleDownload(file, index);
                                        }
                                    }, 'Download'),
                                    React.createElement('button', {
                                        style: {
                                            width: '100%',
                                            padding: '12px 14.5px',
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '13.3px',
                                            color: '#c1281e',
                                            fontWeight: '500',
                                            fontFamily: '"Inter", Helvetica',
                                            transition: 'background-color 0.2s ease'
                                        },
                                        onMouseEnter: (e) => {
                                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                                        },
                                        onMouseLeave: (e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        },
                                        onClick: (e) => {
                                            e.stopPropagation();
                                            handleDelete(file, index);
                                        }
                                    }, 'Delete')
                                )
                            ) :
                            // Placeholder when checkbox not checked to maintain alignment
                            React.createElement('div', {
                                style: {
                                    width: '24px',
                                    height: '24px',
                                    flexShrink: 0
                                }
                            })
                    ) // Closes React.createElement for file row div
                ) // Closes fileList.map
            ) // Closes React.createElement for files list container
        ); // Closes return statement for component
    };

    console.log('[FileUpload] AudioUploadSection exported:', typeof window.AudioUploadSection);
})();

