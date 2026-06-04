import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toastSuccess, toastError } from '../utils/toastHelper';
import { Film } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import AdminInventory from './AdminInventory';
import AdminAudit from './AdminAudit';
import AdminCoupons from './AdminCoupons';
import { getBoliviaDate, toBoliviaInputString, toBoliviaISOWithOffset } from '../utils/dateHelper';

export default function AdminPanel() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  // Estado UI General
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'movie' | 'function' | 'inventory'
  const [loading, setLoading] = useState(false);

  // Estados Formulario: Película
  const [movieData, setMovieData] = useState({
    title: '', synopsis: '', duration: '', genre: [], rating: ''
  });
  const [file, setFile] = useState(null);
  const [editingMovieId, setEditingMovieId] = useState(null);

  // Estados Filtros Catálogo
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogGenreFilter, setCatalogGenreFilter] = useState('ALL');
  const [catalogSortOrder, setCatalogSortOrder] = useState('NEWEST'); // 'NEWEST' | 'AZ' | 'ZA'

  // Estados Formulario: Función
  const [functionData, setFunctionData] = useState({
    movieId: '', roomId: '', startTime: '', price: ''
  });
  const [availableMovies, setAvailableMovies] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [functionsList, setFunctionsList] = useState([]);
  const [editingFunctionId, setEditingFunctionId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFunctionModal, setShowFunctionModal] = useState(false);
  const modalOpenTimeRef = React.useRef(0);
  const [movieSearchQuery, setMovieSearchQuery] = useState('');
  const [movieDropdownOpen, setMovieDropdownOpen] = useState(false);
  const movieDropdownRef = React.useRef(null);
  const [dragState, setDragState] = useState(null);
  const [hoveredFuncId, setHoveredFuncId] = useState(null);
  const [hoveredFuncDetails, setHoveredFuncDetails] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Helper date functions
  const formatDateKey = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getCinemaDayString = (dateObj) => {
    const d = getBoliviaDate(dateObj);
    if (d.getHours() < 2) {
      d.setDate(d.getDate() - 1);
    }
    return formatDateKey(d);
  };
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cascadeDeletePrompt, setCascadeDeletePrompt] = useState(null);
  const [functionToDelete, setFunctionToDelete] = useState(null);

  // Fetch Películas y Salas (Para Formulario de Funciones)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moviesRes, roomsRes, functionsRes] = await Promise.all([
          axios.get('http://localhost:3000/api/movies'),
          axios.get('http://localhost:3000/api/rooms'),
          axios.get('http://localhost:3000/api/functions?includeInactive=true')
        ]);
        setAvailableMovies(moviesRes.data.data);
        setAvailableRooms(roomsRes.data.data);
        setFunctionsList(functionsRes.data.data);
      } catch (error) {
        console.error("Error al cargar datos para el formulario:", error);
      }
    };
    fetchData();
  }, [activeTab]); // Recarga si se cambia de pestaña para tener la lista fresca

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (movieDropdownRef.current && !movieDropdownRef.current.contains(event.target)) {
        setMovieDropdownOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMovieDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ----- HANDLERS PELÍCULA -----
  const handleMovieChange = (e) => setMovieData({ ...movieData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => { if (e.target.files && e.target.files[0]) setFile(e.target.files[0]); };

  const AVAILABLE_GENRES = [
    'Acción', 'Animación', 'Aventura', 'Ciencia Ficción', 'Comedia', 
    'Crimen', 'Documental', 'Drama', 'Fantasía', 'Gore', 
    'Misterio', 'Romance', 'Superhéroe', 'Suspenso', 'Terror'
  ];

  const toggleGenre = (g) => {
    setMovieData(prev => ({
      ...prev,
      genre: prev.genre.includes(g) ? prev.genre.filter(x => x !== g) : [...prev.genre, g]
    }));
  };

  const handleMovieSubmit = async (e) => {
    e.preventDefault();
    if (movieData.genre.length === 0) {
      return toastError('Debes seleccionar al menos un género para la película.');
    }
    setLoading(true);

    try {
      const data = new FormData();
      Object.keys(movieData).forEach(key => {
        if (key === 'genre') {
          data.append('genre', JSON.stringify(movieData.genre));
        } else {
          data.append(key, movieData[key]);
        }
      });
      if (file) data.append('poster', file);

      let response;
      if (editingMovieId) {
        response = await axios.put(`http://localhost:3000/api/movies/${editingMovieId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
        });
        toastSuccess(`¡Película "${response.data.data.title}" actualizada correctamente!`);
      } else {
        response = await axios.post('http://localhost:3000/api/movies', data, {
          headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
        });
        toastSuccess(`¡Película "${response.data.data.title}" añadida!`);
      }

      setMovieData({ title: '', synopsis: '', duration: '', genre: [], rating: '' });
      setFile(null);
      setEditingMovieId(null);
      if (e.target.reset) e.target.reset();
      
      // Recargar lista de películas
      const moviesRes = await axios.get('http://localhost:3000/api/movies');
      setAvailableMovies(moviesRes.data.data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMovieActive = async (movie) => {
    const { id, is_active } = movie;
    const isActive = is_active !== false;

    if (isActive) {
      // Si la película está activa, verificar si tiene funciones futuras
      const hasFutureFunctions = functionsList.some(
        f => f.movieId === id && new Date(f.startTime) > new Date()
      );
      if (hasFutureFunctions) {
        setCascadeDeletePrompt({ id, title: movie.title });
      } else {
        await executeToggleMovieActive(id, false);
      }
    } else {
      await executeToggleMovieActive(id, true);
    }
  };

  const executeToggleMovieActive = async (id, willActivate) => {
    try {
      setLoading(true);
      const response = await axios.patch(`http://localhost:3000/api/movies/${id}/toggle-active`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const updatedMovie = response.data.data;
      toastSuccess(`Película "${updatedMovie.title}" ${updatedMovie.is_active ? 'activada' : 'desactivada'} correctamente.`);
      
      setAvailableMovies(prev => prev.map(m => m.id === id ? updatedMovie : m));
      
      // Si se desactiva, remover localmente las funciones futuras de esa película
      if (!updatedMovie.is_active) {
        setFunctionsList(prev => prev.filter(f => !(f.movieId === id && new Date(f.startTime) > new Date())));
      }
      
      if (editingMovieId === id && !updatedMovie.is_active) {
        handleCancelEditMovie();
      }
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMovie = (movie) => {
    setMovieData({
      title: movie.title,
      synopsis: movie.synopsis || '',
      duration: movie.duration,
      genre: Array.isArray(movie.genre) ? movie.genre : (movie.genre ? [movie.genre] : []),
      rating: movie.rating || ''
    });
    setEditingMovieId(movie.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditMovie = () => {
    setMovieData({ title: '', synopsis: '', duration: '', genre: [], rating: '' });
    setFile(null);
    setEditingMovieId(null);
  };

  // ----- HANDLERS FUNCIÓN -----
  const snapTo15Minutes = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    
    if (roundedMinutes === 60) {
      date.setHours(date.getHours() + 1);
      date.setMinutes(0);
    } else {
      date.setMinutes(roundedMinutes);
    }
    date.setSeconds(0);
    date.setMilliseconds(0);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const checkLocalOverlap = (roomId, startTimeStr, movieId, excludeFunctionId = null) => {
    if (!roomId || !startTimeStr || !movieId) return false;
    
    const movie = availableMovies.find(m => m.id === movieId);
    if (!movie) return false;
    
    const start = new Date(toBoliviaISOWithOffset(startTimeStr));
    const duration = parseInt(movie.duration) || 0;
    const end = new Date(start.getTime() + (duration + 15) * 60000); // 15 mins cleaning time included
    
    return functionsList.some(func => {
      if (excludeFunctionId && func.id === excludeFunctionId) return false;
      if (func.roomId !== roomId) return false;
      
      const fStart = new Date(func.startTime);
      const fEnd = new Date(func.endTime);
      
      return start < fEnd && end > fStart;
    });
  };

  const handleFunctionChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    
    if (name === 'startTime') {
      newValue = snapTo15Minutes(value);
    }
    
    setFunctionData(prev => {
      const updated = { ...prev, [name]: newValue };
      
      // Sincronizar camelCase y snake_case para compatibilidad total
      if (name === 'movie_id') updated.movieId = value;
      if (name === 'movieId') updated.movie_id = value;
      if (name === 'room_id') updated.roomId = value;
      if (name === 'roomId') updated.room_id = value;
      
      return updated;
    });
  };

  const handleFunctionSubmit = async (e) => {
    e.preventDefault();

    // --- Validaciones locales antes de llamar al servidor ---
    const { movieId, roomId, startTime, price } = functionData;
    if (!movieId || !roomId || !startTime || !price) {
      return toastError('Por favor completa todos los campos obligatorios.');
    }

    const snappedStart = snapTo15Minutes(startTime);
    const hasOverlap = checkLocalOverlap(roomId, snappedStart, movieId, editingFunctionId);
    if (hasOverlap) {
      return toastError('⚠️ La sala ya está ocupada en ese horario (solapamiento detectado localmente). Elige otra hora o sala.');
    }

    // Preparar payload con startTime ajustado a 15 min y offset de Bolivia
    const payload = { movieId, roomId, startTime: toBoliviaISOWithOffset(snappedStart), price };

    setLoading(true);
    try {
      let response;
      if (editingFunctionId) {
        response = await axios.put(
          `http://localhost:3000/api/functions/${editingFunctionId}`,
          payload,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        toastSuccess('¡Función actualizada exitosamente!');
      } else {
        response = await axios.post(
          'http://localhost:3000/api/functions',
          payload,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        toastSuccess('¡Función programada exitosamente!');
      }

      // Refresco inmediato de la lista sin necesidad de re-fetch completo
      const savedFunc = response.data.data;
      // Enriquecer con datos de película y sala para render local
      const enriched = {
        ...savedFunc,
        Movie: availableMovies.find(m => m.id === savedFunc.movieId) || null,
        Room: availableRooms.find(r => r.id === savedFunc.roomId) || null,
      };
      if (editingFunctionId) {
        setFunctionsList(prev => prev.map(f => f.id === editingFunctionId ? enriched : f));
      } else {
        setFunctionsList(prev => [...prev, enriched]);
      }

      setFunctionData({ movieId: '', roomId: '', startTime: '', price: '' });
      setEditingFunctionId(null);
      setShowFunctionModal(false);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditFunction = (func) => {
    setFunctionData({
      movieId: func.movieId,
      roomId: func.roomId,
      startTime: toBoliviaInputString(func.startTime),
      price: func.price
    });
    setEditingFunctionId(func.id);
    setShowFunctionModal(true);
    modalOpenTimeRef.current = Date.now();
  };

  const handleCancelEdit = () => {
    console.log("handleCancelEdit: Closing modal...");
    setFunctionData({ movieId: '', roomId: '', startTime: '', price: '' });
    setEditingFunctionId(null);
    setShowFunctionModal(false);
  };

  const PX_PER_MIN = 2; // scale of 2px per minute, which is 120px per hour

  const handlePointerDown = (e, func) => {
    if (e.button !== 0) return; // Only left-click
    e.stopPropagation();
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.parentElement.getBoundingClientRect();

    const initialLeft = rect.left - parentRect.left;
    const startX = e.clientX;
    const startY = e.clientY;

    setDragState({
      funcId: func.id,
      startX,
      startY,
      initialLeft,
      initialRoomId: func.roomId,
      currentLeft: initialLeft,
      currentRoomId: func.roomId,
      width: rect.width,
      movieTitle: func.Movie?.title || 'N/A'
    });

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!dragState) return;
    e.stopPropagation();

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    const newLeft = dragState.initialLeft + deltaX;

    // Convert newLeft back to minutes from 08:00 AM
    const minOffset = newLeft / PX_PER_MIN;
    const absMins = 480 + minOffset;
    
    // Snap to nearest 15 mins
    const roundedMins = Math.round(absMins / 15) * 15;
    
    // Clamp to scheduler limits (08:00 AM to 01:00 AM next day)
    const clampedMins = Math.max(480, Math.min(1500, roundedMins));
    const snappedLeft = (clampedMins - 480) * PX_PER_MIN;

    // Calculate room row offsets (using h-20 row height = 80px)
    const rowOffset = Math.round(deltaY / 80);
    const roomsCount = availableRooms.length;
    const initialRoomIdx = availableRooms.findIndex(r => r.id === dragState.initialRoomId);
    const targetRoomIdx = Math.max(0, Math.min(roomsCount - 1, initialRoomIdx + rowOffset));
    const targetRoomId = availableRooms[targetRoomIdx].id;

    setDragState(prev => ({
      ...prev,
      currentLeft: snappedLeft,
      currentRoomId: targetRoomId
    }));
  };

  const handlePointerUp = async (e, func) => {
    if (!dragState) return;
    e.stopPropagation();

    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch (err) {}

    const { currentLeft, currentRoomId, funcId, initialLeft, initialRoomId } = dragState;
    setDragState(null);

    // Si no hubo cambio real, salir
    if (currentLeft === initialLeft && currentRoomId === initialRoomId) return;

    const minOffset = currentLeft / PX_PER_MIN;
    const absMins = 480 + minOffset;
    // Snap estricto a 15 min
    const snappedAbsMins = Math.round(absMins / 15) * 15;

    const baseDate = getBoliviaDate(selectedDate);
    baseDate.setHours(0, 0, 0, 0);
    const targetDate = new Date(baseDate.getTime() + snappedAbsMins * 60 * 1000);
    
    // Obtener campos locales de targetDate (que representan hora de Bolivia) y construir ISO con offset
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const hh = String(targetDate.getHours()).padStart(2, '0');
    const min = String(targetDate.getMinutes()).padStart(2, '0');
    const boliviaISO = `${yyyy}-${mm}-${dd}T${hh}:${min}:00-04:00`;

    const existingFunc = functionsList.find(f => f.id === funcId);
    if (!existingFunc) return;

    // Validación local de solapamiento antes de llamar al servidor
    const hasOverlap = checkLocalOverlap(currentRoomId, boliviaISO, existingFunc.movieId, funcId);
    if (hasOverlap) {
      toastError('⚠️ La sala ya está ocupada en ese horario. El bloque fue devuelto a su posición original.');
      return;
    }

    setLoading(true);
    try {
      const updatedData = {
        movieId: existingFunc.movieId,
        roomId: currentRoomId,
        startTime: boliviaISO,
        price: existingFunc.price
      };

      const response = await axios.put(
        `http://localhost:3000/api/functions/${funcId}`,
        updatedData,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      toastSuccess('¡Función reprogramada!');
      // Refresco inmediato del estado local
      const savedFunc = response.data.data;
      const enriched = {
        ...savedFunc,
        Movie: existingFunc.Movie,
        Room: availableRooms.find(r => r.id === currentRoomId) || existingFunc.Room,
      };
      setFunctionsList(prev => prev.map(f => f.id === funcId ? enriched : f));
    } catch (err) {
      handleError(err);
      // En error, re-sincronizar desde el servidor para asegurar consistencia
      const res = await axios.get('http://localhost:3000/api/functions?includeInactive=true');
      setFunctionsList(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    console.log("handleOpenCreateModal: Opening modal...");
    setFunctionData({ movieId: '', roomId: '', startTime: '', price: '50.00' });
    setEditingFunctionId(null);
    setShowFunctionModal(true);
    modalOpenTimeRef.current = Date.now();
  };

  const handleTimelineDoubleClick = (e, roomId) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const minutesFromStart = clickX / PX_PER_MIN;
    const absoluteMinutes = 480 + minutesFromStart;
    const roundedMins = Math.round(absoluteMinutes / 15) * 15;

    const baseDate = getBoliviaDate(selectedDate);
    baseDate.setHours(0, 0, 0, 0);
    const targetDate = new Date(baseDate.getTime() + roundedMins * 60 * 1000);
    
    // Obtener campos locales de targetDate (que representan hora de Bolivia) y construir formato para datetime-local
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const hh = String(targetDate.getHours()).padStart(2, '0');
    const min = String(targetDate.getMinutes()).padStart(2, '0');
    const localDateTime = `${yyyy}-${mm}-${dd}T${hh}:${min}`;

    setFunctionData({
      movieId: '',
      roomId: roomId,
      startTime: localDateTime,
      price: '50.00'
    });
    setEditingFunctionId(null);
    setShowFunctionModal(true);
    modalOpenTimeRef.current = Date.now();
  };

  const getRoomColorStyles = (roomId) => {
    const colors = [
      { border: 'border-l-emerald-500', bg: 'bg-emerald-950/45 hover:bg-emerald-900/50', borderHover: 'hover:border-emerald-400', text: 'text-emerald-400' },
      { border: 'border-l-violet-500', bg: 'bg-violet-950/45 hover:bg-violet-900/50', borderHover: 'hover:border-violet-400', text: 'text-violet-400' },
      { border: 'border-l-sky-500', bg: 'bg-sky-950/45 hover:bg-sky-900/50', borderHover: 'hover:border-sky-400', text: 'text-sky-400' },
      { border: 'border-l-amber-500', bg: 'bg-amber-950/45 hover:bg-amber-900/50', borderHover: 'hover:border-amber-400', text: 'text-amber-400' },
      { border: 'border-l-rose-500', bg: 'bg-rose-950/45 hover:bg-rose-900/50', borderHover: 'hover:border-rose-400', text: 'text-rose-400' }
    ];
    const index = availableRooms.findIndex(r => r.id === roomId);
    return colors[index >= 0 ? index % colors.length : 0];
  };

  const handleMouseEnterFunc = async (e, funcId) => {
    setHoveredFuncId(funcId);
    setHoveredFuncDetails(null); // loading indicator

    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 288; // w-72 = 18rem = 288px
    const xOriginal = rect.left + rect.width / 2;
    let xClamped = xOriginal;
    
    // Evitar desbordamiento izquierdo
    if (xClamped - tooltipWidth / 2 < 10) {
      xClamped = tooltipWidth / 2 + 10;
    }
    // Evitar desbordamiento derecho
    if (xClamped + tooltipWidth / 2 > window.innerWidth - 10) {
      xClamped = window.innerWidth - tooltipWidth / 2 - 10;
    }

    // Evitar desbordamiento superior
    const renderBelow = rect.top < 220;

    setTooltipPos({
      x: xOriginal,
      clampedX: xClamped,
      y: renderBelow ? rect.bottom + 10 : rect.top - 10,
      renderBelow: renderBelow
    });

    try {
      const res = await axios.get(`http://localhost:3000/api/functions/${funcId}`);
      setHoveredFuncId(currentId => {
        if (currentId === funcId) {
          setHoveredFuncDetails(res.data.data);
        }
        return currentId;
      });
    } catch (err) {
      console.error("Error loading function details for tooltip:", err);
    }
  };

  const handleMouseLeaveFunc = () => {
    setHoveredFuncId(null);
    setHoveredFuncDetails(null);
  };

  const handleDeleteFunction = (id) => {
    const func = functionsList.find(f => f.id === id);
    if (func) setFunctionToDelete(func);
  };

  const confirmDeleteFunction = async () => {
    if (!functionToDelete) return;
    try {
      await axios.delete(`http://localhost:3000/api/functions/${functionToDelete.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toastSuccess('Función eliminada correctamente.');
      setFunctionsList(functionsList.filter(f => f.id !== functionToDelete.id));
      setFunctionToDelete(null);
    } catch (error) {
      handleError(error);
      setFunctionToDelete(null);
    }
  };

  const handleError = (error) => {
    if (error.response?.data?.errors) {
      const errorMsgs = error.response.data.errors.map(err => err.msg).join(' | ');
      toastError(errorMsgs);
    } else if (error.response?.data?.message) {
      toastError(error.response.data.message);
    } else {
      toastError('Error de conexión con el servidor.');
    }
  };

  // Definición de nav items del sidebar
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      ),
    },
    {
      id: 'movie',
      label: 'Catálogo',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      id: 'function',
      label: 'Programar Función',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'inventory',
      label: 'Inventario',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: 'audit',
      label: 'Historial',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'coupons',
      label: 'Cupones',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-screen bg-brand-dark flex flex-col overflow-hidden">

      {/* ── Navbar ── */}
      <nav className="navbar nav-premium flex justify-between items-center sticky top-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-3 select-none">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <div className="w-full h-full bg-[#070B14] rounded-[9px] flex items-center justify-center">
              <Film className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="logo-text-premium leading-none">
              CineStream
            </h1>
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block mt-1">🛠️ Panel Administrador</span>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          {/* User info + avatar (Clickable to Profile) */}
          <div 
            onClick={() => navigate('/profile')}
            className="vip-profile-card"
          >
            <div className="vip-avatar-container">
              <div className="vip-avatar-content">
                {user?.fullname ? user.fullname.charAt(0).toUpperCase() : 'A'}
              </div>
            </div>
            <div className="hidden md:flex vip-profile-info">
              <span className="vip-profile-name">
                {user?.fullname || 'Administrador'}
              </span>
              <span className="vip-profile-badge">
                <span className="vip-profile-crown">🛠️</span> Administrador
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <button
            onClick={handleLogout}
            className="logout-btn-hud flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </nav>

      {/* ── Layout: Sidebar + Content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="sidebar py-4 shrink-0">
          <div className="px-3 mb-4">
            <p className="text-2xs text-slate-600 uppercase tracking-widest font-semibold px-2">Navegación</p>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={activeTab === item.id ? 'sidebar-item-active' : 'sidebar-item'}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
                {activeTab === item.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-primary" />
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && <AdminDashboard />}

        {/* FORMULARIO Y CATÁLOGO DE PELÍCULA */}
        {activeTab === 'movie' && (() => {
          // Lógica de filtrado de catálogo
          let filteredMovies = [...availableMovies];
          
          if (catalogSearch.trim()) {
            filteredMovies = filteredMovies.filter(m => m.title.toLowerCase().includes(catalogSearch.toLowerCase()));
          }
          if (catalogGenreFilter !== 'ALL') {
            filteredMovies = filteredMovies.filter(m => Array.isArray(m.genre) && m.genre.includes(catalogGenreFilter));
          }
          if (catalogSortOrder === 'AZ') {
            filteredMovies.sort((a, b) => a.title.localeCompare(b.title));
          } else if (catalogSortOrder === 'ZA') {
            filteredMovies.sort((a, b) => b.title.localeCompare(a.title));
          } else {
            // NEWEST - Assuming higher ID or reverse order by default if no date is present
            filteredMovies.sort((a, b) => b.id - a.id);
          }

          return (
          <div className="space-y-10 animate-fade-in">
            <form onSubmit={handleMovieSubmit} className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12),_0_0_40px_rgba(56,189,248,0.05)] max-w-3xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl" />
              <div className="mb-8 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-display font-bold text-white tracking-tight">
                    {editingMovieId ? `Editando Película: ${movieData.title || '...'}` : 'Registrar Nueva Película'}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    {editingMovieId ? 'Modifica los datos de la película en el catálogo.' : 'Completa los datos para añadir una película al catálogo.'}
                  </p>
                </div>

              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <div className="input-floating-wrapper">
                    <input required type="text" name="title" value={movieData.title} onChange={handleMovieChange} className="input-floating-field" placeholder=" " />
                    <label className="input-floating-label">Título *</label>
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <div className="input-floating-wrapper">
                    <textarea name="synopsis" rows="3" value={movieData.synopsis} onChange={handleMovieChange} className="input-floating-field resize-none" placeholder=" "></textarea>
                    <label className="input-floating-label">Sinopsis</label>
                  </div>
                </div>
                <div>
                  <div className="input-floating-wrapper">
                    <input required type="number" min="1" name="duration" value={movieData.duration} onChange={handleMovieChange} className="input-floating-field" placeholder=" " />
                    <label className="input-floating-label">Duración (minutos) *</label>
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="form-label">Géneros (Selecciona al menos 1) *</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AVAILABLE_GENRES.map(g => {
                      const isSelected = movieData.genre.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleGenre(g)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isSelected 
                              ? 'bg-brand-primary text-white border border-transparent shadow-lg shadow-brand-primary/20' 
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="form-label">Póster (JPG/PNG)</label>
                  <input type="file" accept="image/jpeg, image/png" onChange={handleFileChange}
                    className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-primary/20 file:text-brand-primary file:font-medium hover:file:bg-brand-primary/30 file:transition-colors cursor-pointer" />
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-700/50 flex items-center justify-end gap-3">
                {editingMovieId && (
                  <button
                    type="button"
                    onClick={handleCancelEditMovie}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-600/60 bg-slate-800/60 text-slate-300 hover:bg-red-500/15 hover:border-red-500/50 hover:text-red-400 transition-all text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancelar
                  </button>
                )}
                <button type="submit" disabled={loading} className="btn-emerald px-8 py-3 rounded-xl text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  {loading ? (
                    <><svg className="animate-spin mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Guardando...</>
                  ) : (editingMovieId ? 'Actualizar Película' : 'Registrar Película')}
                </button>
              </div>
            </form>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-display font-bold text-white tracking-tight">Catálogo de Películas</h2>
                  <p className="text-slate-400 text-sm mt-1">Gestiona las películas registradas. Elimina duplicados o errores.</p>
                </div>
                
                {/* Control Bar & Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                    <input 
                      type="text" 
                      placeholder="Buscar película..." 
                      className="pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full sm:w-48 transition-all"
                      value={catalogSearch}
                      onChange={e => setCatalogSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="px-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    value={catalogGenreFilter}
                    onChange={e => setCatalogGenreFilter(e.target.value)}
                  >
                    <option value="ALL">Todos los Géneros</option>
                    {AVAILABLE_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select 
                    className="px-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    value={catalogSortOrder}
                    onChange={e => setCatalogSortOrder(e.target.value)}
                  >
                    <option value="NEWEST">Más Recientes</option>
                    <option value="AZ">A - Z</option>
                    <option value="ZA">Z - A</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-300 uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th className="px-3 py-4 w-[1%] whitespace-nowrap">Póster</th>
                      <th className="px-3 py-4">Título</th>
                      <th className="px-3 py-4">Género</th>
                      <th className="px-3 py-4 w-[1%] whitespace-nowrap">Duración</th>
                      <th className="px-3 py-4 w-[1%] whitespace-nowrap">Estado</th>
                      <th className="px-3 py-4 text-right w-[1%] whitespace-nowrap">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredMovies.map(movie => {
                      const isActive = movie.is_active !== false;
                      return (
                        <tr key={movie.id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="px-3 py-3 w-[1%] whitespace-nowrap">
                            <div className="w-12 h-16 poster-shine-wrapper shadow-[0_10px_20px_rgba(0,0,0,0.5)] border border-slate-600/50">
                              <img src={`http://localhost:3000${movie.posterUrl}`} alt={movie.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                          </td>
                          <td className="px-3 py-3 font-bold text-white text-[15px]">{movie.title}</td>
                          <td className="px-3 py-3">
                            <div className="w-full pr-4">
                              {(() => {
                                let genres = [];
                                if (Array.isArray(movie.genre)) {
                                  genres = movie.genre;
                                } else if (typeof movie.genre === 'string') {
                                  try { genres = JSON.parse(movie.genre); } catch(e) {}
                                }
                                
                                if (!genres || genres.length === 0) {
                                  return <span className="text-slate-500 text-xs italic">N/A</span>;
                                }
                                
                                return (
                                  <p className="text-slate-300 text-xs font-medium leading-relaxed">
                                    {genres.join(', ')}
                                  </p>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="px-3 py-3 font-medium w-[1%] whitespace-nowrap">{movie.duration} min</td>
                          <td className="px-3 py-3 w-[1%] whitespace-nowrap">
                            {isActive ? (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'neonPulse 2s infinite' }} />
                                Activa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-amber-500 border border-slate-600">
                                <span className="w-2 h-2 rounded-full bg-amber-500" style={{ animation: 'neonPulseAmber 2s infinite' }} />
                                Inactiva
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right w-[1%] whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => handleEditMovie(movie)} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
                              >
                                <span>✏️</span> Editar
                              </button>
                              <button 
                                onClick={() => handleToggleMovieActive(movie)} 
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-bold uppercase tracking-wider border shadow-sm ${
                                  isActive 
                                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40' 
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border-emerald-500/20 hover:border-emerald-500/40'
                                }`}
                              >
                                <span>{isActive ? '🚫' : '✅'}</span> {isActive ? 'Desactivar' : 'Activar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMovies.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-5 py-12 text-center text-slate-400">
                          No se encontraron películas. {availableMovies.length === 0 ? 'El catálogo está vacío.' : 'Prueba con otros filtros.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}
        {activeTab === 'function' && (
          <div className="space-y-8 animate-fade-in">
            {/* Timeline Scheduler Section */}
            <div className="form-section">
              <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                  <h2 className="text-xl font-display font-bold text-white">Calendario de Funciones</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Visualiza y programa funciones. Arrastra bloques para reprogramar (snap a 15 min).
                  </p>
                </div>
              </div>

              {/* Date Ribbon */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {(() => {
                    const dateRibbon = [];
                    for (let i = 0; i < 7; i++) {
                      const d = new Date();
                      d.setDate(d.getDate() + i);
                      dateRibbon.push(d);
                    }

                    return dateRibbon.map((date, idx) => {
                      const dateStr = formatDateKey(date);
                      const selectedStr = formatDateKey(selectedDate);
                      const isSelected = dateStr === selectedStr;
                      const dayName = idx === 0 ? 'Hoy' : date.toLocaleDateString('es-BO', { weekday: 'short' });
                      const dayNum = date.getDate();
                      
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedDate(date)}
                          className={`flex flex-col items-center min-w-[70px] py-2 px-3 rounded-2xl border transition-all backdrop-blur-md ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-105 font-bold'
                              : 'bg-slate-900/60 text-slate-400 border-slate-700/50 hover:border-slate-500 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold tracking-wider">{dayName}</span>
                          <span className="text-lg font-black mt-0.5">{dayNum}</span>
                        </button>
                      );
                    });
                  })()}
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="btn-emerald flex items-center gap-2 text-xs py-2.5 px-5 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] shrink-0 rounded-xl"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  Nueva Función
                </button>
              </div>

              {/* Timeline Room Grid */}
              <div className="overflow-x-auto border border-slate-700/50 rounded-2xl bg-slate-900/60 backdrop-blur-xl shadow-inner">
                <div style={{ minWidth: '2280px' }}> {/* 17 hours from 08:00 to 01:00 AM next day + room label */}
                  {/* Timeline Header Row */}
                  <div className="flex border-b border-slate-850 h-10 items-center">
                    <div className="w-48 bg-slate-950 sticky left-0 z-30 border-r border-slate-850 h-full flex items-center px-4">
                      <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">Sala</span>
                    </div>
                    <div className="flex relative flex-1">
                      {(() => {
                        const hours = [];
                        for (let h = 8; h <= 25; h++) {
                          const hourVal = h % 24;
                          const label = `${String(hourVal).padStart(2, '0')}:00`;
                          hours.push(
                            <div key={h} className="text-2xs text-slate-500 font-mono select-none px-2 border-r border-slate-850/30 h-10 flex items-center shrink-0" style={{ width: '120px' }}>
                              {label}
                            </div>
                          );
                        }
                        return hours;
                      })()}
                    </div>
                  </div>

                  {/* Room Rows */}
                  {availableRooms.map(room => {
                    const selectedDateString = formatDateKey(selectedDate);
                    const filteredFunctions = functionsList.filter(func => {
                      return getCinemaDayString(new Date(func.startTime)) === selectedDateString;
                    });

                    return (
                      <div key={room.id} className="flex border-b border-slate-850 last:border-0 relative h-20 items-center">
                        {/* Sticky Room Label */}
                        <div className="w-48 bg-slate-950/90 sticky left-0 z-20 border-r border-slate-850 h-full flex flex-col justify-center px-4 shadow-md">
                          <span className="text-sm font-bold text-white">{room.name}</span>
                          <span className="text-2xs text-slate-400">Cap: {room.capacity} as.</span>
                        </div>
                        
                        {/* Visual timeline row */}
                        <div 
                          className="flex-1 relative h-full cursor-crosshair bg-slate-900/10 hover:bg-slate-900/30 transition-colors"
                          onDoubleClick={(e) => handleTimelineDoubleClick(e, room.id)}
                        >
                          {/* Hour grid lines */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {Array.from({ length: 18 }).map((_, i) => (
                              <div key={i} className="h-full border-r border-slate-850/20 shrink-0" style={{ width: '120px' }} />
                            ))}
                          </div>

                          {/* Snapped landing ghost guide box if actively dragging onto this room */}
                          {dragState && dragState.currentRoomId === room.id && (
                            <div 
                              className="absolute h-14 rounded-xl border-2 border-dashed border-brand-accent bg-brand-accent/10 pointer-events-none flex items-center justify-center text-[10px] text-brand-accent font-bold z-10"
                              style={{
                                left: `${dragState.currentLeft}px`,
                                width: `${dragState.width}px`,
                                top: '12px'
                              }}
                            >
                              Soltar: {dragState.movieTitle}
                            </div>
                          )}

                          {/* Function Blocks */}
                          {filteredFunctions.filter(f => f.roomId === room.id).map(func => {
                            const isEditingThis = editingFunctionId === func.id;
                            const isDraggingThis = dragState && dragState.funcId === func.id;
                            
                            // Parse start time relative to 08:00 AM of cinema day
                            const d = getBoliviaDate(func.startTime);
                            let hours = d.getHours();
                            if (hours < 2) hours += 24; // early morning next day belongs to current cinema day
                            const mins = d.getMinutes();
                            const absMins = hours * 60 + mins;
                            const relMins = absMins - 480; // 08:00 AM starts at 480 mins
                            
                            const duration = Math.round((new Date(func.endTime) - new Date(func.startTime)) / 60000);
                            
                            const left = relMins * PX_PER_MIN;
                            const width = duration * PX_PER_MIN;
                            const roomStyles = getRoomColorStyles(func.roomId);
                            const showPoster = width >= 110;

                            return (
                                <div
                                  key={func.id}
                                  data-func-id={func.id}
                                  className={`absolute h-14 rounded-xl pl-3 pr-2.5 py-2 flex items-center gap-2 border-l-[5px] cursor-grab active:cursor-grabbing group transition-all duration-200 select-none z-10 hover:-translate-y-1 hover:scale-[1.03] ${
                                    isDraggingThis 
                                      ? 'opacity-40 border-l-brand-primary border-brand-primary/40 bg-brand-primary/10 scale-95' 
                                      : isEditingThis
                                        ? 'border-l-blue-400 border-t-blue-400/30 border-r-blue-400/30 border-b-blue-400/30 bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                        : `${roomStyles.border} border-t-slate-700/50 border-r-slate-700/50 border-b-slate-700/50 ${roomStyles.bg} border-t border-r border-b hover:border-slate-400 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)]`
                                  }`}
                                style={{
                                  left: `${left}px`,
                                  width: `${width}px`,
                                  top: '12px'
                                }}
                                onPointerDown={(e) => handlePointerDown(e, func)}
                                onPointerMove={handlePointerMove}
                                onPointerUp={(e) => handlePointerUp(e, func)}
                                onMouseEnter={(e) => handleMouseEnterFunc(e, func.id)}
                                onMouseLeave={handleMouseLeaveFunc}
                              >
                                {showPoster && func.Movie?.posterUrl && (
                                  <img 
                                    src={`http://localhost:3000${func.Movie.posterUrl}`} 
                                    alt={func.Movie.title} 
                                    className="hidden sm:block w-7 h-10 object-cover rounded-md shadow-sm border border-slate-750 shrink-0 pointer-events-none"
                                  />
                                )}
                                <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                                  <div className="flex justify-between items-center gap-1">
                                    <span className="text-[10px] sm:text-[10.5px] font-extrabold text-white truncate leading-tight group-hover:text-brand-primary transition-colors">
                                      {func.Movie?.title || 'Sin Título'}
                                    </span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                      <button 
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()} 
                                        onClick={() => handleEditFunction(func)}
                                        className="text-blue-400 hover:text-blue-300 text-xs shrink-0"
                                        title="Editar"
                                      >
                                        ✏️
                                      </button>
                                      <button 
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()} 
                                        onClick={() => handleDeleteFunction(func.id)}
                                        className="text-red-400 hover:text-red-300 text-xs shrink-0"
                                        title="Eliminar"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center text-[9px] font-mono leading-none">
                                    <span className="text-slate-400">
                                      {new Date(func.startTime).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })}
                                    </span>
                                    <span className="text-brand-gold font-bold">
                                      Bs. {func.price}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* List Table Below */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
              <div className="mb-8 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-display font-bold text-white tracking-tight">Cartelera Programada ({selectedDate.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })})</h2>
                  <p className="text-slate-400 text-sm mt-1">Lista de funciones para la fecha seleccionada arriba.</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-300 uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th className="px-5 py-4">Película</th>
                      <th className="px-5 py-4">Sala</th>
                      <th className="px-5 py-4">Inicio</th>
                      <th className="px-5 py-4">Fin (Est.)</th>
                      <th className="px-5 py-4">Precio</th>
                      <th className="px-5 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {(() => {
                      const selectedDateString = formatDateKey(selectedDate);
                      const filteredFunctions = functionsList.filter(func => {
                        return getCinemaDayString(new Date(func.startTime)) === selectedDateString;
                      });

                      if (filteredFunctions.length === 0) {
                        return (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-slate-500">No hay funciones programadas para este día.</td>
                          </tr>
                        );
                      }

                      return filteredFunctions.map(func => (
                        <tr key={func.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {func.Movie?.posterUrl ? (
                                <img src={`http://localhost:3000${func.Movie.posterUrl}`} alt="poster" className="w-8 h-12 object-cover rounded shadow-sm border border-slate-700/50" />
                              ) : (
                                <div className="w-8 h-12 bg-slate-800 rounded flex items-center justify-center border border-slate-700/50">🎬</div>
                              )}
                              <span className="font-medium text-white">{func.Movie?.title || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{func.Room?.name || 'N/A'}</td>
                          <td className="px-4 py-3">{new Date(func.startTime).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/La_Paz' })}</td>
                          <td className="px-4 py-3">{new Date(func.endTime).toLocaleString('es-BO', { timeStyle: 'short', timeZone: 'America/La_Paz' })}</td>
                          <td className="px-4 py-3 font-medium text-brand-gold">Bs. {func.price}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleEditFunction(func)} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
                              >
                                <span>✏️</span> Editar
                              </button>
                              <button 
                                onClick={() => handleDeleteFunction(func.id)} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
                              >
                                <span>🗑️</span> Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* INVENTARIO */}
        {activeTab === 'inventory' && <AdminInventory />}

        {/* AUDITORÍA (HU-14) */}
        {activeTab === 'audit' && <AdminAudit />}

        {/* CUPONES DE CRÉDITO */}
        {activeTab === 'coupons' && <AdminCoupons />}

        </div>
      </div>

      {/* TOOLTIP GLOBO FLOTANTE */}
      {hoveredFuncId && tooltipPos.clampedX && (
        <div 
          className={`fixed z-[300] -translate-x-1/2 ${tooltipPos.renderBelow ? '' : '-translate-y-full'} bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 w-72 pointer-events-none transition-all duration-200 animate-fade-in flex flex-col gap-3`}
          style={{
            left: `${tooltipPos.clampedX}px`,
            top: `${tooltipPos.y}px`
          }}
        >
          {/* Puntero dinámico (Caret) */}
          <div 
            className={`absolute w-4 h-4 bg-slate-900 border-slate-700/80 transform rotate-45 -translate-x-1/2 ${tooltipPos.renderBelow ? '-top-2 border-l border-t' : '-bottom-2 border-b border-r'}`}
            style={{
              left: `${tooltipPos.x - (tooltipPos.clampedX - 144)}px`
            }}
          />

          {hoveredFuncDetails ? (
            <>
              {/* Contenido Completo */}
              <div className="flex gap-3">
                <img 
                  src={`http://localhost:3000${hoveredFuncDetails.Movie?.posterUrl}`} 
                  alt={hoveredFuncDetails.Movie?.title} 
                  className="w-16 h-24 object-cover rounded-lg border border-slate-700 shadow-md shrink-0 animate-fade-in"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white leading-tight truncate">
                    {hoveredFuncDetails.Movie?.title || 'Sin Título'}
                  </h4>
                  <p className="text-3xs text-slate-400 mt-1 font-semibold truncate">
                    {(() => {
                      const movie = hoveredFuncDetails.Movie;
                      if (!movie || !movie.genre) return 'N/A';
                      if (Array.isArray(movie.genre)) return movie.genre.join(', ');
                      try {
                        const parsed = JSON.parse(movie.genre);
                        if (Array.isArray(parsed)) return parsed.join(', ');
                      } catch (e) {}
                      return String(movie.genre);
                    })()}
                  </p>
                  <p className="text-3xs text-slate-400 mt-1 font-mono">
                    ⏱ Duración: {hoveredFuncDetails.Movie?.duration} min
                  </p>
                  <p className="text-3xs text-slate-400 mt-1 line-clamp-2">
                    {hoveredFuncDetails.Movie?.synopsis || 'Disfruta de este gran estreno en nuestras salas con el mejor sonido e imagen digital.'}
                  </p>
                  <p className="text-xs text-brand-gold font-bold mt-2">
                    Precio: Bs. {hoveredFuncDetails.price}
                  </p>
                </div>
              </div>
              
              {/* Barra de progreso de aforo */}
              <div className="border-t border-slate-800/80 pt-2.5 mt-0.5 animate-fade-in">
                <div className="flex justify-between items-center text-3xs text-slate-400 mb-1.5">
                  <span className="font-semibold">Aforo Vendido</span>
                  <span className="font-mono text-white font-bold">
                    {hoveredFuncDetails.soldSeats?.length || 0} / {hoveredFuncDetails.Room?.capacity || 0}
                  </span>
                </div>
                {(() => {
                  const sold = hoveredFuncDetails.soldSeats?.length || 0;
                  const cap = hoveredFuncDetails.Room?.capacity || 1;
                  const pct = Math.min(100, Math.round((sold / cap) * 100));
                  return (
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct > 85 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            // Skeleton Loader
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="flex gap-3">
                <div className="w-16 h-24 bg-slate-800 rounded-lg shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                  <div className="h-3 bg-slate-800 rounded w-2/3" />
                </div>
              </div>
              <div className="h-2 bg-slate-800 rounded-full w-full mt-2" />
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
           MODALES EN NIVEL RAÍZ (fuera del overflow context)
      ════════════════════════════════════════════════════════════ */}

      {/* MODAL: PROGRAMAR / EDITAR FUNCIÓN */}
      {showFunctionModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              const diff = Date.now() - modalOpenTimeRef.current;
              if (diff > 1000) {
                handleCancelEdit();
              }
            }
          }}
        >
          <div
            className="relative bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-[0_0_40px_rgba(56,189,248,0.1)] w-full max-w-lg overflow-hidden animate-slide-up"
          >
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white leading-tight">
                    {editingFunctionId ? 'Editar Función' : 'Programar Nueva Función'}
                  </h3>
                  <p className="text-2xs text-slate-500">
                    {editingFunctionId
                      ? 'Modifica los datos de la función.'
                      : 'Completa los campos para añadir una función a la cartelera.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                aria-label="Cerrar modal"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleFunctionSubmit} className="px-6 py-5 space-y-4">

              {/* Película (Custom Searchable Dropdown) */}
              <div>
                <label className="form-label">Película <span className="text-brand-accent">*</span></label>
                {(() => {
                  const selectedMovie = availableMovies.find(m => m.id === functionData.movieId);
                  
                  // Filter movies based on the search query
                  const filteredActive = availableMovies.filter(
                    m => m.is_active !== false && m.title.toLowerCase().includes(movieSearchQuery.toLowerCase())
                  );
                  const filteredInactive = availableMovies.filter(
                    m => m.is_active === false && m.title.toLowerCase().includes(movieSearchQuery.toLowerCase())
                  );
                  
                  return (
                    <div ref={movieDropdownRef} className="relative">
                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setMovieDropdownOpen(!movieDropdownOpen);
                          setMovieSearchQuery(''); // clear query on open
                        }}
                        className={`w-full flex items-center justify-between gap-3 p-3 bg-slate-900 border rounded-xl transition-all outline-none text-left ${
                          movieDropdownOpen 
                            ? 'border-brand-primary shadow-[0_0_12px_rgba(59,130,246,0.35)]' 
                            : 'border-slate-700/80 hover:border-slate-500'
                        }`}
                      >
                        {selectedMovie ? (
                          <div className="flex items-center gap-3">
                            <img 
                              src={`http://localhost:3000${selectedMovie.posterUrl}`} 
                              alt={selectedMovie.title} 
                              className="w-10 h-14 object-cover rounded shadow border border-slate-700 shrink-0" 
                            />
                            <div>
                              <div className="text-sm font-bold text-white leading-tight">{selectedMovie.title}</div>
                              <div className="text-xs text-slate-400 mt-1 font-mono">{selectedMovie.duration} min</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">— Selecciona una película —</span>
                        )}
                        <svg 
                          className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${movieDropdownOpen ? 'rotate-180 text-brand-primary' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown Options Menu */}
                      {movieDropdownOpen && (
                        <div 
                          className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden"
                          style={{ animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}
                        >
                          {/* Search Input Box */}
                          <div className="p-3 border-b border-slate-800">
                            <div className="relative">
                              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              <input
                                type="text"
                                value={movieSearchQuery}
                                onChange={(e) => setMovieSearchQuery(e.target.value)}
                                placeholder="Buscar película..."
                                className="w-full bg-slate-850 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                                autoFocus
                              />
                            </div>
                          </div>

                          {/* Options List */}
                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/40 no-scrollbar">
                            {filteredActive.length === 0 && filteredInactive.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-500 italic">
                                No se encontraron películas.
                              </div>
                            ) : (
                              <>
                                {/* Active Movies Group */}
                                {filteredActive.map(movie => {
                                  const isSelected = movie.id === functionData.movieId;
                                  return (
                                    <button
                                      key={movie.id}
                                      type="button"
                                      onClick={() => {
                                        setFunctionData(prev => ({ ...prev, movieId: movie.id, movie_id: movie.id }));
                                        setMovieDropdownOpen(false);
                                        setMovieSearchQuery('');
                                      }}
                                      className={`w-full flex items-center gap-3 p-2.5 hover:bg-slate-800/50 transition-colors text-left ${
                                        isSelected ? 'bg-brand-primary/10 border-l-2 border-brand-primary' : 'border-l-2 border-transparent'
                                      }`}
                                    >
                                      <img 
                                        src={`http://localhost:3000${movie.posterUrl}`} 
                                        alt={movie.title} 
                                        className="w-10 h-14 object-cover rounded shadow border border-slate-700 shrink-0" 
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-white truncate leading-tight">{movie.title}</div>
                                        <div className="text-3xs text-slate-400 mt-1 font-mono">{movie.duration} min</div>
                                      </div>
                                      {isSelected && (
                                        <span className="text-brand-primary text-xs shrink-0 font-bold pr-2">✓</span>
                                      )}
                                    </button>
                                  );
                                })}

                                {/* Inactive Movies Group */}
                                {filteredInactive.length > 0 && (
                                  <div className="bg-slate-950/20">
                                    <div className="px-3 py-1.5 text-4xs uppercase tracking-wider font-extrabold text-slate-500 bg-slate-950/40">
                                      Inactivas (No Disponibles)
                                    </div>
                                    {filteredInactive.map(movie => (
                                      <div
                                        key={movie.id}
                                        className="w-full flex items-center gap-3 p-2.5 opacity-40 cursor-not-allowed select-none text-left"
                                      >
                                        <img 
                                          src={`http://localhost:3000${movie.posterUrl}`} 
                                          alt={movie.title} 
                                          className="w-10 h-14 object-cover rounded shadow border border-slate-700 shrink-0" 
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-bold text-white truncate leading-tight">{movie.title}</div>
                                          <div className="text-3xs text-slate-400 mt-1 font-mono">{movie.duration} min — inactiva</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Hidden validation field to ensure browser validation of required selection */}
                      <input 
                        type="text" 
                        tabIndex={-1}
                        value={functionData.movieId}
                        onChange={() => {}}
                        required
                        className="absolute inset-x-0 bottom-0 h-0 opacity-0 pointer-events-none" 
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Sala */}
              <div className="input-floating-wrapper mt-2">
                <select
                  name="roomId"
                  value={functionData.roomId}
                  onChange={handleFunctionChange}
                  required
                  className="input-floating-field cursor-pointer"
                >
                  <option value="" disabled hidden></option>
                  {availableRooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name} (Cap: {room.capacity})
                    </option>
                  ))}
                </select>
                <label className="input-floating-label">Sala <span className="text-brand-accent">*</span></label>
              </div>

              {/* Fecha y Hora de Inicio */}
              <div className="input-floating-wrapper mt-2">
                <input
                  type="datetime-local"
                  name="startTime"
                  value={functionData.startTime}
                  onChange={handleFunctionChange}
                  required
                  className="input-floating-field font-mono"
                  step="900"
                  placeholder=" "
                />
                <label className="input-floating-label">
                  Fecha y hora de inicio <span className="text-brand-accent">*</span>
                </label>
                {functionData.startTime && (
                  <p className="mt-2 ml-1 text-2xs text-brand-accent font-mono animate-fade-in">
                    ⏱ Auto-snap: {new Date(functionData.startTime).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              {/* Precio */}
              <div className="mt-2">
                <label className="form-label mb-1.5 block">Precio <span className="text-brand-accent">*</span></label>
                <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-xl overflow-hidden focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-all">
                  <span className="px-3 py-3 text-brand-gold font-bold text-sm border-r border-slate-700/80 bg-slate-800/60 select-none shrink-0">Bs.</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="price"
                    value={functionData.price}
                    onChange={handleFunctionChange}
                    required
                    className="flex-1 bg-transparent text-white font-mono text-sm px-3 py-3 outline-none placeholder-slate-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Indicador de solapamiento en tiempo real */}
              {functionData.movieId && functionData.roomId && functionData.startTime && (
                checkLocalOverlap(functionData.roomId, functionData.startTime, functionData.movieId, editingFunctionId)
                  ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>La sala ya tiene una función que solapa con este horario.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Horario disponible — no hay solapamientos.</span>
                    </div>
                  )
              )}

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !!(functionData.movieId && functionData.roomId && functionData.startTime &&
                      checkLocalOverlap(functionData.roomId, functionData.startTime, functionData.movieId, editingFunctionId))
                  }
                  className="btn-accent px-5 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    editingFunctionId ? 'Actualizar Función' : 'Programar Función'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DESACTIVAR PELICULA */}
      {cascadeDeletePrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 max-w-md w-full" style={{ animation: 'slideUp 0.3s ease-out forwards' }}>
            <div className="flex items-center gap-4 mb-4 text-amber-500">
              <svg className="w-8 h-8 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h3 className="text-lg font-bold text-white leading-tight">Desactivar Película</h3>
            </div>
            <p className="text-slate-300 text-sm mb-6">
              La película <strong className="text-white">"{cascadeDeletePrompt.title}"</strong> tiene funciones futuras programadas. Si procedes a desactivarla:
            </p>
            <ul className="list-disc pl-5 text-slate-300 text-sm mb-6 space-y-2">
              <li>Se ocultará de la cartelera principal (clientes).</li>
              <li>Se <strong className="text-red-400">cancelarán y eliminarán</strong> todas sus funciones futuras.</li>
              <li>Se mantendrán las funciones pasadas en el historial de ventas para reportes y auditoría.</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCascadeDeletePrompt(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  executeToggleMovieActive(cascadeDeletePrompt.id, false);
                  setCascadeDeletePrompt(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Desactivar Película
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar Función */}
      {functionToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setFunctionToDelete(null)}
          />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in" style={{ animationDuration: '0.2s' }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🗑️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Eliminar Función</h3>
                <p className="text-slate-400 text-sm mt-1">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700/50">
              <div className="flex items-center gap-3">
                {functionToDelete.Movie?.posterUrl ? (
                  <img src={`http://localhost:3000${functionToDelete.Movie.posterUrl}`} alt="poster" className="w-10 h-14 object-cover rounded shadow-sm" />
                ) : (
                  <div className="w-10 h-14 bg-slate-800 rounded flex items-center justify-center"><span className="text-xs">🎬</span></div>
                )}
                <div>
                  <p className="font-bold text-slate-200">{functionToDelete.Movie?.title || 'Sin título'}</p>
                  <p className="text-sm text-slate-400">{functionToDelete.Room?.name || 'Sin sala'} • {new Date(functionToDelete.startTime).toLocaleTimeString('es-BO', {hour: '2-digit', minute:'2-digit', hour12: false})}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setFunctionToDelete(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteFunction}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>

    </div>
  );
}
