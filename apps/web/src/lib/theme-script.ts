// Shared server/client constants must stay outside a 'use client' module.
export const THEME_STORAGE_KEY = 'cs-theme';

/**
 * Inline script string for the document <head> — sets the `.dark` class before
 * first paint so there's no light→dark flash on load. Mirrors getInitial().
 */
export const THEME_NO_FLASH_SCRIPT = `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var d=s==='dark'||(!s&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}})();`;
