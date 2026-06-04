const functionRepository = require('../repositories/functionRepository');
const movieRepository = require('../repositories/movieRepository');

const parseBoliviaTime = (timeStr) => {
  if (!timeStr) return new Date();
  if (timeStr instanceof Date) return timeStr;
  
  if (typeof timeStr === 'string') {
    // Si no contiene indicador de zona horaria (Z o +/-XX:XX), asumimos que es hora de Bolivia y forzamos -04:00
    if (!timeStr.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(timeStr)) {
      let normalized = timeStr.trim().replace(' ', 'T');
      if (normalized.includes('T') && normalized.split(':').length === 2) {
        normalized += ':00';
      }
      return new Date(`${normalized}-04:00`);
    }
  }
  return new Date(timeStr);
};

class FunctionService {
  async createFunction(data) {
    const { movieId, roomId, startTime, price } = data;
    
    // 1. Obtener la duración de la película
    const movie = await movieRepository.findById(movieId);
    if (!movie) {
      const error = new Error('La película especificada no existe.');
      error.status = 404;
      throw error;
    }

    // 2. Calcular la hora de finalización (Duración de película + 15 minutos limpieza)
    const start = parseBoliviaTime(startTime);
    const end = new Date(start.getTime() + (movie.duration + 15) * 60000); // 60000 ms = 1 min

    // 3. Verificar si la sala está libre
    const overlap = await functionRepository.checkOverlap(roomId, start, end);
    if (overlap) {
      const error = new Error('La sala ya está ocupada en este horario');
      error.status = 400;
      throw error;
    }

    // 4. Guardar la función si todo está en orden
    return await functionRepository.create({
      movieId,
      roomId,
      startTime: start,
      endTime: end,
      price
    });
  }

  async getFunctions(filters) {
    return await functionRepository.findAll(filters);
  }

  async updateFunction(id, data) {
    const existingFunction = await functionRepository.findById(id);
    if (!existingFunction) {
      const error = new Error('La función especificada no existe.');
      error.status = 404;
      throw error;
    }

    const movieId = data.movieId || existingFunction.movieId;
    const roomId = data.roomId || existingFunction.roomId;
    const startTime = data.startTime || existingFunction.startTime;
    const price = data.price || existingFunction.price;

    // 1. Obtener la duración de la película
    const movie = await movieRepository.findById(movieId);
    if (!movie) {
      const error = new Error('La película especificada no existe.');
      error.status = 404;
      throw error;
    }

    // 2. Calcular la hora de finalización (Duración de película + 15 minutos limpieza)
    const start = parseBoliviaTime(startTime);
    const end = new Date(start.getTime() + (movie.duration + 15) * 60000); // 60000 ms = 1 min

    // 3. Verificar si la sala está libre (excluyendo la función actual)
    const overlap = await functionRepository.checkOverlap(roomId, start, end, id);
    if (overlap) {
      const error = new Error('La sala ya está ocupada en este horario');
      error.status = 400;
      throw error;
    }

    // 4. Actualizar la función si todo está en orden
    return await functionRepository.update(id, {
      movieId,
      roomId,
      startTime: start,
      endTime: end,
      price
    });
  }

  async deleteFunction(id) {
    const existingFunction = await functionRepository.findById(id);
    if (!existingFunction) {
      const error = new Error('La función especificada no existe.');
      error.status = 404;
      throw error;
    }
    await functionRepository.delete(id);
    return { success: true };
  }
}

module.exports = new FunctionService();
