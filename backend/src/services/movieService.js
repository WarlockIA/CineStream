const movieRepository = require('../repositories/movieRepository');
const fs = require('fs');
const path = require('path');

class MovieService {
  async createMovie(movieData) {
    const newMovie = await movieRepository.create(movieData);
    return newMovie;
  }

  async getAllMovies() {
    return await movieRepository.findAll();
  }

  async updateMovie(id, movieData) {
    const movie = await movieRepository.findById(id);
    if (!movie) {
      const error = new Error('La película especificada no existe.');
      error.status = 404;
      throw error;
    }

    // Si se está actualizando el póster y existe uno anterior (y no es el default)
    if (movieData.posterUrl && movie.posterUrl && movie.posterUrl !== '/public/posters/default-poster.png') {
      try {
        // Asumiendo que el server corre desde backend/ y la ruta es /public/...
        const oldPosterPath = path.join(__dirname, '../../', movie.posterUrl);
        if (fs.existsSync(oldPosterPath)) {
          fs.unlinkSync(oldPosterPath);
        }
      } catch (err) {
        console.error("Error eliminando el póster antiguo:", err);
      }
    }

    await movieRepository.update(id, movieData);
    return await movieRepository.findById(id); // Devolver la actualizada
  }

  async deleteMovie(id, cascade) {
    const movie = await movieRepository.findById(id);
    if (!movie) {
      const error = new Error('La película especificada no existe.');
      error.status = 404;
      throw error;
    }

    if (!cascade) {
      const functionsCount = await movieRepository.countFunctions(id);
      if (functionsCount > 0) {
        const error = new Error('Esta película tiene funciones programadas. ¿Deseas eliminarla junto con todas sus funciones?');
        error.status = 409; // Conflict
        throw error;
      }
    }

    await movieRepository.delete(id);
    return { success: true };
  }

  async toggleActiveMovie(id) {
    const movie = await movieRepository.findById(id);
    if (!movie) {
      const error = new Error('La película especificada no existe.');
      error.status = 404;
      throw error;
    }

    const newActiveState = !movie.is_active;

    // Si la película se desactiva, cancelamos automáticamente sus funciones futuras
    if (!newActiveState) {
      await movieRepository.deleteFutureFunctions(id);
    }

    await movieRepository.update(id, { is_active: newActiveState });
    return await movieRepository.findById(id);
  }
}

module.exports = new MovieService();
