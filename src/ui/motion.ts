/** Short compositor animations, with reduced-motion support and bounded lifetime. */
export function feedback(element: Element | null, kind: 'deploy' | 'invalid' | 'select'): void {
    if (!element || matchMedia('(prefers-reduced-motion: reduce)').matches)
        return;
    const frames = kind === 'invalid' ? [{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }]
        : kind === 'deploy' ? [{ transform: 'translateY(-12px) scale(1.08)', filter: 'brightness(1.7)' }, { transform: 'translateY(0) scale(1)', filter: 'brightness(1)' }]
            : [{ transform: 'translateY(0)' }, { transform: 'translateY(-9px)' }, { transform: 'translateY(-6px)' }];
    element.animate(frames, { duration: kind === 'deploy' ? 320 : 180, easing: 'ease-out' });
}
