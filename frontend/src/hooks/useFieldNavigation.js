/**
 * Custom Hook: useFieldNavigation
 * Manages field navigation and keyboard shortcuts
 */

import { useState, useCallback, useEffect } from 'react';

export const useFieldNavigation = (fields, currentFieldId) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Find current index
  useEffect(() => {
    if (fields && currentFieldId) {
      const index = fields.findIndex(f => f.id === currentFieldId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [fields, currentFieldId]);

  // Go to next field
  const nextField = useCallback(() => {
    if (fields && currentIndex < fields.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return fields[currentIndex + 1];
    }
    return null;
  }, [fields, currentIndex]);

  // Go to previous field
  const previousField = useCallback(() => {
    if (fields && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      return fields[currentIndex - 1];
    }
    return null;
  }, [fields, currentIndex]);

  // Go to specific field
  const goToField = useCallback(
    (fieldId) => {
      if (fields) {
        const index = fields.findIndex(f => f.id === fieldId);
        if (index !== -1) {
          setCurrentIndex(index);
          return fields[index];
        }
      }
      return null;
    },
    [fields]
  );

  // Go to field by index
  const goToIndex = useCallback(
    (index) => {
      if (fields && index >= 0 && index < fields.length) {
        setCurrentIndex(index);
        return fields[index];
      }
      return null;
    },
    [fields]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if no input is focused
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'arrowdown':
        case 'n': // Next
          e.preventDefault();
          nextField();
          break;
        case 'arrowup':
        case 'p': // Previous
          e.preventDefault();
          previousField();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextField, previousField]);

  return {
    currentIndex,
    total: fields ? fields.length : 0,
    nextField,
    previousField,
    goToField,
    goToIndex,
    hasNext: fields && currentIndex < fields.length - 1,
    hasPrevious: currentIndex > 0,
  };
};

export default useFieldNavigation;
