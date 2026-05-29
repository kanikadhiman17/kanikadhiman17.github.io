// Smooth scroll behavior for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Reveal story items as they scroll into view
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.2,
    rootMargin: '0px 0px -60px 0px'
});

document.querySelectorAll('.story-item').forEach(item => observer.observe(item));

// ===== Draw the circuit-trace connector between story logos =====
// Layout offsets (not getBoundingClientRect) so the reveal animation never shifts the trace.
function offsetWithin(el, root) {
    let x = 0, y = 0, node = el;
    while (node && node !== root) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent;
    }
    return { x, y };
}

function drawStoryConnector() {
    const timeline = document.querySelector('.story-timeline');
    const svg = document.querySelector('.story-connector');
    if (!timeline || !svg) return;

    // Skip on mobile (connector hidden, single-column layout)
    if (window.matchMedia('(max-width: 768px)').matches) return;

    const items = [...timeline.querySelectorAll('.story-item')];
    if (items.length < 2) return;

    const w = timeline.offsetWidth;
    const h = timeline.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);

    const nodes = items.map(item => {
        const logo = item.querySelector('.story-logo');
        const p = offsetWithin(logo, timeline);
        const itemPos = offsetWithin(item, timeline);
        return {
            cx: p.x + logo.offsetWidth / 2,
            cy: p.y + logo.offsetHeight / 2,
            top: itemPos.y,
            bottom: itemPos.y + item.offsetHeight
        };
    });

    // Build the orthogonal route as a list of points: down/up the logo column,
    // across the gap between tiles, then into the next logo.
    const pts = [[nodes[0].cx, nodes[0].cy]];
    for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i], b = nodes[i + 1];
        const gapY = (a.bottom + b.top) / 2; // midpoint of the gap between the two tiles
        pts.push([a.cx, gapY]);
        pts.push([b.cx, gapY]);
        pts.push([b.cx, b.cy]);
    }

    const d = roundedPath(pts, 9);

    // Solder-pad dots at each logo connection point
    const circles = nodes
        .map(n => `<circle cx="${n.cx}" cy="${n.cy}" r="4"></circle>`)
        .join('');

    svg.innerHTML = `<path d="${d}"></path>${circles}`;
}

// Turn a list of orthogonal points into a path with slightly rounded corners.
function roundedPath(pts, radius) {
    if (pts.length < 2) return '';
    const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const toward = (from, to, r) => {
        const len = dist(from, to) || 1;
        return [from[0] + (to[0] - from[0]) * r / len, from[1] + (to[1] - from[1]) * r / len];
    };

    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
        const prev = pts[i - 1], corner = pts[i], next = pts[i + 1];
        const r = Math.min(radius, dist(prev, corner) / 2, dist(corner, next) / 2);
        const start = toward(corner, prev, r);
        const end = toward(corner, next, r);
        d += ` L ${start[0]} ${start[1]} Q ${corner[0]} ${corner[1]} ${end[0]} ${end[1]}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last[0]} ${last[1]}`;
    return d;
}

// Redraw on load, resize, and as items reveal
let rafId = null;
function scheduleDraw() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(drawStoryConnector);
}

window.addEventListener('load', () => {
    scheduleDraw();
    // Gentle page fade-in
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
        document.body.style.transition = 'opacity 0.5s ease-in';
        document.body.style.opacity = '1';
    });
});
window.addEventListener('resize', scheduleDraw);
document.addEventListener('DOMContentLoaded', scheduleDraw);
