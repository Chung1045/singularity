/**
 * HelpMenu Component
 * Help button in the top-right corner with options to:
 * - View/replay the tutorial
 * - Access documentation
 * - Contact support
 */

const HelpMenu = {
    /**
     * Initialize the Help button in the page
     */
    init() {
        // Check if help button already exists
        if (document.getElementById('help-menu-button')) {
            return;
        }

        // Create help button container
        const helpContainer = document.createElement('div');
        helpContainer.id = 'help-menu-container';
        helpContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: ${window.ZIndex?.HELP_MENU || 9000};
        `;

        // Help button
        const helpBtn = document.createElement('button');
        helpBtn.id = 'help-menu-button';
        helpBtn.title = 'Help & Tutorials';
        helpBtn.innerHTML = '❓';
        helpBtn.style.cssText = `
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #c3ab6f 0%, #d4bc91 100%);
            color: white;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(195, 171, 111, 0.3);
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        helpBtn.onmouseover = () => {
            helpBtn.style.transform = 'scale(1.1)';
            helpBtn.style.boxShadow = '0 8px 20px rgba(195, 171, 111, 0.4)';
        };

        helpBtn.onmouseout = () => {
            helpBtn.style.transform = 'scale(1)';
            helpBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
        };

        // Dropdown menu
        const dropdown = document.createElement('div');
        dropdown.id = 'help-menu-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 70px;
            right: 0;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            min-width: 240px;
            display: none;
            z-index: ${window.ZIndex?.HELP_MENU || 9000};
            animation: slideUpMenu 0.2s ease;
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUpMenu {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .help-menu-item {
                padding: 14px 18px;
                border: none;
                background: transparent;
                cursor: pointer;
                width: 100%;
                text-align: left;
                font-size: 14px;
                color: #333;
                transition: all 0.2s;
                border-bottom: 1px solid #f0f0f0;
            }
            .help-menu-item:last-child {
                border-bottom: none;
            }
            .help-menu-item:hover {
                background: #f5f5f5;
                padding-left: 22px;
            }
            .help-menu-item strong {
                margin-right: 10px;
                font-size: 16px;
            }
        `;
        if (!document.querySelector('style[data-help-menu]')) {
            style.setAttribute('data-help-menu', 'true');
            document.head.appendChild(style);
        }

        // Menu items
        const menuItems = [
            {
                label: '📖 View Tutorial',
                action: () => {
                    this.closDropdown();
                    TutorialModal.show({ mode: 'help' });
                }
            },
            {
                label: '❓ FAQ',
                action: () => {
                    this.showFAQ();
                }
            },
            {
                label: '📧 Contact Support',
                action: () => {
                    window.location.href = 'mailto:support@singularity.io';
                }
            }
        ];

        menuItems.forEach((item, index) => {
            const menuItem = document.createElement('button');
            menuItem.className = 'help-menu-item';
            menuItem.innerHTML = item.label;
            menuItem.onclick = (e) => {
                e.stopPropagation();
                item.action();
            };
            dropdown.appendChild(menuItem);
        });

        // Toggle dropdown
        helpBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display === 'flex';
            dropdown.style.display = isOpen ? 'none' : 'flex';
            dropdown.style.flexDirection = 'column';
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });

        helpContainer.appendChild(helpBtn);
        helpContainer.appendChild(dropdown);
        document.body.appendChild(helpContainer);
    },

    /**
     * Close the help dropdown menu
     */
    closDropdown() {
        const dropdown = document.getElementById('help-menu-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    },

    /**
     * Show FAQ modal
     */
    showFAQ() {
        const backdrop = document.createElement('div');
        backdrop.id = 'faq-modal-backdrop';
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
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 16px;
            width: 100%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        `;

        modal.innerHTML = `
            <div style="padding: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; font-size: 24px; color: #333;">Frequently Asked Questions</h2>
                    <button id="faq-close-btn" style="border: none; background: transparent; font-size: 28px; cursor: pointer; color: #999;">×</button>
                </div>

                <div>
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 15px;">How do I create a project?</h4>
                        <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.6;">
                            Click the <strong>"+ New Project"</strong> button in the left sidebar, enter a project name, and click Create.
                        </p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 15px;">What file formats are supported?</h4>
                        <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.6;">
                            We support PDF, Word (.docx), Excel (.xlsx), Text (.txt), and many more. Just upload and we'll handle the rest!
                        </p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 15px;">Can I share projects with others?</h4>
                        <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.6;">
                            Yes! Click Share on any project and invite collaborators via email. They can view documents and chat together.
                        </p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 15px;">How do I generate a report?</h4>
                        <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.6;">
                            Go to the Reports tab, click "New Report", name it, choose your format (PDF or Word), and download!
                        </p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 15px;">Is my data secure?</h4>
                        <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.6;">
                            Absolutely. Your documents are encrypted and only accessible to you and people you share projects with.
                        </p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #333; font-size: 15px;">Need more help?</h4>
                        <p style="margin: 0; color: #666; font-size: 13px; line-height: 1.6;">
                            Email us at <strong>support@singularity.io</strong> or access the tutorial again from the Help menu.
                        </p>
                    </div>
                </div>
            </div>
        `;

        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Close button handler
        const closeBtn = document.getElementById('faq-close-btn');
        const closeFAQ = () => {
            const faqBackdrop = document.getElementById('faq-modal-backdrop');
            if (faqBackdrop) {
                faqBackdrop.remove();
            }
        };

        closeBtn.onclick = closeFAQ;

        // Close on backdrop click
        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                closeFAQ();
            }
        };
    }
};

// Auto-initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => HelpMenu.init(), 500);
    });
} else {
    setTimeout(() => HelpMenu.init(), 500);
}
