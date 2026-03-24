/**
 * Post-signup welcome / onboarding — text + optional static media per step (`media.src`).
 *
 * Compliance with homeTour.js: live tour has nine driver steps (overview + eight targets); these slides are eight welcome topics.
 * Use images, GIFs, or short videos per step; no built-in wireframe UI.
 *
 * Do not destructure useState/useCallback at top level — classic scripts share
 * global lexical scope with Home.js and would throw "redeclaration of const useState".
 */
const WELCOME_STEPS = [
    {
        id: 'workspace-overview',
        title: 'Your workspace',
        heading: null,
        paragraphs: [
            'This is the full Singularity layout behind the dimmed overlay.',
            'Left: project dropdown, New chat, Source, and Upload files.',
            'Center: chat, attachments, and Quick prompts (e.g. Analyze Documents).',
            'Right: Reports, generate exports, and Manage Requirements / Stories.',
            'A temporary tour project is already selected. Use only the tour buttons here until you tap Next — then we’ll spotlight each area in turn.'
        ],
        media: {
            type: 'image',
            src: './img/welcome/workspace-overview.png',
            alt: 'Singularity home: sidebar, chat with quick prompts, and reports column'
        }
    },
    {
        id: 'create-project',
        title: 'Create a project',
        heading: 'Start in the left sidebar',
        paragraphs: [
            'Use “Create project” in the sidebar. Name the workspace in the modal and save.',
            'You need at least one project before uploads, source files, and requirements make sense.'
        ],
        media: null
    },
    {
        id: 'select-project',
        title: 'Select your project',
        heading: 'Use the sidebar dropdown',
        paragraphs: [
            'At the top of the left sidebar, open the project dropdown and choose the workspace you want (including the one you just created).',
            'Everything else—Upload, Source list, Manage requirements—uses whichever project is active here.'
        ],
        media: null
    },
    {
        id: 'import-document',
        title: 'Import a document',
        heading: 'Add files to the project',
        paragraphs: [
            'Open “Source” in the sidebar and choose “Upload” to import documents into this project.',
            'Imported files appear in the source list so the agent can use them later.'
        ],
        media: null
    },
    {
        id: 'select-analyze',
        title: 'Select files to analyze',
        heading: 'Attach or analyze in chat',
        paragraphs: [
            'In the Source list, select the documents you care about.',
            'In chat, open the paperclip menu: upload new files or “Select uploaded files” from the project. When file chips appear, use “Analyze documents” so the agent reads them and replies in the thread.',
            'If you’re already in New chat, you can use Analyze Documents in Quick prompts instead.'
        ],
        media: null
    },
    {
        id: 'chat-agent',
        title: 'Chat with the agent',
        heading: 'Basic controls',
        paragraphs: [
            'Type in the main input and press Enter to send (Shift+Enter for a new line).',
            'Use “New chat” for a fresh thread; the back arrow returns to the home prompt view. Quick prompts under the input offer one-tap starters.'
        ],
        media: null
    },
    {
        id: 'requirements',
        title: 'View requirements',
        heading: 'The right Reports column',
        paragraphs: [
            'The interactive tour highlights the whole right sidebar: that column is where reports, exports, and Manage Requirements / Stories live.',
            'You can also open requirements from the left sidebar; the next tour step zooms into the generate-and-manage block.'
        ],
        media: null
    },
    {
        id: 'reports',
        title: 'Generate reports',
        heading: 'User Stories, Requirements, Manage',
        paragraphs: [
            'In the right column, use “Generate User Stories Report” or “Generate Requirement Report”, then “Manage Requirements / Stories”. Completed exports show in the list under that block.',
            'Finish with “Get started”, or choose “Interactive tour” to walk the real UI in nine steps (overview → … → full right sidebar → report actions).'
        ],
        media: null
    }
];

/**
 * media: { type: 'image' | 'gif' | 'video', src: string, alt?: string }
 * GIFs use type 'image' or 'gif' (both render as <img>).
 */
function WelcomeStepMedia({ step }) {
    const { media } = step;
    if (!media?.src) return null;

    const { type, src, alt } = media;
    if (type === 'video') {
        return React.createElement('div', { className: 'welcome-overlay-media' },
            React.createElement('video', {
                src,
                controls: true,
                playsInline: true,
                'aria-label': alt || 'Tutorial video'
            })
        );
    }

    return React.createElement('div', { className: 'welcome-overlay-media' },
        React.createElement('img', {
            src,
            alt: alt || '',
            loading: 'lazy',
            decoding: 'async'
        })
    );
}

