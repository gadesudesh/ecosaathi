import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    if (title) {
      document.title = `${title} — EcoSaathi`;
    } else {
      document.title = 'EcoSaathi — Smart Waste Collection for Cleaner Communities';
    }
  }, [title]);
}

export default usePageTitle;
