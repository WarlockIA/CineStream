import React, { createContext, useContext, useState } from 'react';

const TicketContext = createContext();

export const useTicket = () => {
  return useContext(TicketContext);
};

export const TicketProvider = ({ children }) => {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedSnacks, setSelectedSnacks] = useState([]);
  const [currentFunctionId, setCurrentFunctionId] = useState(null);

  const addSeat = (seatNumber) => {
    setSelectedSeats((prev) => [...prev, seatNumber]);
  };

  const removeSeat = (seatNumber) => {
    setSelectedSeats((prev) => prev.filter((s) => s !== seatNumber));
  };

  const setSeats = (seats) => {
    setSelectedSeats(seats);
  };

  const addSnack = (snack) => {
    setSelectedSnacks((prev) => {
      const existing = prev.find((s) => s.id === snack.id);
      if (existing) {
        return prev.map((s) => 
          s.id === snack.id ? { ...s, quantity: s.quantity + 1 } : s
        );
      }
      return [...prev, { ...snack, quantity: 1 }];
    });
  };

  const removeSnack = (snackId) => {
    setSelectedSnacks((prev) => {
      const existing = prev.find((s) => s.id === snackId);
      if (existing && existing.quantity > 1) {
        return prev.map((s) =>
          s.id === snackId ? { ...s, quantity: s.quantity - 1 } : s
        );
      }
      return prev.filter((s) => s.id !== snackId);
    });
  };

  const clearSeats = () => {
    setSelectedSeats([]);
    setSelectedSnacks([]);
    setCurrentFunctionId(null);
  };

  return (
    <TicketContext.Provider
      value={{
        selectedSeats,
        selectedSnacks,
        currentFunctionId,
        setCurrentFunctionId,
        addSeat,
        removeSeat,
        setSeats,
        addSnack,
        removeSnack,
        clearSeats,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};