function WelcomeOverlay({ onComplete }) {
    /** First screen matches original home welcome (“Welcome!” + intro + Get Started); then step-by-step slides. */
    const [phase, setPhase] = React.useState('landing');
    const [stepIndex, setStepIndex] = React.useState(0);
    const step = WELCOME_STEPS[stepIndex];
    const last = stepIndex === WELCOME_STEPS.length - 1;

    const goNext = React.useCallback(() => {
        if (last) {
            return;
        }
        setStepIndex((i) => Math.min(i + 1, WELCOME_STEPS.length - 1));
    }, [last]);

    const goBack = React.useCallback(() => {
        if (phase === 'slides' && stepIndex === 0) {
            setPhase('landing');
            return;
        }
        setStepIndex((i) => Math.max(i - 1, 0));
    }, [phase, stepIndex]);

    const goToStep = React.useCallback((idx) => {
        setStepIndex(Math.max(0, Math.min(idx, WELCOME_STEPS.length - 1)));
    }, []);

    const enterSlides = React.useCallback(() => {
        setPhase('slides');
        setStepIndex(0);
    }, []);

    if (phase === 'landing') {
        return React.createElement('div', {
            className: 'welcome-overlay-backdrop',
            role: 'presentation'
        },
            React.createElement('div', {
                className: 'welcome-overlay-card welcome-overlay-home-landing',
                role: 'dialog',
                'aria-modal': true,
                'aria-labelledby': 'welcome-home-title',
                onClick: (e) => e.stopPropagation()
            },
                React.createElement('div', { className: 'welcome-overlay-brand-row' },
                    React.createElement('img', { src: './img/union.svg', alt: '' }),
                    React.createElement('span', { className: 'welcome-overlay-brand-name' }, 'Singularity')
                ),
                React.createElement('h1', {
                    id: 'welcome-home-title',
                    className: 'welcome-overlay-step-title welcome-overlay-home-welcome'
                }, 'Welcome!'),
                React.createElement('div', { className: 'welcome-overlay-body welcome-overlay-home-body' },
                    React.createElement('p', null,
                        'This is Singularity, an agent powered requirement conversation platform.'
                    ),
                    React.createElement('p', null,
                        'Brainstorm your business / project ideas with Singularity, your go to intelligent requirement manager.'
                    ),
                    React.createElement('p', null,
                        'Feel free to start a project and chat to the agent with documentations for requirement suggestions.'
                    )
                ),
                React.createElement('div', { className: 'welcome-overlay-footer welcome-overlay-footer--landing' },
                    React.createElement('button', {
                        type: 'button',
                        className: 'welcome-overlay-btn welcome-overlay-btn--primary welcome-overlay-home-cta',
                        onClick: enterSlides
                    }, 'Get Started')
                )
            )
        );
    }

    return React.createElement('div', {
        className: 'welcome-overlay-backdrop',
        role: 'presentation'
    },
        React.createElement('div', {
            className: 'welcome-overlay-card',
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': 'welcome-overlay-step-title',
            onClick: (e) => e.stopPropagation()
        },
            React.createElement('div', { className: 'welcome-overlay-brand-row' },
                React.createElement('img', { src: './img/union.svg', alt: '' }),
                React.createElement('span', { className: 'welcome-overlay-brand-name' }, 'Singularity')
            ),
            React.createElement('h1', {
                id: 'welcome-overlay-step-title',
                className: 'welcome-overlay-step-title'
            }, step.title),
            step.heading
                ? React.createElement('h2', { className: 'welcome-overlay-step-heading' }, step.heading)
                : null,
            React.createElement('div', { className: 'welcome-overlay-body' },
                step.paragraphs.map((text, i) =>
                    React.createElement('p', { key: i }, text)
                )
            ),
            React.createElement(WelcomeStepMedia, { step }),
            React.createElement('div', {
                className: 'welcome-overlay-hint',
                id: 'welcome-step-hint'
            }, `Step ${stepIndex + 1} of ${WELCOME_STEPS.length}`),
            React.createElement('div', {
                className: 'welcome-overlay-progress',
                role: 'tablist',
                'aria-label': 'Tutorial steps'
            },
                WELCOME_STEPS.map((s, i) =>
                    React.createElement('button', {
                        key: s.id,
                        type: 'button',
                        className: 'welcome-overlay-dot',
                        'aria-label': `Go to step ${i + 1}: ${s.title}`,
                        'aria-current': i === stepIndex ? 'true' : undefined,
                        tabIndex: i === stepIndex ? 0 : -1,
                        onClick: () => goToStep(i)
                    })
                )
            ),
            React.createElement('div', { className: 'welcome-overlay-footer' + (last ? ' welcome-overlay-footer--final' : '') },
                React.createElement('button', {
                    type: 'button',
                    className: 'welcome-overlay-btn welcome-overlay-btn--ghost',
                    onClick: goBack,
                    disabled: false
                }, 'Back'),
                React.createElement('div', { className: 'welcome-overlay-footer-spacer' }),
                last
                    ? React.createElement('div', { className: 'welcome-overlay-footer-final-actions' },
                        React.createElement('button', {
                            type: 'button',
                            className: 'welcome-overlay-btn welcome-overlay-btn--ghost',
                            onClick: () => onComplete?.({ liveTour: true })
                        }, 'Interactive tour'),
                        React.createElement('button', {
                            type: 'button',
                            className: 'welcome-overlay-btn welcome-overlay-btn--primary',
                            onClick: () => onComplete?.({ liveTour: false })
                        }, 'Get started')
                    )
                    : React.createElement('button', {
                        type: 'button',
                        className: 'welcome-overlay-btn welcome-overlay-btn--primary',
                        onClick: goNext
                    }, 'Next')
            )
        )
    );
}

Object.assign(window, { WelcomeOverlay, WELCOME_STEPS });
