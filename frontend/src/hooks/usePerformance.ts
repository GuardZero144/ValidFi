'use client';

import { useState, useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number | null;
  loadTime: number;
  isLowEnd: boolean;
}

interface UsePerformanceOptions {
  fpsThreshold?: number;
  memoryThreshold?: number;
}

export function usePerformance(options: UsePerformanceOptions = {}) {
  const { fpsThreshold = 30, memoryThreshold = 50 } = options;
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: null,
    loadTime: 0,
    isLowEnd: false,
  });

  const [isMonitoring, setIsMonitoring] = useState(false);

  const measureFPS = useCallback(() => {
    let frames = 0;
    let lastTime = performance.now();

    const measure = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
        
        setMetrics(prev => ({
          ...prev,
          fps,
          isLowEnd: fps < fpsThreshold,
        }));
      }
      
      if (isMonitoring) {
        requestAnimationFrame(measure);
      }
    };

    requestAnimationFrame(measure);
  }, [fpsThreshold, isMonitoring]);

  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedHeapSize = memory.usedJSHeapSize / (1024 * 1024);
      
      setMetrics(prev => ({
        ...prev,
        memoryUsage: usedHeapSize,
        isLowEnd: prev.isLowEnd || usedHeapSize > memoryThreshold,
      }));
    }
  }, [memoryThreshold]);

  const measureLoadTime = useCallback(() => {
    if ('timing' in performance) {
      const timing = (performance as any).timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      setMetrics(prev => ({
        ...prev,
        loadTime,
      }));
    }
  }, []);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  useEffect(() => {
    if (isMonitoring) {
      measureFPS();
      measureMemory();
      measureLoadTime();
      
      const memoryInterval = setInterval(measureMemory, 5000);
      
      return () => {
        clearInterval(memoryInterval);
      };
    }
  }, [isMonitoring, measureFPS, measureMemory, measureLoadTime]);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
  };
}
