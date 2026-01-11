document.addEventListener('DOMContentLoaded', () => {
    // Only run if not mobile (optional check, but good for extensions)
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const cursor = document.createElement('div');
    cursor.classList.add('custom-cursor');
    document.body.appendChild(cursor);

    const cursorDot = document.createElement('div');
    cursorDot.classList.add('custom-cursor-dot');
    document.body.appendChild(cursorDot);

    // Track mouse movement - NO LAG
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX;
        const y = e.clientY;

        // Direct assignment for 1:1 response
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;

        cursorDot.style.left = `${x}px`;
        cursorDot.style.top = `${y}px`;
    });

    // Hover interactions
    const hoverSelectors = [
        'a', 'button', 'input', 'textarea',
        '.nav-item', '.icon-btn', '.google-card',
        '.card-menu', '.switch'
    ];

    const handleMouseEnter = () => {
        cursor.classList.add('active');
        cursorDot.classList.add('active');
    };

    const handleMouseLeave = () => {
        cursor.classList.remove('active');
        cursorDot.classList.remove('active');
    };

    // Click interaction
    document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
    document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));

    // Attach listeners dynamically
    // Use delegation for better performance in dynamic apps
    document.body.addEventListener('mouseover', (e) => {
        if (e.target.closest(hoverSelectors.join(','))) {
            handleMouseEnter();
        }
    });

    document.body.addEventListener('mouseout', (e) => {
        if (e.target.closest(hoverSelectors.join(','))) {
            handleMouseLeave();
        }
    });
});
