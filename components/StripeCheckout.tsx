
import React, { useState } from 'react';
import { X, Lock, CheckCircle, Loader2 } from 'lucide-react';

interface StripeCheckoutProps {
  planName: string;
  priceId: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({ planName, amount, onClose, onSuccess }) => {
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    // Simula processamento
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
      setTimeout(() => {
          onSuccess();
      }, 1500);
    }, 2000);
  };

  if (success) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6 animate-scale-in">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pagamento Aprovado!</h3>
                <p className="text-gray-600">Seu plano foi atualizado com sucesso.</p>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-gray-800">Assinar Plano {planName}</h3>
            <p className="text-sm text-gray-500">Total: R$ {amount.toFixed(2)} / mês</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Modo de Simulação Ativo</strong>
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              O sistema de pagamentos real não está conectado. Este botão simulará uma transação bem-sucedida para fins de demonstração.
            </p>
          </div>

          <div className="space-y-4 mb-6">
              <div className="bg-gray-100 h-10 rounded animate-pulse w-full"></div>
              <div className="flex gap-4">
                  <div className="bg-gray-100 h-10 rounded animate-pulse w-1/2"></div>
                  <div className="bg-gray-100 h-10 rounded animate-pulse w-1/2"></div>
              </div>
          </div>

          <button 
            onClick={handlePayment}
            disabled={processing}
            className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50 flex justify-center items-center shadow-lg"
          >
            {processing ? <><Loader2 className="animate-spin mr-2"/> Processando...</> : `Simular Pagamento de R$ ${amount.toFixed(2)}`}
          </button>
        </div>
        
        <div className="bg-gray-50 p-3 text-center border-t">
          <p className="text-xs text-gray-400 flex items-center justify-center">
            <Lock size={10} className="mr-1" /> 
            Ambiente de Teste Seguro
          </p>
        </div>
      </div>
    </div>
  );
};

export default StripeCheckout;
