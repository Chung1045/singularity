/**
 * FaqPipComponent
 * A fixed pip button on the right edge of the screen linking to an FAQ/help page.
 * Uses React.useState for hover state — no inline event mutation needed.
 */

const FaqPipComponent = ({ href = 'https://your-link-here.com' } = {}) => {
    const [expanded, setExpanded] = React.useState(false);

    return React.createElement('div', {
        style: {
            position: 'fixed',
            right: 0,
            bottom: 0,
            transform: 'translateY(-50%)',
            zIndex: 'var(--z-critical)',
            WebkitTapHighlightColor: 'transparent'
        }
    },
        React.createElement('a', {
            href,
            target: '_blank',
            rel: 'noopener noreferrer',
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: expanded ? '44px' : '12px',
                height: '44px',
                backgroundColor: '#1E2B44',
                borderRadius: '6px 0 0 6px',
                cursor: 'pointer',
                transition: 'width 0.2s ease',
                overflow: 'hidden',
                textDecoration: 'none'
            },
            onMouseEnter: () => setExpanded(true),
            onMouseLeave: () => setExpanded(false)
        },
            React.createElement('span', {
                style: {
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    opacity: expanded ? 1 : 0,
                    transition: 'opacity 0.15s ease',
                    pointerEvents: 'none'
                }
            }, '?')
        )
    );
};

window.FaqPipComponent = FaqPipComponent;
