import { useEffect } from 'react';

type ShortcutMap = {
  [key: string]: (e: KeyboardEvent) => void;
};

export function useShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Create a string representation of the key combo (e.g. "ctrl+s", "alt+1")
      const keys = [];
      if (e.ctrlKey || e.metaKey) keys.push('ctrl');
      if (e.altKey) keys.push('alt');
      if (e.shiftKey) keys.push('shift');
      
      const key = e.key.toLowerCase();
      // Ignore if just the modifier key is pressed
      if (['control', 'meta', 'alt', 'shift'].includes(key)) return;
      
      keys.push(key);
      const combo = keys.join('+');

      if (shortcuts[combo]) {
        // Prevent default browser behavior (e.g., Ctrl+S saving the webpage)
        e.preventDefault();
        shortcuts[combo](e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
