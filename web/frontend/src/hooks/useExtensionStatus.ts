import { useState, useEffect, useRef } from 'react';
import { isExtensionInstalled } from '../utils/extensionBridge';

export interface ExtensionStatusState {
  available: boolean;
  version?: string;
  checking: boolean;
}

export function useExtensionStatus(pollIntervalMs = 5000) {
  const [status, setStatus] = useState<ExtensionStatusState>({
    available: isExtensionInstalled(),
    checking: false,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const check = () => {
      if (!mountedRef.current) return;
      setStatus({ available: isExtensionInstalled(), checking: false });
    };

    check();
    const timer = setInterval(check, pollIntervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [pollIntervalMs]);

  return status;
}
