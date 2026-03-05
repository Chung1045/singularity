const NOTION_SUPPORT_URL = 'https://www.notion.so/chungsat/Singularity-31792c4b044d801fb5aedf2b529353b8';

const FaqPipComponent = ({ href = NOTION_SUPPORT_URL } = {}) => {
  const [mode, setMode] = React.useState('hidden');
  const timeoutRef = React.useRef(null);

  const clear = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const showCollapsed = () => {
    clear();
    setMode('collapsed');
  };

  const hideCompletely = () => {
    clear();
    timeoutRef.current = setTimeout(() => {
      setMode('hidden');
    }, 320);
  };

  const expand = () => {
    clear();
    setMode('expanded');
  };

  const collapse = () => {
    if (mode === 'expanded') {
      setMode('collapsed');
    }
  };

  // Prevent mobile sticky state
  const handleTouch = (e) => {
    e.preventDefault();
    expand();
  };

  React.useEffect(() => {
    return () => clear();
  }, []);

  const isVisible = mode !== 'hidden';
  const width = mode === 'expanded' ? '44px' : '13px';

  return React.createElement('div', {
    style: {
      position: 'fixed',
      right: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      width: '78px',
      height: '56px',
      zIndex: 9999,
      WebkitTapHighlightColor: 'transparent',
    },
    onMouseEnter: showCollapsed,
    onMouseLeave: hideCompletely,
    onTouchStart: handleTouch, // mobile
  },
    React.createElement('a', {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      style: {
        position: 'absolute',
        right: 0,
        bottom: 0,
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
        transition: 'all 0.26s cubic-bezier(0.34, 1.56, 0.64, 1)',
        overflow: 'hidden',
        pointerEvents: isVisible ? 'auto' : 'none',
      },
      onMouseEnter: expand,
      onMouseLeave: collapse,
      onClick: expand,
      onTouchEnd: (e) => {
        // Let mobile click go through after expanding
        setTimeout(() => {
          hideCompletely();
        }, 400);
      },
    }, '?')
  );
};

window.FaqPipComponent = FaqPipComponent;