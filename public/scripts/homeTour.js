/**
 * Live UI tour (driver.js) — aligns with WelcomeOverlay.js topics:
 * Overview → 1 Create → 2 Select project → 3 Import → 4 Select & analyze → 5 Chat →
 * 6 Requirements (full #right-sidebar) → 8 Generate reports & manage (report actions + list)
 *
 * On start we create a short-lived “Singularity tour” project and select it so Upload /
 * Reports controls exist. When the tour ends (Done, ✕, or overlay), that project is
 * deleted and your previous selection is restored when possible.
 *
 * window.startSingularityHomeTour()
 *
 * Steps after overview: 1–5 unchanged, 6 = full #right-sidebar, 8 = report actions + list (#right-sidebar-tour-reports-spotlight), 9 = #singularity-faq-pip (reopen welcome).
 */
(function () {
    var TOUR_PROJECT_NAME_PREFIX = 'Singularity tour';
    /** Survives refresh — Sidebar deletes this project on load if the tour never finished (Done / close). */
    var PENDING_TOUR_PROJECT_KEY = 'singularityTourPendingProjectId';

    /**
     * driver.js IIFE sets window.driver.js to a *module object* { driver: factory },
     * not the factory itself — so typeof window.driver.js === 'function' is wrong.
     */
    function getDriverFactory() {
        if (!window.driver || !window.driver.js) {
            console.warn('[SingularityTour] driver.js not loaded (script missing or blocked)');
            return null;
        }
        var slot = window.driver.js;
        if (typeof slot === 'function') {
            return slot;
        }
        if (slot && typeof slot.driver === 'function') {
            return slot.driver;
        }
        console.warn('[SingularityTour] driver.js loaded but API shape unexpected', slot);
        return null;
    }

    function prepareLayout() {
        document.dispatchEvent(
            new CustomEvent('singularity-tour-prep', {
                bubbles: true,
                detail: { expandLeftSidebar: true }
            })
        );
        document.dispatchEvent(new Event('singularity-tour-sidebar-prep'));
        window.dispatchEvent(new Event('singularity-tour-expand-right'));
    }

    function tourProjectDisplayName() {
        return TOUR_PROJECT_NAME_PREFIX;
    }

    function clearStaleTourFlags(callback) {
        var id = window.__singularityTourDemoProjectId;
        if (!id) {
            callback();
            return;
        }
        var token = window.csrfToken;
        if (!token) {
            window.__singularityTourDemoProjectId = null;
            window.__singularityTourRestoreProjectId = null;
            callback();
            return;
        }
        fetch('/api/project/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'CSRF-Token': token },
            body: JSON.stringify({ projectID: id, silentTourCleanup: true })
        })
            .then(function (r) {
                if (r.ok) {
                    try {
                        if (localStorage.getItem(PENDING_TOUR_PROJECT_KEY) === id) {
                            localStorage.removeItem(PENDING_TOUR_PROJECT_KEY);
                        }
                    } catch (_) {}
                }
            })
            .catch(function () {})
            .finally(function () {
                window.__singularityTourDemoProjectId = null;
                window.__singularityTourRestoreProjectId = null;
                document.dispatchEvent(
                    new CustomEvent('singularity-tour-demo-deleted', { detail: { deletedId: id } })
                );
                callback();
            });
    }

    function seedTourDemoProject(done) {
        var token = window.csrfToken;
        if (!token) {
            console.warn('[SingularityTour] No CSRF token; skip demo project');
            window.__singularityTourSeeded = false;
            done(false);
            return;
        }

        window.__singularityTourRestoreProjectId = localStorage.getItem('selectedProjectID') || null;

        fetch('/api/project/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'CSRF-Token': token },
            body: JSON.stringify({ projectName: tourProjectDisplayName() })
        })
            .then(function (r) {
                return r.json().then(function (data) {
                    return { ok: r.ok, data: data };
                });
            })
            .then(function (_ref) {
                var ok = _ref.ok;
                var data = _ref.data;
                if (!ok || !data.success || !data.projectID) {
                    console.warn('[SingularityTour] Could not create tour project', data);
                    window.__singularityTourDemoProjectId = null;
                    window.__singularityTourSeeded = false;
                    done(false);
                    return;
                }
                window.__singularityTourDemoProjectId = data.projectID;
                window.__singularityTourSeeded = true;
                try {
                    localStorage.setItem(PENDING_TOUR_PROJECT_KEY, data.projectID);
                } catch (_) {}
                document.dispatchEvent(
                    new CustomEvent('singularity-tour-demo-project-ready', {
                        detail: { projectID: data.projectID }
                    })
                );
                window.setTimeout(function () {
                    done(true);
                }, 280);
            })
            .catch(function (e) {
                console.warn('[SingularityTour] create failed', e);
                window.__singularityTourDemoProjectId = null;
                window.__singularityTourSeeded = false;
                done(false);
            });
    }

    function cleanupTourDemoProject() {
        var tourId = window.__singularityTourDemoProjectId;
        var restore = window.__singularityTourRestoreProjectId;
        window.__singularityTourDemoProjectId = null;
        window.__singularityTourRestoreProjectId = null;
        window.__singularityTourSeeded = false;

        if (!tourId) {
            return;
        }

        var token = window.csrfToken;
        var afterLocalStorage = function () {
            if (restore && restore !== tourId) {
                localStorage.setItem('selectedProjectID', restore);
            } else {
                localStorage.removeItem('selectedProjectID');
            }
            document.dispatchEvent(
                new CustomEvent('singularity-tour-demo-deleted', { detail: { deletedId: tourId } })
            );
        };

        if (!token) {
            afterLocalStorage();
            return;
        }

        fetch('/api/project/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'CSRF-Token': token },
            body: JSON.stringify({ projectID: tourId, silentTourCleanup: true })
        })
            .then(function (r) {
                if (r.ok) {
                    try {
                        localStorage.removeItem(PENDING_TOUR_PROJECT_KEY);
                    } catch (_) {}
                }
            })
            .catch(function (err) {
                console.warn('[SingularityTour] delete tour project failed', err);
            })
            .finally(afterLocalStorage);
    }

    function buildSteps() {
        var uploadEl = document.getElementById('sidebar-source-upload-button');
        var reportsSpotlightEl = document.getElementById('right-sidebar-tour-reports-spotlight');
        var seeded = !!window.__singularityTourSeeded;

        return [
            {
                // Dummy target = no “hole” over the app. Driver only re-enables clicks on `.driver-active-element`;
                // with the full workspace that was the whole UI — now only the tour popover receives input.
                element: '#driver-dummy-element',
                popover: {
                    title: 'Your workspace',
                    description:
                        'Singularity is tailored for software requirements: turn ideas and documents into structured specs, stories, and exports.\n\n' +
                        'This is the full Singularity layout behind the dimmed overlay.\n\n' +
                        'Left: project dropdown, New chat, Source, and Upload files.\n\n' +
                        'Center: chat, attachments, and Quick prompts (e.g. Analyze Documents).\n\n' +
                        'Right: Reports, generate exports, and Manage Requirements / Stories.\n\n' +
                        'A temporary tour project is already selected. Use only the tour buttons here until you tap Next — then we’ll spotlight each area in turn.',
                    side: 'bottom',
                    align: 'center',
                    /* No “Back” on the first screen — there is no prior step */
                    showButtons: ['next', 'close']
                }
            },
            {
                element: '#sidebar-create-project-button',
                popover: {
                    title: '1 · Create a project',
                    description: seeded
                        ? 'We created and selected a temporary project named “' +
                          TOUR_PROJECT_NAME_PREFIX +
                          '” so Upload and Reports are live for this walkthrough.\n\n' +
                          'Use this button whenever you want real projects of your own.\n\n' +
                          'The temporary one is deleted as soon as you tap Done or close the tour.'
                        : 'Use this sidebar button first. Name your workspace in the modal and confirm.\n\n' +
                          'We could not auto-create a tour project (network or session). Create one manually, then use the dropdown in the next step.',
                    side: 'right',
                    align: 'start'
                }
            },
            {
                element: '#select-project-drop-down',
                popover: {
                    title: '2 · Select your project',
                    description: seeded
                        ? 'The temporary tour project should be selected here.\n\n' +
                          'Normally you switch projects with this control — everything scoped to uploads, source, and reports follows the active project.'
                        : 'Pick the project you use for this workspace.\n\n' +
                          'Upload and report controls only appear when a project is selected.',
                    side: 'right',
                    align: 'start'
                }
            },
            {
                element: uploadEl ? '#sidebar-source-upload-button' : '#sidebar-source',
                popover: {
                    title: '3 · Import documents',
                    description: uploadEl
                        ? 'This Upload button adds files to the project.\n\n' +
                          'They show up in the Source list below for attaching and analysis.'
                        : 'Use the Source row in the sidebar (we expanded it for you).\n\n' +
                          'Finish steps 1 and 2 first — until a project is selected, the Upload control does not appear and you cannot add files here.',
                    side: 'right',
                    align: 'start'
                }
            },
            {
                element: '#sidebar-source-section',
                popover: {
                    title: '4 · Select & analyze',
                    description:
                        'The full Source area (upload + list) is highlighted. Rows appear only after you import files in step 3.\n\n' +
                        'If you still see “No source yet,” go Back and complete steps 1–3 first.\n\n' +
                        'With files listed, select them, then in chat use the paperclip, attach or pick uploaded files, and use “Analyze documents.”\n\n' +
                        'If you’re already in New chat, you can use Analyze Documents in Quick prompts instead.',
                    side: 'right',
                    align: 'start'
                }
            },
            {
                element: '#input-field-form',
                popover: {
                    title: '5 · Chat with the agent',
                    description:
                        'Type a message and press Enter to send (Shift+Enter for a new line). Use the send button on the right.\n\n' +
                        '“New chat” starts a thread; the back arrow returns to the home view.\n\n' +
                        'Quick prompts below offer one-tap starters.',
                    side: 'top',
                    align: 'center'
                }
            },
            {
                element: '#right-sidebar',
                popover: {
                    title: '6 · Requirements & reports (right)',
                    description:
                        'The whole right column is highlighted: this is the Reports area—header, actions, export list, and collapse control.\n\n' +
                        'The left sidebar has a matching “Report” section; this panel is the main place for requirements and generated exports.',
                    side: 'left',
                    align: 'center'
                }
            },
            {
                element: reportsSpotlightEl
                    ? '#right-sidebar-tour-reports-spotlight'
                    : '#right-sidebar-requirements-wrapper',
                popover: {
                    title: '8 · Generate reports & manage',
                    description:
                        'This block is highlighted: generate a User Stories or Requirement report, open Manage Requirements / Stories, and use the list below for completed exports (or “No reports yet” until the first run).\n\n' +
                        'You can also start some of these actions from the left sidebar.',
                    side: 'left',
                    align: 'start'
                }
            },
            {
                element: '#singularity-faq-pip',
                popover: {
                    title: '9 · Welcome & tips',
                    description:
                        'This strip sits on the right edge of the screen: move the pointer there to reveal the help control (?).\n\n' +
                        'Click it anytime to reopen the welcome tutorial and tips (on Home). You can run this tour again from the last step of that flow.',
                    side: 'left',
                    align: 'center'
                }
            }
        ];
    }

    function startSingularityHomeTour() {
        var factory = getDriverFactory();
        if (!factory) {
            return;
        }

        prepareLayout();

        clearStaleTourFlags(function () {
            seedTourDemoProject(function () {
                window.setTimeout(function () {
                    var driverObj = factory({
                        onHighlightStarted: function (element) {
                            var pip = element && element.id === 'singularity-faq-pip';
                            window.dispatchEvent(
                                new CustomEvent('singularity-faq-pip-tour-pin', { detail: { pinned: !!pip } })
                            );
                        },
                        showProgress: true,
                        smoothScroll: true,
                        animate: true,
                        allowClose: true,
                        /* Escape / arrows would call the same internal handlers as overlay; only × and Done should end the tour */
                        allowKeyboardControl: false,
                        /* Highlighted node must not steal clicks in the cutout; #root is pointer-events none via homeTour.css */
                        disableActiveInteraction: true,
                        /* driver.js 1.3.x uses global stagePadding only (per-step values are ignored) */
                        stagePadding: 16,
                        stageRadius: 8,
                        popoverOffset: 12,
                        overlayColor: '#0b1120',
                        overlayOpacity: 0.72,
                        popoverClass: 'singularity-tour-popover',
                        progressText: 'Step {{current}} of {{total}}',
                        nextBtnText: 'Next →',
                        prevBtnText: '← Back',
                        doneBtnText: 'Done',
                        steps: buildSteps(),
                        onDestroyed: function () {
                            window.dispatchEvent(
                                new CustomEvent('singularity-faq-pip-tour-pin', { detail: { pinned: false } })
                            );
                            window.__singularityTourDriver = null;
                            cleanupTourDemoProject();
                        }
                    });
                    window.__singularityTourDriver = driverObj;
                    driverObj.drive();
                }, 520);
            });
        });
    }

    window.startSingularityHomeTour = startSingularityHomeTour;
})();
