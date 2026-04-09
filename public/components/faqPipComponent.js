const NOTION_SUPPORT_URL = 'https://www.notion.so/chungsat/Singularity-31792c4b044d801fb5aedf2b529353b8';
window.SINGULARITY_NOTION_SUPPORT_URL = NOTION_SUPPORT_URL;

const FaqPipComponent = ({ href = NOTION_SUPPORT_URL } = {}) => {
  // mode: 'hidden' | 'collapsed' | 'expanded'
  const [mode, setMode] = React.useState('hidden');
  const [tourPinned, setTourPinned] = React.useState(false);
  const modeRef = React.useRef('hidden');
  const hideTimerRef = React.useRef(null);

  const applyMode = (next) => {
    modeRef.current = next;
    setMode(next);
  };

  React.useEffect(() => {
    const EDGE_THRESHOLD = 8;   // px from right edge to reveal button
    const BUTTON_ZONE   = 52;   // px from right edge counted as "on the button"

    const onMouseMove = (e) => {
      const fromRight = window.innerWidth - e.clientX;

      if (fromRight <= BUTTON_ZONE) {
        // cursor is inside the button zone — keep visible, cancel any pending hide
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;

        if (fromRight <= EDGE_THRESHOLD && modeRef.current === 'hidden') {
          applyMode('collapsed');
        }
      } else {
        // cursor left the button zone
        if (modeRef.current === 'expanded') {
          applyMode('collapsed');
        }
        if (!hideTimerRef.current) {
          hideTimerRef.current = setTimeout(() => {
            hideTimerRef.current = null;
            applyMode('hidden');
          }, 1000);
        }
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      clearTimeout(hideTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    const onTourPin = (e) => {
      setTourPinned(!!(e && e.detail && e.detail.pinned));
    };
    window.addEventListener('singularity-faq-pip-tour-pin', onTourPin);
    return () => window.removeEventListener('singularity-faq-pip-tour-pin', onTourPin);
  }, []);

  const handleClick = (e) => {
    e.preventDefault();
    if (modeRef.current === 'collapsed') {
      applyMode('expanded');
    } else if (modeRef.current === 'expanded') {
      if (typeof window.showWelcomeOverlay === 'function') {
        window.showWelcomeOverlay();
      } else {
        window.location.href = '/home?welcome=1';
      }
      applyMode('collapsed');
    }
  };

  const isVisible = mode !== 'hidden' || tourPinned;
  const showExpandedChrome = tourPinned || mode === 'expanded';
  const width = showExpandedChrome ? '44px' : '10px';

  return React.createElement('a', {
    id: 'singularity-faq-pip',
    href: '/home?welcome=1',
    title: 'Welcome & tips',
    rel: 'noopener noreferrer',
    'data-singularity-faq-pip': '1',
    style: {
      position: 'fixed',
      right: 0,
      bottom: 0 ,
      transform: 'translateY(-50%)',
      width: width,
      height: '44px',
      backgroundColor: '#1E2B44',
      borderRadius: '6px 0 0 6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textDecoration: 'none',
      color: '#ffffff',
      fontSize: '19px',
      fontWeight: 'bold',
      boxShadow: isVisible ? '0 4px 20px rgba(0,0,0,0.28)' : 'none',
      opacity: isVisible ? 1 : 0,
      transition: 'width 0.26s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease, box-shadow 0.22s ease',
      overflow: 'hidden',
      cursor: 'pointer',
      zIndex: tourPinned ? 100003 : 1,
      pointerEvents: isVisible ? 'auto' : 'none',
      WebkitTapHighlightColor: 'transparent',
    },
    onClick: handleClick,
  },
    showExpandedChrome
      ? React.createElement('img', {
          src: './img/Help circle.svg',
          alt: 'Help',
          style: {
            width: '24px',
            height: '24px',
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)' // 让SVG变成白色
          }
        })
      : null
  );
};

window.FaqPipComponent = FaqPipComponent;