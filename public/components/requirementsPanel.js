(function () {
    const { useState, useEffect } = React;

    /**
     * RequirementsPanel Component
     * A reusable pop-up panel for managing requirements and user stories
     * Based on Figma design with proper styling
     */
    const RequirementsPanel = ({ projectID, onClose }) => {
        const [mainTab, setMainTab] = useState('requirements');
        const [subTab, setSubTab] = useState('functional');
        const [requirements, setRequirements] = useState([]);
        const [reports, setReports] = useState([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState(null);

        useEffect(() => {
            if (projectID) {
                if (mainTab === 'requirements') {
                    fetchRequirements();
                } else {
                    fetchUserStories();
                }
                fetchReports();
            }
        }, [projectID, mainTab, subTab]);

        const fetchRequirements = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/project/requirements/fetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectID: projectID,
                        requirementType: subTab
                    })
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    setRequirements(data.requirements || []);
                } else {
                    setError(data.message || 'Failed to fetch requirements');
                }
            } catch (err) {
                console.error('Error fetching requirements:', err);
                // Don't show error for new projects or missing endpoints
                // Just show empty state instead
                setRequirements([]);
            } finally {
                setLoading(false);
            }
        };

        const fetchUserStories = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/project/stories/fetch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectID: projectID
                    })
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    setRequirements(data.stories || []);
                } else {
                    setError(data.message || 'Failed to fetch user stories');
                }
            } catch (err) {
                console.error('Error fetching user stories:', err);
                // Don't show error for new projects or missing endpoints
                // Just show empty state instead
                setRequirements([]);
            } finally {
                setLoading(false);
            }
        };

        const fetchReports = async () => {
            try {
                const response = await fetch('/api/project/report/list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectID: projectID })
                });

                const data = await response.json();
                if (response.ok && data.successful) {
                    setReports(data.reports || []);
                }
            } catch (err) {
                console.error('Error fetching reports:', err);
            }
        };

        const generateRequirementsReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/project/report/generate/requirements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectID: projectID,
                        requirementType: activeTab
                    })
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    await fetchReports();
                    alert('Requirements report generated successfully!');
                } else {
                    setError(data.message || 'Failed to generate requirements report');
                }
            } catch (err) {
                console.error('Error generating requirements report:', err);
                setError('An error occurred while generating the report');
            } finally {
                setLoading(false);
            }
        };

        const generateUserStoriesReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/project/report/generate/stories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectID: projectID })
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    await fetchReports();
                    alert('User stories report generated successfully!');
                } else {
                    setError(data.message || 'Failed to generate user stories report');
                }
            } catch (err) {
                console.error('Error generating user stories report:', err);
                setError('An error occurred while generating the report');
            } finally {
                setLoading(false);
            }
        };

        const downloadReport = async (reportID, reportName) => {
            try {
                const response = await fetch('/api/project/report/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectID: projectID,
                        reportID: reportID
                    })
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = reportName + '.docx';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    setError('Failed to download report');
                }
            } catch (err) {
                console.error('Error downloading report:', err);
                setError('An error occurred while downloading the report');
            }
        };

        const deleteReport = async (reportID) => {
            if (!confirm('Are you sure you want to delete this report?')) return;

            try {
                const response = await fetch('/api/project/report/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectID: projectID,
                        reportID: reportID
                    })
                });

                const data = await response.json();
                if (response.ok && data.successful) {
                    await fetchReports();
                    alert('Report deleted successfully!');
                } else {
                    setError(data.message || 'Failed to delete report');
                }
            } catch (err) {
                console.error('Error deleting report:', err);
                setError('An error occurred while deleting the report');
            }
        };

        const showRequirementsModal = (overrideTab = null) => {
            const currentTab = overrideTab || activeTab;
            
            const modal = document.createElement('div');
            modal.className = 'requirements-modal-overlay';
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
                z-index: 10002;
                padding: 20px;
            `;

            const modalContent = document.createElement('div');
            modalContent.className = 'requirement-list';
            modalContent.style.cssText = `
                position: relative;
                width: 666px;
                max-height: 90vh;
                flex-direction: column;
                border-radius: 20px;
                border: 1px solid #f0f0f080;
                display: flex;
                background-color: #f7f7f7;
                overflow: hidden;
            `;

            const header = document.createElement('header');
            header.className = 'header';
            header.style.cssText = `
                width: 100%;
                height: 140px;
                position: relative;
                background-color: #ffffff;
                overflow: visible;
                flex-shrink: 0;
            `;

            // Create close button
            const closeButton = document.createElement('div');
            closeButton.className = 'close-button';
            closeButton.style.cssText = `
                position: absolute;
                top: 8px;
                left: 8px;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #ffffff;
                border-radius: 10px;
                cursor: pointer;
                z-index: 10;
            `;
            closeButton.innerHTML = `
                <svg style="width: 24px; height: 24px;" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6L18 18M6 18L18 6" stroke="black" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `;

            // Create top tabs container (Functional / Non-Functional)
            const topTabsContainer = document.createElement('div');
            topTabsContainer.style.cssText = `
                position: absolute;
                top: 14px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 10px;
                z-index: 5;
            `;

            const functionalTab = document.createElement('div');
            functionalTab.className = 'tab-functional';
            functionalTab.style.cssText = `
                width: 161px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: ${currentTab === 'functional' ? '#e8e8ed' : '#ffffff'};
                border-radius: 20px;
                cursor: pointer;
                transition: background-color 0.2s;
                font-family: 'Inter', Helvetica;
                font-weight: 700;
                font-size: 12px;
                color: #1c1d21;
            `;
            functionalTab.textContent = 'Functional';

            const nonFunctionalTab = document.createElement('div');
            nonFunctionalTab.className = 'tab-non-functional';
            nonFunctionalTab.style.cssText = `
                width: 161px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: ${currentTab === 'non-functional' ? '#e8e8ed' : '#ffffff'};
                border-radius: 20px;
                cursor: pointer;
                transition: background-color 0.2s;
                font-family: 'Inter', Helvetica;
                font-weight: 700;
                font-size: 12px;
                color: #1c1d21;
            `;
            nonFunctionalTab.textContent = 'Non - Functional';

            topTabsContainer.appendChild(functionalTab);
            topTabsContainer.appendChild(nonFunctionalTab);

            // Create horizontal divider
            const divider = document.createElement('div');
            divider.style.cssText = `
                position: absolute;
                top: 58px;
                left: 0;
                width: 100%;
                height: 1px;
                background-color: #e4e4e4;
            `;

            // Create second row tabs (Voice Analysis, User Input, Document Analysis)
            const secondTabsContainer = document.createElement('div');
            secondTabsContainer.style.cssText = `
                position: absolute;
                top: 72px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 12px;
            `;

            const createSecondaryTab = (text) => {
                const tab = document.createElement('div');
                tab.style.cssText = `
                    height: 30px;
                    min-width: fit-content;
                    padding: 0 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: #f2f2f7;
                    border-radius: 20px;
                    cursor: pointer;
                    font-family: 'Inter', Helvetica;
                    font-weight: 600;
                    font-size: 11px;
                    color: #1c1d21;
                    transition: background-color 0.2s;
                    white-space: nowrap;
                `;
                tab.textContent = text;
                tab.onmouseenter = () => tab.style.backgroundColor = '#e8e8ed';
                tab.onmouseleave = () => tab.style.backgroundColor = '#f2f2f7';
                return tab;
            };

            secondTabsContainer.appendChild(createSecondaryTab('Voice Analysis'));
            secondTabsContainer.appendChild(createSecondaryTab('User Input'));
            secondTabsContainer.appendChild(createSecondaryTab('Document Analysis'));

            header.appendChild(closeButton);
            header.appendChild(topTabsContainer);
            header.appendChild(divider);
            header.appendChild(secondTabsContainer);

            header.appendChild(closeButton);
            header.appendChild(topTabsContainer);
            header.appendChild(divider);
            header.appendChild(secondTabsContainer);

            // Create Add button and content container wrapper
            const contentWrapper = document.createElement('div');
            contentWrapper.style.cssText = `
                display: flex;
                flex-direction: column;
                flex: 1;
                overflow: hidden;
                padding: 20px 25px;
                gap: 15px;
            `;

            // Add button
            const addButton = document.createElement('button');
            addButton.style.cssText = `
                width: 80px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                background-color: #ffffff;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                font-family: 'Inter', Helvetica;
                font-weight: 600;
                font-size: 12px;
                color: #1c1d21;
                transition: background-color 0.2s;
                flex-shrink: 0;
            `;
            addButton.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1V13M1 7H13" stroke="black" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>Add</span>
            `;
            addButton.onmouseenter = () => addButton.style.backgroundColor = '#f2f2f7';
            addButton.onmouseleave = () => addButton.style.backgroundColor = '#ffffff';

            // List container
            const listContainer = document.createElement('div');
            listContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 15px;
                overflow-y: auto;
                flex: 1;
                padding-right: 5px;
            `;

            if (requirements.length === 0) {
                listContainer.innerHTML = '<p style="color: #999; text-align: center; width: 100%; padding: 40px 0; font-family: Inter, Helvetica; font-size: 14px;">No requirements found.</p>';
            } else {
                requirements.forEach((req, index) => {
                    const reqCard = document.createElement('div');
                    reqCard.style.cssText = `
                        position: relative;
                        width: 100%;
                        min-height: 160px;
                        background-color: #ffffff;
                        border-radius: 20px;
                        padding: 20px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                    `;

                    const seqNum = req.details?.requirementSeq || (index + 1);
                    const reqType = currentTab === 'functional' ? 'FR' : 'NFR';
                    
                    // User header with refine button
                    const userHeader = document.createElement('div');
                    userHeader.style.cssText = `
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 15px;
                    `;
                    
                    const userInfo = document.createElement('div');
                    userInfo.style.cssText = `
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 8px 14px;
                        background-color: #f2f2f7;
                        border-radius: 20px;
                    `;
                    userInfo.innerHTML = `
                        <div style="width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 12px;">
                            ${req.createdBy ? req.createdBy.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span style="font-family: 'Inter', Helvetica; font-weight: 600; font-size: 13px; color: #1c1d21;">
                            ${req.createdBy || 'User'}
                        </span>
                    `;
                    
                    const refineButton = document.createElement('button');
                    refineButton.style.cssText = `
                        padding: 6px 14px;
                        background-color: #f2f2f7;
                        border: none;
                        border-radius: 20px;
                        cursor: pointer;
                        font-family: 'Inter', Helvetica;
                        font-weight: 600;
                        font-size: 11px;
                        color: #1c1d21;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        transition: background-color 0.2s;
                    `;
                    refineButton.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M6 1L7 5L11 6L7 7L6 11L5 7L1 6L5 5L6 1Z" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>Refine</span>
                    `;
                    refineButton.onmouseenter = () => refineButton.style.backgroundColor = '#e8e8ed';
                    refineButton.onmouseleave = () => refineButton.style.backgroundColor = '#f2f2f7';
                    
                    userHeader.appendChild(userInfo);
                    userHeader.appendChild(refineButton);
                    
                    // Transcribe text (if available from voice/audio)
                    const transcribeSection = document.createElement('div');
                    transcribeSection.style.cssText = `
                        margin-bottom: 12px;
                    `;
                    transcribeSection.innerHTML = `
                        <div style="font-family: 'Inter', Helvetica; font-size: 11px; color: #666; margin-bottom: 6px;">Transcribe Text:</div>
                        <div style="font-family: 'Inter', Helvetica; font-size: 12px; color: #333; line-height: 1.5;">
                            ${req.details?.transcribe || req.details?.description || 'No transcription available'}
                        </div>
                    `;
                    
                    // Pills container at bottom
                    const pillsContainer = document.createElement('div');
                    pillsContainer.style.cssText = `
                        display: flex;
                        gap: 8px;
                        flex-wrap: wrap;
                        margin-top: 15px;
                    `;
                    
                    const createPill = (text, bgColor = '#e4e4e4') => {
                        const pill = document.createElement('div');
                        pill.style.cssText = `
                            padding: 8px 16px;
                            background-color: ${bgColor};
                            border-radius: 50px;
                            font-family: 'Inter', Helvetica;
                            font-size: 11px;
                            font-weight: 500;
                            color: #1c1d21;
                            white-space: nowrap;
                        `;
                        pill.textContent = text;
                        return pill;
                    };
                    
                    pillsContainer.appendChild(createPill(`${reqType} - ${String(seqNum).padStart(2, '0')}`));
                    pillsContainer.appendChild(createPill(req.details?.title || 'User Creation'));
                    
                    // Add description pill if available
                    if (req.details?.description && req.details.description !== req.details?.transcribe) {
                        const descPill = createPill(
                            req.details.description.length > 60 
                                ? req.details.description.substring(0, 60) + '...' 
                                : req.details.description
                        );
                        descPill.style.flex = '1';
                        descPill.style.minWidth = '150px';
                        pillsContainer.appendChild(descPill);
                    }
                    
                    reqCard.appendChild(userHeader);
                    reqCard.appendChild(transcribeSection);
                    reqCard.appendChild(pillsContainer);
                    listContainer.appendChild(reqCard);
                });
            }

            contentWrapper.appendChild(addButton);
            contentWrapper.appendChild(listContainer);

            modalContent.appendChild(header);
            modalContent.appendChild(contentWrapper);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            // Close button handler
            closeButton.onclick = () => {
                document.body.removeChild(modal);
            };

            // Tab handlers - Pass tab value directly for immediate UI update
            functionalTab.onclick = () => {
                if (currentTab !== 'functional') {
                    // Close current modal
                    document.body.removeChild(modal);
                    // Update React state
                    setActiveTab('functional');
                    // Recreate modal immediately with new tab value
                    showRequirementsModal('functional');
                }
            };

            nonFunctionalTab.onclick = () => {
                if (currentTab !== 'non-functional') {
                    // Close current modal
                    document.body.removeChild(modal);
                    // Update React state
                    setActiveTab('non-functional');
                    // Recreate modal immediately with new tab value
                    showRequirementsModal('non-functional');
                }
            };

            // Hover effects
            functionalTab.onmouseenter = () => {
                if (currentTab !== 'functional') {
                    functionalTab.style.backgroundColor = '#f2f2f7';
                }
            };
            functionalTab.onmouseleave = () => {
                functionalTab.style.backgroundColor = currentTab === 'functional' ? '#e8e8ed' : '#ffffff';
            };

            nonFunctionalTab.onmouseenter = () => {
                if (currentTab !== 'non-functional') {
                    nonFunctionalTab.style.backgroundColor = '#f2f2f7';
                }
            };
            nonFunctionalTab.onmouseleave = () => {
                nonFunctionalTab.style.backgroundColor = currentTab === 'non-functional' ? '#e8e8ed' : '#ffffff';
            };

            // Close on overlay click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            };
        };

        return React.createElement('div', {
            id: 'requirements-panel-overlay',
            style: {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10001,
                padding: '20px'
            },
            onClick: (e) => {
                if (e.target.id === 'requirements-panel-overlay') {
                    onClose();
                }
            }
        },
            React.createElement('div', {
                id: 'requirements-panel-container',
                className: 'requirement-list',
                style: {
                    position: 'relative',
                    width: '666px',
                    maxWidth: '100%',
                    height: '90vh',
                    maxHeight: '90vh',
                    backgroundColor: '#f7f7f7',
                    borderRadius: '20px',
                    border: '1px solid #f0f0f080',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
                },
                onClick: (e) => e.stopPropagation()
            },
                // Header Section
                React.createElement('div', {
                    className: 'header',
                    style: {
                        width: '100%',
                        height: '140px',
                        position: 'relative',
                        backgroundColor: '#ffffff',
                        overflow: 'visible',
                        flexShrink: 0
                    }
                },
                    // Close button
                    React.createElement('div', {
                        onClick: onClose,
                        style: {
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            width: '44px',
                            height: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#ffffff',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            zIndex: 10
                        }
                    },
                        React.createElement('svg', {
                            style: { width: '24px', height: '24px' },
                            viewBox: '0 0 24 24',
                            fill: 'none'
                        },
                            React.createElement('path', {
                                d: 'M6 6L18 18M6 18L18 6',
                                stroke: 'black',
                                strokeWidth: '2',
                                strokeLinecap: 'round'
                            })
                        )
                    ),

                    // Top tabs (Requirements / User Stories)
                    React.createElement('div', {
                        style: {
                            position: 'absolute',
                            top: '14px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '10px',
                            zIndex: 5
                        }
                    },
                        React.createElement('button', {
                            onClick: () => setMainTab('requirements'),
                            style: {
                                width: '161px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: mainTab === 'requirements' ? '#e8e8ed' : '#ffffff',
                                border: 'none',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '700',
                                fontSize: '12px',
                                color: '#1c1d21'
                            },
                            onMouseEnter: (e) => {
                                if (mainTab !== 'requirements') {
                                    e.currentTarget.style.backgroundColor = '#f2f2f7';
                                }
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = mainTab === 'requirements' ? '#e8e8ed' : '#ffffff';
                            }
                        }, 'Requirements'),
                        React.createElement('button', {
                            onClick: () => setMainTab('user-stories'),
                            style: {
                                width: '161px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: mainTab === 'user-stories' ? '#e8e8ed' : '#ffffff',
                                border: 'none',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                fontFamily: 'Inter, Helvetica',
                                fontWeight: '700',
                                fontSize: '12px',
                                color: '#1c1d21'
                            },
                            onMouseEnter: (e) => {
                                if (mainTab !== 'user-stories') {
                                    e.currentTarget.style.backgroundColor = '#f2f2f7';
                                }
                            },
                            onMouseLeave: (e) => {
                                e.currentTarget.style.backgroundColor = mainTab === 'user-stories' ? '#e8e8ed' : '#ffffff';
                            }
                        }, 'User Stories')
                    ),

                    // Horizontal divider
                    mainTab === 'requirements' && React.createElement('div', {
                        style: {
                            position: 'absolute',
                            top: '58px',
                            left: 0,
                            width: '100%',
                            height: '1px',
                            backgroundColor: '#e4e4e4'
                        }
                    }),

                    // Sub-tabs (Functional / Non-Functional) - only show when Requirements is selected
                    mainTab === 'requirements' && React.createElement('div', {
                        style: {
                            position: 'absolute',
                            top: '72px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }
                    },
                        ['functional', 'non-functional'].map(tabName =>
                            React.createElement('button', {
                                key: tabName,
                                onClick: () => setSubTab(tabName),
                                style: {
                                    width: '161px',
                                    height: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: subTab === tabName ? '#e8e8ed' : '#ffffff',
                                    border: 'none',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontFamily: 'Inter, Helvetica',
                                    fontWeight: '600',
                                    fontSize: '11px',
                                    color: '#1c1d21',
                                    transition: 'background-color 0.2s'
                                },
                                onMouseEnter: (e) => {
                                    if (subTab !== tabName) {
                                        e.currentTarget.style.backgroundColor = '#f2f2f7';
                                    }
                                },
                                onMouseLeave: (e) => {
                                    e.currentTarget.style.backgroundColor = subTab === tabName ? '#e8e8ed' : '#ffffff';
                                }
                            }, tabName === 'functional' ? 'Functional' : 'Non - Functional')
                        )
                    )
                ),

                // Content wrapper
                React.createElement('div', {
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        overflow: 'hidden',
                        padding: '20px 25px',
                        gap: '15px'
                    }
                },
                    // List container
                    React.createElement('div', {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            overflowY: 'auto',
                            flex: 1,
                            paddingRight: '5px'
                        }
                    },
                        error && React.createElement('div', {
                            style: {
                                padding: '12px',
                                backgroundColor: '#fee',
                                color: '#c00',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontFamily: 'Inter, Helvetica'
                            }
                        }, error),

                        requirements.length === 0 
                            ? React.createElement('p', {
                                style: {
                                    color: '#999',
                                    textAlign: 'center',
                                    width: '100%',
                                    padding: '40px 0',
                                    fontFamily: 'Inter, Helvetica',
                                    fontSize: '14px'
                                }
                            }, mainTab === 'requirements' ? 'No requirements found.' : 'No user stories found.')
                            : requirements.map((req, index) => {
                                const seqNum = req.details?.requirementSeq || (index + 1);
                                const reqType = mainTab === 'requirements' 
                                    ? (subTab === 'functional' ? 'FR' : 'NFR')
                                    : 'US';
                                
                                return React.createElement('div', {
                                    key: req.requirementID || index,
                                    style: {
                                        position: 'relative',
                                        width: '100%',
                                        minHeight: '160px',
                                        backgroundColor: '#ffffff',
                                        borderRadius: '20px',
                                        padding: '20px',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
                                    }
                                },
                                    // User header with refine button
                                    React.createElement('div', {
                                        style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: '15px'
                                        }
                                    },
                                        // User info
                                        React.createElement('div', {
                                            style: {
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '8px 14px',
                                                backgroundColor: '#f2f2f7',
                                                borderRadius: '20px'
                                            }
                                        },
                                            React.createElement('div', {
                                                style: {
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontWeight: '700',
                                                    fontSize: '12px'
                                                }
                                            }, req.createdBy ? req.createdBy.charAt(0).toUpperCase() : 'U'),
                                            React.createElement('span', {
                                                style: {
                                                    fontFamily: 'Inter, Helvetica',
                                                    fontWeight: '600',
                                                    fontSize: '13px',
                                                    color: '#1c1d21'
                                                }
                                            }, req.createdBy || 'User')
                                        ),
                                        // Refine button
                                        React.createElement('button', {
                                            style: {
                                                padding: '6px 14px',
                                                backgroundColor: '#f2f2f7',
                                                border: 'none',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                                fontFamily: 'Inter, Helvetica',
                                                fontWeight: '600',
                                                fontSize: '11px',
                                                color: '#1c1d21',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'background-color 0.2s'
                                            },
                                            onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#e8e8ed',
                                            onMouseLeave: (e) => e.currentTarget.style.backgroundColor = '#f2f2f7'
                                        },
                                            React.createElement('svg', {
                                                width: '12',
                                                height: '12',
                                                viewBox: '0 0 12 12',
                                                fill: 'none'
                                            },
                                                React.createElement('path', {
                                                    d: 'M6 1L7 5L11 6L7 7L6 11L5 7L1 6L5 5L6 1Z',
                                                    stroke: 'black',
                                                    strokeWidth: '1.5',
                                                    strokeLinecap: 'round',
                                                    strokeLinejoin: 'round'
                                                })
                                            ),
                                            React.createElement('span', null, 'Refine')
                                        )
                                    ),
                                    // Transcribe text
                                    React.createElement('div', {
                                        style: {
                                            marginBottom: '12px'
                                        }
                                    },
                                        React.createElement('div', {
                                            style: {
                                                fontFamily: 'Inter, Helvetica',
                                                fontSize: '11px',
                                                color: '#666',
                                                marginBottom: '6px'
                                            }
                                        }, 'Transcribe Text:'),
                                        React.createElement('div', {
                                            style: {
                                                fontFamily: 'Inter, Helvetica',
                                                fontSize: '12px',
                                                color: '#333',
                                                lineHeight: '1.5'
                                            }
                                        }, req.details?.transcribe || req.details?.description || 'No transcription available')
                                    ),
                                    // Pills container
                                    React.createElement('div', {
                                        style: {
                                            display: 'flex',
                                            gap: '8px',
                                            flexWrap: 'wrap',
                                            marginTop: '15px'
                                        }
                                    },
                                        React.createElement('div', {
                                            style: {
                                                padding: '8px 16px',
                                                backgroundColor: '#e4e4e4',
                                                borderRadius: '50px',
                                                fontFamily: 'Inter, Helvetica',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                color: '#1c1d21',
                                                whiteSpace: 'nowrap'
                                            }
                                        }, `${reqType} - ${String(seqNum).padStart(2, '0')}`),
                                        React.createElement('div', {
                                            style: {
                                                padding: '8px 16px',
                                                backgroundColor: '#e4e4e4',
                                                borderRadius: '50px',
                                                fontFamily: 'Inter, Helvetica',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                color: '#1c1d21',
                                                whiteSpace: 'nowrap'
                                            }
                                        }, req.details?.title || 'User Creation'),
                                        req.details?.description && req.details.description !== req.details?.transcribe && React.createElement('div', {
                                            style: {
                                                padding: '8px 16px',
                                                backgroundColor: '#e4e4e4',
                                                borderRadius: '50px',
                                                fontFamily: 'Inter, Helvetica',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                color: '#1c1d21',
                                                flex: '1',
                                                minWidth: '150px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }
                                        }, req.details.description.length > 60 ? req.details.description.substring(0, 60) + '...' : req.details.description)
                                    )
                                );
                            })
                    )
                )
            )
        );
    };

    window.RequirementsPanel = RequirementsPanel;
})();
