import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para que el siguiente renderizado muestre la UI de repuesto.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // También puedes registrar el error en un servicio de reporte de errores
    console.error("Error capturado por ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    if (this.state.hasError) {
      // Puedes renderizar cualquier interfaz de repuesto personalizada
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900/80 rounded-2xl border border-red-500/30 text-center animate-fade-in">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Algo salió mal</h2>
          <p className="text-slate-400 mb-4 max-w-sm">
            Ha ocurrido un error inesperado al cargar esta sección. Por favor, intenta de nuevo.
          </p>
          {this.state.error && (
            <pre className="text-xs text-red-300 bg-red-950 p-2 rounded max-w-md overflow-auto mb-6">
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-6 rounded-lg transition-colors flex items-center"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
