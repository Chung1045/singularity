const { useState, useEffect } = React;

const TempHome = ({ csrfToken }) => {
    const [showModal, setShowModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [projectToRename, setProjectToRename] = useState(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [renameProjectName, setRenameProjectName] = useState('');
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [showUserSearchModal, setShowUserSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedProjectForSharing, setSelectedProjectForSharing] = useState(null);
    const [projectFiles, setProjectFiles] = useState([]);
    const [newFileName, setNewFileName] = useState('');
    const [fileToRename, setFileToRename] = useState(null);
    const [showFileRenameModal, setShowFileRenameModal] = useState(false);

    useEffect(() => {
        // Fetch projects when component mounts
        fetchProjects();
    }, []);

    // Auto-refresh file list when project changes
    useEffect(() => {
        if (selectedProject) {
            fetchProjectFiles();
        }
    }, [selectedProject]);

    const fetchProjectFiles = async () => {
        if (!selectedProject) return;

        try {
            const res = await fetch('/api/project/file/list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({ projectID: selectedProject })
            });

            const data = await res.json();
            if (data.successful) {
                setProjectFiles(data.files);
            } else {
                alert("Failed to fetch project files");
            }
        } catch (err) {
            console.error("Error listing files:", err);
        }
    };

    const uploadFile = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectID", selectedProject);

        try {
            const res = await fetch("/api/project/file/upload", {
                method: "POST",
                headers: { "CSRF-Token": csrfToken },
                body: formData
            });

            const data = await res.json();
            if (data.successful) {
                alert("Upload successful");
                fetchProjectFiles();
                event.target.value = '';
            } else {
                alert("Upload failed: " + (data.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Upload failed");
        }
    };

    const downloadFile = async (file) => {
        try {
            const res = await fetch("/api/project/file/download", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "CSRF-Token": csrfToken
                },
                body: JSON.stringify({
                    projectID: selectedProject,
                    documentID: file.documentID
                })
            });

            if (!res.ok) {
                alert("Download failed");
                return;
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.documentName + file.documentExt;
            a.click();
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error("Download error:", err);
            alert("Download failed");
        }
    };

    const deleteFile = async (file) => {
        const fileName = file.documentName + file.documentExt;
        if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
            return;
        }

        try {
            const res = await fetch("/api/project/file/delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "CSRF-Token": csrfToken
                },
                body: JSON.stringify({
                    projectID: selectedProject,
                    documentID: file.documentID
                })
            });

            const data = await res.json();
            if (data.successful) {
                alert("Deleted successfully");
                fetchProjectFiles();
            } else {
                alert("Failed to delete file");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const openFileRenameModal = (file) => {
        setFileToRename(file);
        setNewFileName(file.documentName);
        setShowFileRenameModal(true);
    };

    const renameFile = async () => {
        if (!newFileName.trim()) {
            alert("Please enter a filename.");
            return;
        }

        try {
            const res = await fetch("/api/project/file/rename", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "CSRF-Token": csrfToken
                },
                body: JSON.stringify({
                    projectID: selectedProject,
                    documentID: fileToRename.documentID,
                    newFileName: newFileName
                })
            });

            const data = await res.json();
            if (data.successful) {
                alert("Renamed successfully");
                setShowFileRenameModal(false);
                fetchProjectFiles();
            } else {
                alert("Rename failed");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/project/list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({})
            });
            const data = await res.json();
            console.log(data);
            setProjects(data.projects);
            if (data.projects && data.projects.length > 0) {
                setSelectedProject(data.projects[0].projectID);
            }
        } catch (err) {
            console.error("Error fetching projects:", err);
        }
    };

    const createProject = async () => {
        if (!newProjectName) {
            alert("Please enter a project name.");
            return;
        }

        try {
            const res = await fetch('/api/project/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({ projectName: newProjectName })
            });
            if (res.ok) {
                alert("Project created successfully!");
                setShowModal(false);
                setNewProjectName('');
                fetchProjects();
            } else {
                const errData = await res.json();
                alert(errData.message || "Failed to create project.");
            }
        } catch (err) {
            console.error("Error creating project:", err);
        }
    };

    const openRenameModal = (project) => {
        setProjectToRename(project);
        setRenameProjectName(project.projectName);
        setShowRenameModal(true);
    };

    const closeRenameModal = () => {
        setShowRenameModal(false);
        setProjectToRename(null);
        setRenameProjectName('');
    };

    const renameProject = async () => {
        if (!renameProjectName || !projectToRename) {
            alert("Please enter a project name.");
            return;
        }

        try {
            const res = await fetch('/api/project/rename', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    projectID: projectToRename.projectID,
                    newProjectName: renameProjectName
                })
            });

            if (res.ok) {
                alert("Project renamed successfully!");
                closeRenameModal();
                fetchProjects();
            } else {
                const errData = await res.json();
                alert(errData.message || "Failed to rename project.");
            }
        } catch (err) {
            console.error("Error renaming project:", err);
            alert("Error renaming project.");
        }
    };

    const openDeleteModal = (project) => {
        setProjectToDelete(project);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setProjectToDelete(null);
    };

    const deleteProject = async () => {
        if (!projectToDelete) return;

        try {
            const res = await fetch('/api/project/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({ projectID: projectToDelete.projectID })
            });

            if (res.ok) {
                alert("Project deleted successfully!");
                closeDeleteModal();
                fetchProjects();
            } else {
                const errData = await res.json();
                alert(errData.message || "Failed to delete project.");
            }
        } catch (err) {
            console.error("Error deleting project:", err);
            alert("Error deleting project.");
        }
    };

    const searchUsers = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const res = await fetch('/api/user/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({ query: searchQuery })
            });

            const data = await res.json();
            if (data.successful) {
                setSearchResults(data.users);
            } else {
                setSearchResults([]);
            }
        } catch (err) {
            console.error("Search failed:", err);
            setSearchResults([]);
        }
    };

    const logout = async () => {
        $.ajax({
            url: '/api/logout',
            method: 'POST',
            headers: { 'CSRF-Token': csrfToken },
            data: JSON.stringify({}),
            contentType: 'application/json',
            success: function(response) {
                alert("Logout response: " + JSON.stringify(response));
                window.location = "/login";
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || "An error occurred. Please try again.";
                alert(errorMessage);
            }
        });
    };

    function handleProfileRoute() {
        window.location.href = "/profile";
    }

    return React.createElement('div', { className: 'flex flex-col gap-4 p-6 max-w-4xl mx-auto mt-8' },

        // Header
        React.createElement('h2', { className: 'text-2xl font-bold mb-2' }, "Dashboard"),
        React.createElement('p', { className: 'text-gray-600 mb-4' }, "Welcome back!"),

        // Project selector row
        React.createElement('div', {
                className: 'flex items-center justify-between bg-white p-4 border rounded shadow-sm'
            },
            React.createElement('div', { className: 'flex items-center gap-3' },
                React.createElement('label', { className: 'font-medium' }, "Selected Project:"),
                React.createElement('select', {
                        value: selectedProject,
                        onChange: e => setSelectedProject(e.target.value),
                        className: 'px-3 py-2 border rounded'
                    },
                    projects.length === 0
                        ? React.createElement('option', {}, "No Projects")
                        : projects.map(p =>
                            React.createElement('option', { key: p.projectID, value: p.projectID }, p.projectName)
                        )
                )
            ),
            React.createElement('button', {
                onClick: () => setShowModal(true),
                className: 'px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700'
            }, 'Create Project')
        ),

        // FILE MANAGER SECTION (Fixed: moved outside project selector)
        React.createElement('div', { className: 'bg-white p-4 border rounded shadow-sm' },
            React.createElement('h3', { className: 'text-lg font-semibold mb-3' }, "Project Files"),

            React.createElement('div', { className: 'flex gap-2 mb-4' },
                React.createElement('button', {
                    onClick: fetchProjectFiles,
                    className: 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                }, 'Refresh File List'),

                React.createElement('label', {
                        className: 'px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer inline-flex items-center'
                    },
                    'Upload File',
                    React.createElement('input', {
                        type: 'file',
                        onChange: uploadFile,
                        className: 'hidden'
                    })
                )
            ),

            projectFiles.length === 0
                ? React.createElement('p', { className: 'text-gray-500' }, "No files found. Upload a file to get started.")
                : React.createElement('ul', { className: 'space-y-2' },
                    projectFiles.map(file =>
                        React.createElement('li', {
                                key: file.documentID,
                                className: 'flex items-center justify-between p-3 border rounded bg-gray-50'
                            },
                            React.createElement('span', { className: 'font-medium' },
                                file.documentName + file.documentExt
                            ),

                            React.createElement('div', { className: 'flex gap-2' },
                                React.createElement('button', {
                                    onClick: () => downloadFile(file),
                                    className: 'px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700'
                                }, 'Download'),

                                React.createElement('button', {
                                    onClick: () => openFileRenameModal(file),
                                    className: 'px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600'
                                }, 'Rename'),

                                React.createElement('button', {
                                    onClick: () => deleteFile(file),
                                    className: 'px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600'
                                }, 'Delete')
                            )
                        )
                    )
                )
        ),

        // Main content layout
        React.createElement('div', { className: 'grid grid-cols-3 gap-6' },

            // Left column: Project list
            React.createElement('div', { className: 'col-span-2' },
                React.createElement('h3', { className: 'text-lg font-semibold mb-3' }, "Your Projects"),

                projects.length === 0
                    ? React.createElement('p', { className: 'text-gray-500' }, "No projects yet.")
                    : React.createElement('div', { className: 'space-y-3' },
                        projects.map(p =>
                            React.createElement('div', {
                                    key: p.projectID,
                                    className: 'p-4 border rounded shadow-sm flex items-center justify-between hover:bg-gray-50'
                                },

                                React.createElement('div', {},
                                    React.createElement('p', { className: 'font-medium text-gray-900' }, p.projectName),
                                    React.createElement('p', { className: 'text-xs text-gray-500' }, p.projectID)
                                ),

                                React.createElement('div', { className: 'flex gap-2' },
                                    React.createElement('button', {
                                        onClick: () => openRenameModal(p),
                                        className: 'px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600'
                                    }, 'Rename'),

                                    React.createElement('button', {
                                        onClick: () => openDeleteModal(p),
                                        className: 'px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600'
                                    }, 'Delete'),

                                    React.createElement('button', {
                                        onClick: () => {
                                            setSelectedProjectForSharing(p);
                                            setShowUserSearchModal(true);
                                        },
                                        className: 'px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700'
                                    }, 'Share')
                                )
                            )
                        )
                    )
            ),

            // Right column: User actions
            React.createElement('div', { className: 'flex flex-col gap-3 h-fit' },
                React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, "Account"),

                React.createElement('button', {
                    onClick: handleProfileRoute,
                    className: 'px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800'
                }, 'Manage Profile'),

                React.createElement('button', {
                    onClick: logout,
                    className: 'px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'
                }, 'Logout')
            )
        ),

        showModal && React.createElement('div', {
                className: 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'
            },
            React.createElement('div', { className: 'bg-white p-6 rounded shadow-md w-80' },
                React.createElement('h3', { className: 'text-lg mb-4' }, 'New Project'),
                React.createElement('input', {
                    type: 'text',
                    value: newProjectName,
                    onChange: e => setNewProjectName(e.target.value),
                    placeholder: 'Enter project name',
                    className: 'w-full px-3 py-2 border rounded mb-4'
                }),
                React.createElement('div', { className: 'flex justify-end gap-2' },
                    React.createElement('button', {
                        onClick: () => setShowModal(false),
                        className: 'px-4 py-2 bg-gray-300 rounded hover:bg-gray-400'
                    }, 'Cancel'),
                    React.createElement('button', {
                        onClick: createProject,
                        className: 'px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700'
                    }, 'Create')
                )
            )
        ),

        showRenameModal && projectToRename && React.createElement('div', {
                className: 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'
            },
            React.createElement('div', { className: 'bg-white p-6 rounded shadow-md w-96' },
                React.createElement('h3', { className: 'text-lg font-bold mb-4' }, 'Rename Project'),
                React.createElement('p', { className: 'mb-2 text-sm text-gray-600' }, 'Current name:'),
                React.createElement('p', { className: 'mb-4 font-semibold text-gray-800' },
                    `"${projectToRename.projectName}"`
                ),
                React.createElement('input', {
                    type: 'text',
                    value: renameProjectName,
                    onChange: e => setRenameProjectName(e.target.value),
                    placeholder: 'Enter new project name',
                    className: 'w-full px-3 py-2 border rounded mb-4'
                }),
                React.createElement('div', { className: 'flex justify-end gap-2' },
                    React.createElement('button', {
                        onClick: closeRenameModal,
                        className: 'px-4 py-2 bg-gray-300 rounded hover:bg-gray-400'
                    }, 'Cancel'),
                    React.createElement('button', {
                        onClick: renameProject,
                        className: 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                    }, 'Rename')
                )
            )
        ),

        showDeleteModal && projectToDelete && React.createElement('div', {
                className: 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'
            },
            React.createElement('div', { className: 'bg-white p-6 rounded shadow-md w-96' },
                React.createElement('h3', { className: 'text-lg font-bold mb-4 text-red-600' }, 'Delete Project'),
                React.createElement('p', { className: 'mb-2' }, 'Are you sure you want to delete this project?'),
                React.createElement('p', { className: 'mb-6 font-semibold text-gray-800' },
                    `"${projectToDelete.projectName}"`
                ),
                React.createElement('p', { className: 'mb-6 text-sm text-gray-600' },
                    'This action cannot be undone.'
                ),
                React.createElement('div', { className: 'flex justify-end gap-2' },
                    React.createElement('button', {
                        onClick: closeDeleteModal,
                        className: 'px-4 py-2 bg-gray-300 rounded hover:bg-gray-400'
                    }, 'Cancel'),
                    React.createElement('button', {
                        onClick: deleteProject,
                        className: 'px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'
                    }, 'Delete')
                )
            )
        ),

        showUserSearchModal && React.createElement('div', {
                className: 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'
            },
            React.createElement('div', { className: 'bg-white p-6 rounded shadow-md w-96' },

                React.createElement('h3', { className: 'text-lg font-bold mb-4' },
                    `Add collaborator to "${selectedProjectForSharing?.projectName}"`
                ),

                React.createElement('input', {
                    type: 'text',
                    value: searchQuery,
                    onChange: e => setSearchQuery(e.target.value),
                    placeholder: 'Search username...',
                    className: 'w-full px-3 py-2 border rounded mb-3'
                }),

                React.createElement('button', {
                    onClick: searchUsers,
                    className: 'w-full px-4 py-2 mb-4 bg-purple-600 text-white rounded hover:bg-purple-700'
                }, 'Search'),

                React.createElement('div', { className: 'max-h-48 overflow-y-auto space-y-2' },
                    searchResults.length === 0
                        ? React.createElement('p', { className: 'text-gray-500 text-sm text-center' }, 'No users found')
                        : searchResults.map(u =>
                            React.createElement('div', {
                                    key: u.userName,
                                    className: 'flex justify-between items-center p-2 border rounded'
                                },
                                React.createElement('div', {},
                                    React.createElement('p', { className: 'font-medium' }, u.userName),
                                    React.createElement('p', { className: 'text-sm text-gray-500' },
                                        `${u.firstName} ${u.lastName}`
                                    )
                                ),

                                React.createElement('button', {
                                    onClick: () => alert(`TODO: add ${u.userName} to ${selectedProjectForSharing.projectID}`),
                                    className: 'px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm'
                                }, 'Add')
                            )
                        )
                ),

                React.createElement('button', {
                    onClick: () => setShowUserSearchModal(false),
                    className: 'w-full mt-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400'
                }, 'Close')
            )
        ),

        showFileRenameModal && React.createElement('div', {
                className: 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'
            },
            React.createElement('div', { className: 'bg-white p-6 rounded shadow-md w-96' },
                React.createElement('h3', { className: 'text-lg font-bold mb-4' }, 'Rename File'),
                React.createElement('p', { className: 'mb-2 text-sm text-gray-600' }, 'Current:'),
                React.createElement('p', { className: 'mb-4 font-semibold text-gray-800' },
                    fileToRename ? fileToRename.documentName + fileToRename.documentExt : ''
                ),

                React.createElement('input', {
                    type: 'text',
                    value: newFileName,
                    onChange: e => setNewFileName(e.target.value),
                    placeholder: 'Enter new filename (without extension)',
                    className: 'w-full px-3 py-2 border rounded mb-4'
                }),

                React.createElement('div', { className: 'flex justify-end gap-2' },
                    React.createElement('button', {
                        onClick: () => setShowFileRenameModal(false),
                        className: 'px-4 py-2 bg-gray-300 rounded hover:bg-gray-400'
                    }, 'Cancel'),
                    React.createElement('button', {
                        onClick: renameFile,
                        className: 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                    }, 'Rename')
                )
            )
        )
    );
};

// Make available globally
window.TempHome = TempHome;
