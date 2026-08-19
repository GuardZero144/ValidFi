'use client';

import { useState, useEffect, useCallback } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface ResponsiveState {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  isTouchDevice: boolean;
}

const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>({
    breakpoint: 'lg',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024,
    height: 768,
    orientation: 'landscape',
    isTouchDevice: false,
  });

  const updateState = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    let breakpoint: Breakpoint = 'xs';
    if (width >= breakpoints['2xl']) breakpoint = '2xl';
    else if (width >= breakpoints.xl) breakpoint = 'xl';
    else if (width >= breakpoints.lg) breakpoint = 'lg';
    else if (width >= breakpoints.md) breakpoint = 'md';
    else if (width >= breakpoints.sm) breakpoint = 'sm';
    else if (width >= breakpoints.xs) breakpoint = 'xs';

    const isMobile = width < breakpoints.md;
    const isTablet = width >= breakpoints.md && width < breakpoints.lg;
    const isDesktop = width >= breakpoints.lg;
    
    const orientation = width > height ? 'landscape' : 'portrait';
    
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    setState({
      breakpoint,
      isMobile,
      isTablet,
      isDesktop,
      width,
      height,
      orientation,
      isTouchDevice,
    });
  }, []);

  useEffect(() => {
    updateState();

    const handleResize = () => {
      updateState();
    };

    const handleOrientationChange = () => {
      setTimeout(updateState, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateState]);

  return state;
}
