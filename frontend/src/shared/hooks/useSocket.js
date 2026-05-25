/**
 * Hook y utilidad para la conexion WebSocket con el servidor.
 * La instancia del socket es un singleton a nivel de modulo para evitar
 * conexiones duplicadas entre rerenders y cambios de ruta.
 */

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@shared/store/authStore';
import { useUiStore } from '@shared/store/uiStore';

/** Instancia compartida del socket (singleton de modulo). */
let socketInstance = null;

/**
 * Hook que conecta al servidor WebSocket y registra manejadores de eventos.
 * La conexion se crea una sola vez cuando el usuario esta autenticado.
 * Los handlers se leen desde una ref para evitar re-suscripciones en cada render.
 *
 * @param {Object} [handlers={}] - Manejadores de eventos del socket.
 * @param {Function} [handlers.onSensorUpdate] - Datos en tiempo real de sensor.
 * @param {Function} [handlers.onNewAlert] - Nueva alerta generada.
 * @param {Function} [handlers.onNewNotification] - Nueva notificacion del sistema.
 * @param {Function} [handlers.onSystemStatus] - Estado del sistema.
 */
export const useSocket = (handlers = {}) => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { incrementUnread } = useUiStore();
  /* Ref para evitar que los cambios de handlers provoquen re-suscripciones */
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

/**
 * Desconecta el socket y limpia la instancia del singleton.
 * Debe llamarse al cerrar sesion para evitar eventos fantasma.
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
