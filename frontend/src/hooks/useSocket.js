import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

let socketInstance = null;

export const useSocket = (handlers = {}) => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { incrementUnread } = useUiStore();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    if (!socketInstance) {
      socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
        auth: { token: accessToken },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
    }

    const socket = socketInstance;

    const onSensorUpdate = (data) => {
      handlersRef.current.onSensorUpdate?.(data);
    };

    const onNewAlert = (data) => {
      handlersRef.current.onNewAlert?.(data);
      incrementUnread();
    };

    const onNewNotification = (data) => {
      // [DEBUG] confirmar recepción del evento WebSocket
      console.log('[Socket] notificacion:nueva recibida:', data);
      incrementUnread();
      handlersRef.current.onNewNotification?.(data);
    };

    const onSystemStatus = (data) => {
      handlersRef.current.onSystemStatus?.(data);
    };

    socket.on('sensor:update', onSensorUpdate);
    socket.on('alerta:nueva', onNewAlert);
    socket.on('notificacion:nueva', onNewNotification);
    socket.on('sistema:estado', onSystemStatus);

    return () => {
      socket.off('sensor:update', onSensorUpdate);
      socket.off('alerta:nueva', onNewAlert);
      socket.off('notificacion:nueva', onNewNotification);
      socket.off('sistema:estado', onSystemStatus);
    };
  }, [isAuthenticated, accessToken]);
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
