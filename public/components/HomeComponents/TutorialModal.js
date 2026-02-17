/**
 * TutorialModal Component
 * Displays step-by-step tutorials for first-time users or on-demand
 * Features:
 * - Welcome mode: Auto-shows on first login
 * - Help mode: Accessible anytime via Help menu
 * - Persistent: Can be reopened anytime
 */

const TutorialModal = {
    // Tutorial steps content
    TUTORIAL_STEPS: [
        {
            stepNum: 1,
            title: "Welcome to Singularity!",
            description: "Let's walk you through the main features to help you get started.",
            content: `
                <div style="text-align: center; padding: 20px;">
                    <p style="font-size: 28px; margin: 20px 0;">👋 Hello and Welcome!</p>
                    <p style="font-size: 15px; color: #666; line-height: 1.6;">
                        Singularity helps you manage projects, analyze documents, and generate AI-powered insights.
                        <br><br>
                        We'll show you the key features in just a few steps. This should take about 2 minutes.
                    </p>
                </div>
            `
        },
        {
            stepNum: 2,
            title: "Creating Your First Project",
            description: "Learn how to create a new project to organize your work.",
            content: `
                <div style="padding: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">📁 Create a Project</h4>
                    <ol style="line-height: 2; color: #555; padding-left: 20px; margin: 0;">
                        <li>Look for the <strong>"+ New Project"</strong> button in the left sidebar</li>
                        <li>Enter a meaningful project name</li>
                        <li>Click <strong>Create</strong> - your project is ready!</li>
                    </ol>
                    <p style="background: #e3f2fd; padding: 12px; border-radius: 6px; margin-top: 15px; color: #1565c0; font-size: 13px; border-left: 4px solid #1976d2;">
                        💡 <strong>Pro Tip:</strong> Create separate projects for different work streams or clients.
                    </p>
                </div>
            `
        },
        {
            stepNum: 3,
            title: "Uploading Documents",
            description: "Add files to your project for analysis.",
            content: `
                <div style="padding: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">📄 Upload Documents</h4>
                    <ol style="line-height: 2; color: #555; padding-left: 20px; margin: 0;">
                        <li>Go to the <strong>"Source" panel</strong> on the right sidebar</li>
                        <li>Click <strong>"Upload Files"</strong> or drag & drop</li>
                        <li>Select one or more files (PDF, Word, Text, Excel, etc.)</li>
                        <li>Files upload automatically and appear in your project</li>
                    </ol>
                    <p style="background: #e8f5e9; padding: 12px; border-radius: 6px; margin-top: 15px; color: #2e7d32; font-size: 13px; border-left: 4px solid #388e3c;">
                        💡 <strong>Pro Tip:</strong> Upload multiple documents to analyze them together and find connections across files.
                    </p>
                </div>
            `
        },
        {
            stepNum: 4,
            title: "Using the Chat Interface",
            description: "Ask questions and get AI-powered insights about your documents.",
            content: `
                <div style="padding: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">💬 Chat with Your Documents</h4>
                    <ol style="line-height: 2; color: #555; padding-left: 20px; margin: 0;">
                        <li>Select documents from the <strong>Source panel</strong></li>
                        <li>Use the <strong>attachment dropdown</strong> to add files to your message</li>
                        <li>Type your question in the chat input</li>
                        <li>AI analyzes your documents and responds with insights</li>
                        <li>Continue the conversation to refine your questions</li>
                    </ol>
                    <p style="background: #f3e5f5; padding: 12px; border-radius: 6px; margin-top: 15px; color: #6a1b9a; font-size: 13px; border-left: 4px solid #7b1fa2;">
                        💡 <strong>Pro Tip:</strong> Click <strong>"Analyze Documents"</strong> for a comprehensive analysis of all selected files.
                    </p>
                </div>
            `
        },
        {
            stepNum: 5,
            title: "Sharing Projects",
            description: "Collaborate with teammates on your projects.",
            content: `
                <div style="padding: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">👥 Share Your Project</h4>
                    <ol style="line-height: 2; color: #555; padding-left: 20px; margin: 0;">
                        <li>Select a project in the left sidebar</li>
                        <li>Click the <strong>"Share"</strong> button</li>
                        <li>Enter your teammate's email address</li>
                        <li>They'll receive an invitation to join</li>
                    </ol>
                    <p style="background: #fce4ec; padding: 12px; border-radius: 6px; margin-top: 15px; color: #c2185b; font-size: 13px; border-left: 4px solid #d81b60;">
                        💡 <strong>Pro Tip:</strong> Collaborators can chat, upload files, and generate reports together.
                    </p>
                </div>
            `
        },
        {
            stepNum: 6,
            title: "Generating Reports",
            description: "Export your analysis and insights as formatted reports.",
            content: `
                <div style="padding: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #333;">📊 Generate Reports</h4>
                    <ol style="line-height: 2; color: #555; padding-left: 20px; margin: 0;">
                        <li>Click the <strong>"Reports" tab</strong> in the right sidebar</li>
                        <li>Click <strong>"New Report"</strong></li>
                        <li>Name your report and select the format (PDF or Word)</li>
                        <li>Reports auto-generate from your chat and analysis</li>
                    </ol>
                    <p style="background: #fff3e0; padding: 12px; border-radius: 6px; margin-top: 15px; color: #e65100; font-size: 13px; border-left: 4px solid #ff6f00;">
                        💡 <strong>Pro Tip:</strong> Export reports to share findings with stakeholders outside Singularity.
                    </p>
                </div>
            `
        },
        {
            stepNum: 7,
            title: "You're All Set!",
            description: "Ready to start using Singularity.",
            content: `
                <div style="text-align: center; padding: 20px;">
                    <p style="font-size: 28px; margin: 20px 0;">✨ Ready to Go!</p>
                    <p style="font-size: 15px; color: #666; line-height: 1.8; margin-bottom: 20px;">
                        You now know the basics. Time to create your first project!
                        <br><br>
                        <strong>Next Steps:</strong>
                        <br>
                        1️⃣ Create a project<br>
                        2️⃣ Upload your first document<br>
                        3️⃣ Ask a question in chat
                    </p>
                    <p style="background: #e0f2f1; padding: 12px; border-radius: 6px; color: #00695c; font-size: 13px; border-left: 4px solid #00897b;">
                        ℹ️ <strong>Remember:</strong> You can access this tutorial anytime via the Help menu (❓ icon) in the top right.
                    </p>
                </div>
            `
        }
    ],

    /**
     * Show the tutorial modal
     * @param {Object} options - Configuration options
     * @param {string} options.mode - 'welcome' or 'help' (welcome has auto-close, help stays open)
     * @param {Function} options.onComplete - Callback when tutorial is completed
     * @param {Function} options.onSkip - Callback when tutorial is skipped
     */
    show(options = {}) {
        const mode = options.mode || 'welcome';
        const onComplete = options.onComplete || (() => {});
        const onSkip = options.onSkip || (() => {});
        
        let currentStep = 0;
        const totalSteps = this.TUTORIAL_STEPS.length;

        // Remove existing tutorial if open
        const existingBackdrop = document.getElementById('tutorial-modal-backdrop');
        if (existingBackdrop) {
            existingBackdrop.remove();
        }

        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'tutorial-modal-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: ${window.ZIndex?.MODAL || 10005};
            padding: 20px;
            animation: fadeIn 0.3s ease;
        `;

        // Add fade-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'tutorial-modal';
        modal.style.cssText = `
            background: white;
            border-radius: 16px;
            width: 100%;
            max-width: 750px;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            animation: slideUp 0.3s ease;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 24px;
            background: linear-gradient(135deg, #c3ab6f 0%, #d4bc91 100%);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const headerLeft = document.createElement('div');
        headerLeft.innerHTML = `
            <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Singularity Guide</h2>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Step <span id="step-current">1</span> of ${totalSteps}</p>
        `;

        const closeBtn = document.createElement('button');
        closeBtn.id = 'close-tutorial-modal';
        closeBtn.style.cssText = `
            width: 40px;
            height: 40px;
            border: none;
            background: rgba(255,255,255,0.2);
            cursor: pointer;
            font-size: 28px;
            color: white;
            border-radius: 50%;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.textContent = '×';
        closeBtn.onmouseover = () => {
            closeBtn.style.background = 'rgba(255,255,255,0.3)';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.background = 'rgba(255,255,255,0.2)';
        };

        header.appendChild(headerLeft);
        header.appendChild(closeBtn);

        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            height: 4px;
            background: #e0e0e0;
            width: 100%;
        `;
        const progressFill = document.createElement('div');
        progressFill.id = 'tutorial-progress-fill';
        progressFill.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, #c3ab6f 0%, #d4bc91 100%);
            width: ${((currentStep + 1) / totalSteps) * 100}%;
            transition: width 0.3s ease;
        `;
        progressBar.appendChild(progressFill);

        // Content area
        const contentContainer = document.createElement('div');
        contentContainer.id = 'tutorial-content';
        contentContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 30px;
            background: white;
        `;

        // Title
        const title = document.createElement('h3');
        title.id = 'tutorial-title';
        title.style.cssText = `
            margin: 0 0 12px 0;
            font-size: 22px;
            color: #333;
            font-weight: 600;
        `;

        // Description
        const description = document.createElement('p');
        description.id = 'tutorial-description';
        description.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 14px;
            color: #666;
            line-height: 1.5;
        `;

        // Dynamic content
        const dynamicContent = document.createElement('div');
        dynamicContent.id = 'tutorial-dynamic-content';

        contentContainer.appendChild(title);
        contentContainer.appendChild(description);
        contentContainer.appendChild(dynamicContent);

        // Footer with buttons
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 24px;
            background: #f8f9fa;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            border-top: 1px solid #e0e0e0;
        `;

        // Skip button (only in welcome mode)
        const skipBtn = document.createElement('button');
        skipBtn.id = 'tutorial-skip-btn';
        skipBtn.textContent = mode === 'welcome' ? 'Skip Tutorial' : 'Close';
        skipBtn.style.cssText = `
            padding: 10px 20px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            color: #666;
            transition: all 0.2s;
            font-weight: 500;
        `;
        skipBtn.onmouseover = () => {
            skipBtn.style.background = '#f5f5f5';
            skipBtn.style.borderColor = '#bbb';
        };
        skipBtn.onmouseout = () => {
            skipBtn.style.background = 'white';
            skipBtn.style.borderColor = '#ddd';
        };

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.id = 'tutorial-prev-btn';
        prevBtn.textContent = '← Previous';
        prevBtn.style.cssText = `
            padding: 10px 20px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            color: #333;
            transition: all 0.2s;
            font-weight: 500;
            display: ${currentStep === 0 ? 'none' : 'inline-block'};
        `;
        prevBtn.disabled = currentStep === 0;

        // Next/Complete button
        const nextBtn = document.createElement('button');
        nextBtn.id = 'tutorial-next-btn';
        nextBtn.textContent = currentStep === totalSteps - 1 ? 'Get Started!' : 'Next →';
        nextBtn.style.cssText = `
            padding: 10px 24px;
            border: none;
            background: linear-gradient(135deg, #c3ab6f 0%, #d4bc91 100%);
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            color: white;
            transition: all 0.2s;
            font-weight: 600;
        `;
        nextBtn.onmouseover = () => {
            nextBtn.style.transform = 'translateY(-2px)';
            nextBtn.style.boxShadow = '0 8px 16px rgba(195, 171, 111, 0.4)';
        };
        nextBtn.onmouseout = () => {
            nextBtn.style.transform = 'translateY(0)';
            nextBtn.style.boxShadow = 'none';
        };

        footer.appendChild(skipBtn);
        footer.appendChild(prevBtn);
        footer.appendChild(nextBtn);

        modal.appendChild(header);
        modal.appendChild(progressBar);
        modal.appendChild(contentContainer);
        modal.appendChild(footer);
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Update step display
        const updateStep = (stepIndex) => {
            currentStep = Math.max(0, Math.min(stepIndex, totalSteps - 1));
            const step = this.TUTORIAL_STEPS[currentStep];

            title.textContent = step.title;
            description.textContent = step.description;
            dynamicContent.innerHTML = step.content;

            document.getElementById('step-current').textContent = currentStep + 1;

            // Update buttons
            prevBtn.disabled = currentStep === 0;
            prevBtn.style.display = currentStep === 0 ? 'none' : 'inline-block';

            nextBtn.textContent = currentStep === totalSteps - 1 ? 'Get Started!' : 'Next →';

            // Update progress bar
            const progressPercent = ((currentStep + 1) / totalSteps) * 100;
            progressFill.style.width = progressPercent + '%';
        };

        // Button event listeners
        prevBtn.onclick = () => {
            if (currentStep > 0) {
                updateStep(currentStep - 1);
            }
        };

        prevBtn.onmouseover = () => {
            if (!prevBtn.disabled && prevBtn.style.display !== 'none') {
                prevBtn.style.background = '#f5f5f5';
                prevBtn.style.borderColor = '#999';
            }
        };

        prevBtn.onmouseout = () => {
            if (!prevBtn.disabled && prevBtn.style.display !== 'none') {
                prevBtn.style.background = 'white';
                prevBtn.style.borderColor = '#ddd';
            }
        };

        nextBtn.onclick = () => {
            if (currentStep < totalSteps - 1) {
                updateStep(currentStep + 1);
            } else {
                // Complete tutorial
                backdrop.remove();
                onComplete();
            }
        };

        const closeModal = () => {
            backdrop.remove();
            if (mode === 'welcome') {
                onSkip();
            } else {
                onComplete();
            }
        };

        skipBtn.onclick = closeModal;
        closeBtn.onclick = closeModal;

        // Initialize first step
        updateStep(0);
    }
};
