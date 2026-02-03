
import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  // Explicitly declare props to avoid TS error "Property 'props' does not exist on type 'ErrorBoundary'"
  // This can happen in some strict TS configurations or environments where React types aren't fully inferring base properties.
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center font-sans">
          <div className="bg-red-100 p-4 rounded-full mb-6 animate-pulse">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado.</h1>
          <p className="text-gray-600 mb-8 max-w-md leading-relaxed">
            Ocorreu um erro inesperado ao carregar a aplicação no seu dispositivo.
          </p>
          
          <div className="flex flex-col w-full max-w-xs gap-3">
            <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center px-6 py-3 bg-primary text-white rounded-xl hover:bg-sky-600 transition font-bold shadow-lg"
            >
                <RefreshCw className="mr-2 h-5 w-5" />
                Recarregar Página
            </button>
            
            <button
                onClick={() => { window.location.hash = '/'; window.location.reload(); }}
                className="flex items-center justify-center px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-bold"
            >
                <Home className="mr-2 h-5 w-5" />
                Ir para o Início
            </button>
          </div>

          {/* Área técnica para debug se necessário (oculta visualmente para usuário comum mas acessível) */}
          {this.state.error && (
              <details className="mt-12 text-left w-full max-w-md">
                  <summary className="text-xs text-gray-400 cursor-pointer mb-2 list-none text-center">Ver detalhes técnicos</summary>
                  <pre className="text-[10px] text-red-500 bg-red-50 p-4 rounded-lg overflow-auto max-h-40 border border-red-100">
                      {this.state.error.toString()}
                  </pre>
              </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
