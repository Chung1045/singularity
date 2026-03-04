(function () {
    function FaqPipComponent({ href = 'https://your-link-here.com' } = {}) {
        var container = document.createElement('div');
        container.style.cssText = [
            'position:fixed',
            'right:0',
            'bottom:0',
            'transform:translateY(-50%)',
            'z-index:var(--z-critical)',
            '-webkit-tap-highlight-color:transparent'
        ].join(';');

        var link = document.createElement('a');
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.cssText = [
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'width:12px',
            'height:44px',
            'background-color:#1E2B44',
            'border-radius:6px 0 0 6px',
            'cursor:pointer',
            'transition:width 0.2s ease',
            'overflow:hidden',
            'text-decoration:none'
        ].join(';');

        var icon = document.createElement('span');
        icon.textContent = '?';
        icon.style.cssText = [
            'color:#ffffff',
            'font-size:16px',
            'font-weight:bold',
            'opacity:0',
            'transition:opacity 0.15s ease',
            'pointer-events:none'
        ].join(';');

        link.addEventListener('mouseenter', function () {
            link.style.width = '44px';
            icon.style.opacity = '1';
        });
        link.addEventListener('mouseleave', function () {
            link.style.width = '12px';
            icon.style.opacity = '0';
        });

        link.appendChild(icon);
        container.appendChild(link);
        return container;
    }

    window.FaqPipComponent = FaqPipComponent;
})();
