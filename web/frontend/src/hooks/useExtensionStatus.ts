import { useState, useEffect, useRef } from 'react';
import { checkExtensionHealth, isExtensionAvailable } from '../utils/extensionBridge';

export interface ExtensionStatusState {
  available: boolean;
  version?: string;
  checking: boolean;
}

export function useExtensionStatus(pollIntervalMs = 5000) {
  const [status, setStatus] = useState<ExtensionStatusState>({
    available: isExtensionAvailable(),
    checking: true,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const check = async () => {
      if (!mountedRef.current) return;
      setStatus(prev => ({ ...prev, checking: true }));
      const health = await checkExtensionHealth();
      if (!mountedRef.current) return;
      setStatus({ available: health.connected, version: health.version, checking: false });
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
