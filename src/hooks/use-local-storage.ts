"use client";

import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((val: T) => T);

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: SetValue<T>) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // useEffect to update local storage when the state changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        typeof storedValue === 'function'
          ? (storedValue as Function)(storedValue)
          : storedValue;
      // Save state
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const setValue = useCallback((value: SetValue<T>) => {
     setStoredValue(prevValue => {
        const newValue = value instanceof Function ? value(prevValue) : value;
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(key, JSON.stringify(newValue));
          } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
          }
        }
        return newValue;
      });
  }, [key]);


  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  return [storedValue, setValue];
}

export default useLocalStorage;
