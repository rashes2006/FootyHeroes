import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  joinMatch: (matchId: string) => void;
  leaveMatch: (matchId: string) => void;
}

const SocketContext = createContext<SocketContextType>({ socket: null, joinMatch: () => {}, leaveMatch: () => {} });

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 50,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => console.log('🔌 Socket connected'));
    s.on('disconnect', () => console.log('🔌 Socket disconnected'));

    socketRef.current = s;

    return () => { s.disconnect(); };
  }, []);

  const joinMatch = (matchId: string) => {
    socketRef.current?.emit('match:join', matchId);
  };

  const leaveMatch = (matchId: string) => {
    socketRef.current?.emit('match:leave', matchId);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, joinMatch, leaveMatch }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
