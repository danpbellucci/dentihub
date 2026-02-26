import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Lock, Loader2, CheckCircle, ShieldCheck } from 'lucide-react';

interface SubscriptionPaymentModalProps {
  planName: string;
  price: string;
  onClose: () => void;
}

const SubscriptionPaymentModal: React.FC<SubscriptionPaymentModalProps> = ({ planName, price, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    // Confirma o pagamento usando o PaymentElement
    // A opção redirect: 'if_required' impede que o Stripe tente redirecionar a página 
    // se o pagamento for aprovado imediatamente (evitando erros em ambientes como o IDX).
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Redireciona de volta para a página de configurações com um parâmetro de sucesso
        // FIX: Aponta para a rota correta do dashboard
        return_url: `${window.location.origin}/dashboard/settings?success=true`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Ocorreu um erro desconhecido.');
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Pagamento confirmado com sucesso sem necessidade de redirect (ex: cartão simples)
      // Manuseamos o sucesso manualmente:
      
      // 1. Atualiza a URL para que o SettingsPage detecte o sucesso ao recarregar
      window.location.hash = '/dashboard/settings?success=true';
      
      // 2. Recarrega a página para processar a lógica de pós-pagamento
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gray-900 p-5 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-white">Assinar Plano {planName}</h3>
            <p className="text-sm text-gray-400 font-medium">{price} / mês</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-900">
          <div className="flex items-center justify-center mb-6 text-green-400 bg-green-900/20 p-3 rounded-lg border border-green-500/20">
             <ShieldCheck className="mr-2 h-5 w-5" />
             <span className="text-sm font-bold">Ambiente Seguro (SSL)</span>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Esqueleto de carregamento */}
            {!isReady && (
              <div className="space-y-4 mb-6">
                <div className="h-10 bg-gray-800 rounded w-full animate-pulse"></div>
                <div className="h-10 bg-gray-800 rounded w-full animate-pulse"></div>
                <div className="h-10 bg-gray-800 rounded w-full animate-pulse"></div>
              </div>
            )}

            {/* 
                PaymentElement deve permanecer no DOM para inicializar corretamente. 
                Usamos 'opacity-0' e 'absolute' quando não pronto para evitar display:none que quebra o iframe.
            */}
            <div className={!isReady ? 'opacity-0 absolute -z-10' : 'block mb-6 animate-fade-in'}>
                <PaymentElement 
                    onReady={() => setIsReady(true)}
                    options={{
                        layout: 'tabs'
                    }}
                />
            </div>
            
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-900/20 text-red-400 text-sm rounded border border-red-500/20 flex items-start">
                 <span className="font-bold mr-1">Erro:</span> {errorMessage}
              </div>
            )}

            <button 
              type="submit" 
              disabled={!stripe || processing || !isReady}
              className="w-full mt-2 bg-primary text-white py-3.5 rounded-lg font-bold hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-lg shadow-blue-900/20"
            >
              {processing ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20}/> Processando...
                </>
              ) : (
                `Pagar e Assinar`
              )}
            </button>
          </form>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-900 p-3 text-center border-t border-white/10">
          <p className="text-xs text-gray-500 flex items-center justify-center">
            <Lock size={10} className="mr-1" /> 
            Pagamento processado seguramente pelo Stripe
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPaymentModal;