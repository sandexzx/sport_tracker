import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const endTimeRef = useRef(null);
  const durationRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
    if (remaining <= 0) {
      setSeconds(0);
      setIsRunning(false);
      clearTimer();
    } else {
      setSeconds(remaining);
    }
  }, [clearTimer]);

  const start = useCallback(
    (duration) => {
      clearTimer();
      durationRef.current = duration;
      endTimeRef.current = Date.now() + duration * 1000;
      setSeconds(duration);
      setIsRunning(true);
      intervalRef.current = setInterval(tick, 250);
    },
    [clearTimer, tick],
  );

  const pause = useCallback(() => {
    if (!isRunning) return;
    clearTimer();
    durationRef.current = Math.round((endTimeRef.current - Date.now()) / 1000);
    setIsRunning(false);
  }, [isRunning, clearTimer]);

  const resume = useCallback(() => {
    if (isRunning || durationRef.current <= 0) return;
    endTimeRef.current = Date.now() + durationRef.current * 1000;
    setIsRunning(true);
    intervalRef.current = setInterval(tick, 250);
  }, [isRunning, tick]);

  const reset = useCallback(() => {
    clearTimer();
    setSeconds(0);
    setIsRunning(false);
    durationRef.current = 0;
    endTimeRef.current = null;
  }, [clearTimer]);

  const addTime = useCallback(
    (delta) => {
      if (!endTimeRef.current) return;
      endTimeRef.current += delta * 1000;
      durationRef.current += delta;
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining <= 0) {
        setIsRunning(false);
        clearTimer();
      } else if (!isRunning) {
        durationRef.current = remaining;
      }
    },
    [isRunning, clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { seconds, isRunning, start, pause, resume, reset, addTime };
}
