/**
 * ReportService - API calls for report functionality
 */

const ReportService = {
    /**
     * Generate user stories report
     * @param {string} projectID
     */
    async generateUserStories(projectID) {
        projectID = projectID || window.getCurrentProjectID?.();

        if (!projectID) {
            window.showNotification?.({
                type: 'error',
                title: 'No Project',
                message: 'Please select a project first.',
                actionText: 'OK'
            });
            return;
        }

        try {
            const response = await fetch('/api/agent/document-generation/user-stories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': window.csrfToken
                },
                body: JSON.stringify({ projectID })
            });

            if (response.ok) {
                window.fetchProjectReports?.(projectID);
                window.showNotification?.({
                    type: 'success',
                    title: 'Report Generated',
                    message: 'User Stories report has been generated successfully.',
                    actionText: 'OK'
                });
            } else {
                const errorData = await response.json();
                window.showNotification?.({
                    type: 'error',
                    title: 'Generation Failed',
                    message: errorData.message || 'Failed to generate User Stories report.',
                    actionText: 'OK'
                });
            }
        } catch (error) {
            console.error('Error generating User Stories report:', error);
            window.showNotification?.({
                type: 'error',
                title: 'Error',
                message: 'An error occurred while generating the report.',
                actionText: 'OK'
            });
        }
    },

    /**
     * Generate requirements report
     * @param {string} projectID
     */
    async generateRequirements(projectID) {
        projectID = projectID || window.getCurrentProjectID?.();

        if (!projectID) {
            window.showNotification?.({
                type: 'error',
                title: 'No Project',
                message: 'Please select a project first.',
                actionText: 'OK'
            });
            return;
        }

        try {
            const response = await fetch('/api/agent/document-generation/requirements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': window.csrfToken
                },
                body: JSON.stringify({ projectID })
            });

            if (response.ok) {
                window.fetchProjectReports?.(projectID);
                window.showNotification?.({
                    type: 'success',
                    title: 'Report Generated',
                    message: 'Requirements report has been generated successfully.',
                    actionText: 'OK'
                });
            } else {
                const errorData = await response.json();
                window.showNotification?.({
                    type: 'error',
                    title: 'Generation Failed',
                    message: errorData.message || 'Failed to generate Requirements report.',
                    actionText: 'OK'
                });
            }
        } catch (error) {
            console.error('Error generating Requirements report:', error);
            window.showNotification?.({
                type: 'error',
                title: 'Error',
                message: 'An error occurred while generating the report.',
                actionText: 'OK'
            });
        }
    },

    /**
     * Download report by ID
     * @param {string} projectID
     * @param {string} reportID
     */
    async download(projectID, reportID) {
        try {
            const response = await fetch('/api/project/report/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': window.csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({ projectID, reportID })
            });

            if (response.ok) {
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = 'report.docx';

                if (contentDisposition) {
                    const match = contentDisposition.match(/filename="(.+)"/);
                    if (match) filename = match[1];
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const errorData = await response.json();
                console.error('Download failed:', errorData.message);
            }
        } catch (error) {
            console.error('Error downloading report:', error);
        }
    },

    /**
     * Find and download report by file name
     * @param {string} fileName
     */
    async downloadByName(fileName) {
        const projectID = window.getCurrentProjectID?.();
        if (!projectID) {
            console.error('No project selected');
            return;
        }

        try {
            const response = await fetch('/api/project/report/list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': window.csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({ projectID })
            });

            if (!response.ok) {
                console.error('Failed to fetch reports list');
                return;
            }

            const data = await response.json();
            if (!data.reports?.length) {
                window.showNotification?.({
                    type: 'info',
                    title: 'Report Not Found',
                    message: 'The report is not yet available. Please check the Requirements List section.',
                    actionText: 'OK'
                });
                return;
            }

            // Search for matching report
            const searchName = fileName.replace('.docx', '').toLowerCase();
            const isLookingForRequirements = searchName.includes('requirement') && !searchName.includes('user stor');
            const isLookingForUserStories = searchName.includes('user stor') || searchName.includes('stories');

            let matchingReport = null;

            if (isLookingForRequirements) {
                matchingReport = data.reports.find(r =>
                    r.reportType === 'requirements' || r.reportType === 'Requirements'
                );
            } else if (isLookingForUserStories) {
                matchingReport = data.reports.find(r =>
                    r.reportType === 'userStories' || r.reportType === 'UserStories' || r.reportType === 'user_stories'
                );
            }

            if (!matchingReport) {
                matchingReport = data.reports.find(r =>
                    r.reportName.toLowerCase().includes(searchName) ||
                    searchName.includes(r.reportName.toLowerCase().replace(/[^a-z0-9]/g, ''))
                );
            }

            if (!matchingReport) {
                window.showNotification?.({
                    type: 'info',
                    title: 'Report Not Found',
                    message: 'Could not find the specific report. Please check the Requirements List section.',
                    actionText: 'OK'
                });
                return;
            }

            await this.download(projectID, matchingReport.reportID);
        } catch (error) {
            console.error('Error downloading report:', error);
        }
    },

    /**
     * Fetch project reports
     * @param {string} projectID
     */
    async fetchList(projectID) {
        const response = await fetch('/api/project/report/list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': window.csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ projectID })
        });

        return response.json();
    }
};

// Export
Object.assign(window, {
    ReportService,
    // Backward compatibility
    generateUserStoryReport: ReportService.generateUserStories.bind(ReportService),
    generateRequirementsReport: ReportService.generateRequirements.bind(ReportService),
    downloadReport: ReportService.download.bind(ReportService)
});
