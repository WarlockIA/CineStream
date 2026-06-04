const lockedSeats = {}; // Format: { functionId: { seatNumber: { socketId, expiresAt } } }

module.exports = (io) => {
  const seatsNamespace = io.of('/seats');

  seatsNamespace.on('connection', (socket) => {
    console.log('User connected to socket:', socket.id);

    // Unirse a una sala específica de la función
    socket.on('join:function', (functionId) => {
      const roomName = `function_${functionId}`;
      socket.join(roomName);
      
      // Enviar los bloqueos actuales al usuario que acaba de entrar
      const currentLocks = lockedSeats[functionId] || {};
      socket.emit('seat:initial_locks', currentLocks);
    });

    socket.on('seat:lock', ({ functionId, seatNumber }) => {
      if (!lockedSeats[functionId]) {
        lockedSeats[functionId] = {};
      }

      const now = Date.now();

      // Verificar si ya está bloqueado por otro
      if (lockedSeats[functionId][seatNumber]) {
        const lock = lockedSeats[functionId][seatNumber];
        if (lock.expiresAt > now && lock.socketId !== socket.id) {
          socket.emit('seat:error', { message: 'Este asiento ya no está disponible' });
          return;
        }
      }

      // Bloquear o renovar bloqueo
      lockedSeats[functionId][seatNumber] = {
        socketId: socket.id,
        expiresAt: now + 5 * 60 * 1000 // 5 minutos
      };

      // Emitir actualización a toda la sala
      seatsNamespace.to(`function_${functionId}`).emit('seat:update', {
        functionId,
        seatNumber,
        status: 'blocked'
      });

      // Timeout para liberar automáticamente después de 5 min
      setTimeout(() => {
        if (lockedSeats[functionId] && lockedSeats[functionId][seatNumber]) {
          const lock = lockedSeats[functionId][seatNumber];
          // Si sigue siendo el mismo lock (no fue renovado ni cambiado) y ya expiró
          if (lock.socketId === socket.id && lock.expiresAt <= Date.now() + 100) {
             delete lockedSeats[functionId][seatNumber];
             seatsNamespace.to(`function_${functionId}`).emit('seat:update', {
               functionId,
               seatNumber,
               status: 'available'
             });
          }
        }
      }, 5 * 60 * 1000);
    });

    socket.on('seat:unselect', ({ functionId, seatNumber }) => {
      if (lockedSeats[functionId] && lockedSeats[functionId][seatNumber]) {
        const lock = lockedSeats[functionId][seatNumber];
        if (lock.socketId === socket.id) {
          delete lockedSeats[functionId][seatNumber];
          seatsNamespace.to(`function_${functionId}`).emit('seat:update', {
            functionId,
            seatNumber,
            status: 'available'
          });
        }
      }
    });

    // Liberar si el usuario se desconecta
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (const fId in lockedSeats) {
        for (const sNum in lockedSeats[fId]) {
          if (lockedSeats[fId][sNum].socketId === socket.id) {
            delete lockedSeats[fId][sNum];
            seatsNamespace.to(`function_${fId}`).emit('seat:update', {
              functionId: fId,
              seatNumber: sNum,
              status: 'available'
            });
          }
        }
      }
    });
  });
};
