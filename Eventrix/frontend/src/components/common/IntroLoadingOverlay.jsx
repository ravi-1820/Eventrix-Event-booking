import React, { useState, useEffect, useRef } from 'react';
import { EventrixLogo } from './EventrixLogo';

/**
 * Premium Eventrix 5-Second Intro Loading Animation Overlay
 * 
 * Features:
 * - Light blue/white translucent glassmorphic overlay with 18px backdrop blur
 * - Live homepage stays mounted and visible softly blurred underneath
 * - Original Eventrix logo centered in a rounded white card with subtle shadow
 * - Three animated blue/cyan loading dots
 * - Loading text: "INITIALIZING YOUR EXPERIENCE"
 * - Smooth continuous left-to-right progress bar animation (0% -> 100% over ~4.5s)
 * - Tagline: "YOUR EVENTS. YOUR EXPERIENCES."
 * - Maximum intro duration of 5.0 seconds with smooth 0.5s fade-out
 * - Session-based: shows on initial homepage visit, never repeats on internal navigation
 * - Scroll locking while active, gracefully restored on dismissal
 * - Full support for prefers-reduced-motion and early dismissal (Escape / click)
 */
export function IntroLoadingOverlay({ isReady = true, onFinish }) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const timerFadeRef = useRef(null);
  const timerDismissRef = useRef(null);

  useEffect(() => {
    // 1. Session check: Only show on initial visit per session
    try {
      const hasSeen = sessionStorage.getItem('eventrix_intro_seen');
      if (hasSeen === 'true') {
        setShouldRender(false);
        return;
      }
    } catch {
      // In case sessionStorage is blocked/unavailable
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setShouldRender(true);

    // Prevent background scrolling while overlay is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const fadeDuration = 500; // 0.5s fade out
    const totalDuration = prefersReducedMotion ? 600 : 4500; // 4.5s active before fade (total 5.0s)

    // Schedule fade-out start at 4.5s
    timerFadeRef.current = setTimeout(() => {
      setIsFading(true);
    }, totalDuration);

    // Schedule complete removal from DOM at 5.0s
    timerDismissRef.current = setTimeout(() => {
      handleComplete(originalOverflow);
    }, totalDuration + fadeDuration);

    // Optional early dismissal via Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        dismissEarly(originalOverflow);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (timerFadeRef.current) clearTimeout(timerFadeRef.current);
      if (timerDismissRef.current) clearTimeout(timerDismissRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleComplete = (originalOverflow = '') => {
    try {
      sessionStorage.setItem('eventrix_intro_seen', 'true');
    } catch {}
    document.body.style.overflow = originalOverflow;
    setShouldRender(false);
    if (onFinish) onFinish();
  };

  const dismissEarly = (originalOverflow = '') => {
    if (isFading) return;
    setIsFading(true);
    if (timerFadeRef.current) clearTimeout(timerFadeRef.current);
    if (timerDismissRef.current) clearTimeout(timerDismissRef.current);

    setTimeout(() => {
      handleComplete(originalOverflow);
    }, 400);
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <aside 
      aria-label="Application Loading Screen"
      aria-live="polite"
      className={`eventrix-intro-overlay ${isFading ? 'eventrix-intro-fading' : ''}`}
    >
      {/* Centered Glassmorphism White Logo Card */}
      <div 
        className="eventrix-intro-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Eventrix Logo: Using existing project logo assets */}
        <div className="eventrix-intro-logo flex items-center justify-center">
          <img 
            src="/logo.png" 
            alt="Eventrix Logo" 
            className="h-12 sm:h-14 w-auto object-contain select-none pointer-events-none drop-shadow-xs"
            onError={(e) => {
              // Fallback to inline logo component if file load is delayed
              e.currentTarget.style.display = 'none';
              const fallback = document.getElementById('eventrix-intro-logo-fallback');
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div id="eventrix-intro-logo-fallback" style={{ display: 'none' }}>
            <EventrixLogo variant="full" size="md" />
          </div>
        </div>

        {/* 3 Animated Blue Loading Dots */}
        <div className="eventrix-intro-dots" aria-hidden="true">
          <span className="eventrix-intro-dot"></span>
          <span className="eventrix-intro-dot"></span>
          <span className="eventrix-intro-dot"></span>
        </div>

        {/* Loading Text */}
        <p className="eventrix-intro-text">
          INITIALIZING YOUR EXPERIENCE
        </p>

        {/* Continuous Left-to-Right Progress Bar (0% -> 100%) */}
        <div 
          className="progress eventrix-intro-progress" 
          role="progressbar" 
          aria-valuemin="0" 
          aria-valuemax="100" 
          aria-label="Loading progress"
        >
          <div className="progress-fill eventrix-intro-progress-fill"></div>
        </div>

        {/* Tagline */}
        <p className="eventrix-intro-tagline">
          YOUR EVENTS. YOUR EXPERIENCES.
        </p>

        {/* Subtle early dismiss action */}
        <button
          type="button"
          onClick={() => dismissEarly()}
          className="mt-4 text-[10px] sm:text-[11px] font-semibold text-[#075985]/50 hover:text-[#075985] transition-colors cursor-pointer tracking-wider uppercase py-1 px-3 rounded-full hover:bg-sky-50 focus:outline-hidden"
          title="Skip intro animation"
        >
          Skip Intro &rarr;
        </button>
      </div>
    </aside>
  );
}
