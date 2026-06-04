const { validationResult } = require('express-validator');
const movieService = require('../services/movieService');

class MovieController {
  async createMovie(req, res) {
    // 1. Verificar si hay errores provenientes de express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // 2. Si no hay errores de validación, procedemos a crear la película
    try {
      const movieData = req.body;

      // Si el género viene como string (desde FormData), lo parseamos a arreglo
      if (typeof movieData.genre === 'string') {
        try {
          movieData.genre = JSON.parse(movieData.genre);
        } catch (e) {
          // Si no es un JSON válido, lo convertimos en un arreglo con ese único elemento
          movieData.genre = [movieData.genre];
        }
      }

      // 3. Procesar la imagen del póster
      if (req.file) {
        // Generamos la URL relativa donde se puede acceder a la imagen
        movieData.posterUrl = `/public/posters/${req.file.filename}`;
      } else {
        // Asignamos una imagen por defecto si el admin no subió ninguna
        movieData.posterUrl = '/public/posters/default-poster.png';
      }

      const newMovie = await movieService.createMovie(movieData);

      // Auditoría
      const { logAction } = require('../utils/auditLogger');
      await logAction(
        req.user?.id,
        'MOVIE_CREATED',
        'Movie',
        newMovie.id,
        { title: newMovie.title },
        req
      );

      res.status(201).json({
        success: true,
        message: 'Película registrada exitosamente',
        data: newMovie
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error interno al registrar la película',
        error: error.message
      });
    }
  }

  async getAllMovies(req, res) {
    try {
      const movies = await movieService.getAllMovies();
      res.status(200).json({
        success: true,
        data: movies
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener la lista de películas',
        error: error.message
      });
    }
  }

  async updateMovie(req, res) {
    try {
      const { id } = req.params;
      const movieData = req.body;

      // Parseo de género si viene como string
      if (typeof movieData.genre === 'string') {
        try {
          movieData.genre = JSON.parse(movieData.genre);
        } catch (e) {
          movieData.genre = [movieData.genre];
        }
      }

      // Si se subió un nuevo póster
      if (req.file) {
        movieData.posterUrl = `/public/posters/${req.file.filename}`;
      }

      const updatedMovie = await movieService.updateMovie(id, movieData);

      // Auditoría
      const { logAction } = require('../utils/auditLogger');
      await logAction(
        req.user?.id,
        'MOVIE_UPDATED',
        'Movie',
        updatedMovie.id,
        { title: updatedMovie.title },
        req
      );

      res.status(200).json({
        success: true,
        message: 'Película actualizada exitosamente',
        data: updatedMovie
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Error interno al actualizar la película'
      });
    }
  }

  async deleteMovie(req, res) {
    try {
      const { id } = req.params;
      const cascade = req.query.cascade === 'true';
      
      await movieService.deleteMovie(id, cascade);
      
      // Auditoría
      const { logAction } = require('../utils/auditLogger');
      await logAction(
        req.user?.id,
        'MOVIE_DELETED',
        'Movie',
        id,
        { cascade },
        req
      );

      res.status(200).json({
        success: true,
        message: 'Película eliminada exitosamente'
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Error interno al eliminar la película',
        isConflict: error.status === 409
      });
    }
  }

  async toggleActiveMovie(req, res) {
    try {
      const { id } = req.params;
      const updatedMovie = await movieService.toggleActiveMovie(id);
      
      // Auditoría
      const { logAction } = require('../utils/auditLogger');
      await logAction(
        req.user?.id,
        'MOVIE_TOGGLED',
        'Movie',
        updatedMovie.id,
        { title: updatedMovie.title, is_active: updatedMovie.is_active },
        req
      );

      res.status(200).json({
        success: true,
        message: `Película ${updatedMovie.is_active ? 'activada' : 'desactivada'} exitosamente`,
        data: updatedMovie
      });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Error interno al alternar el estado de la película'
      });
    }
  }
}

module.exports = new MovieController();
