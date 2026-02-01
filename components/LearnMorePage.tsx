
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Clock, ShieldCheck, Database, Mic, Smile, CheckCircle, FileText } from 'lucide-react';

const LearnMorePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 text-primary font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
              <Smile size={28} />
              <span>DentiHub</span>
            </div>
            <button 
              onClick={() => navigate('/')} 
              className="text-gray-500 hover:text-primary transition flex items-center text-sm font-medium"
            >
              <ArrowLeft size={16} className="mr-1" /> Voltar ao Início
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="py-16 sm:py-24 bg-gradient-to-b from-blue-50 to-white px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-primary text-xs font-bold uppercase tracking-wide mb-6">
            Gestão & Tecnologia
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 leading-tight mb-6">
            Por que sua clínica precisa de um ERP com Inteligência Artificial?
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Descubra como a tecnologia está transformando a rotina de dentistas, eliminando a burocracia e devolvendo o foco ao que realmente importa: o paciente.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <article className="max-w-3xl mx-auto px-4 pb-24">
        
        {/* Introduction */}
        <div className="prose prose-lg prose-blue mx-auto text-gray-600 mb-16">
          <p>
            Gerenciar uma clínica odontológica é um desafio que vai muito além da cadeira do dentista. Além da excelência clínica, o profissional precisa lidar com agendamentos, faltas, controle financeiro, estoque e a minuciosa documentação dos pacientes.
          </p>
          <p>
            É aqui que entra o <strong>ERP (Enterprise Resource Planning)</strong>. Diferente de simples agendas de papel ou planilhas desconexas, um ERP centraliza todas as informações do consultório em um único lugar seguro e acessível.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4">
              <Database size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Organização Centralizada</h3>
            <p className="text-sm text-gray-600">
              Adeus às fichas de papel perdidas. Acesse o histórico completo do paciente, sua agenda e fluxo de caixa em segundos, de qualquer dispositivo.
            </p>
          </div>
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Segurança de Dados</h3>
            <p className="text-sm text-gray-600">
              Seus dados são criptografados e salvos na nuvem. Diferente de um HD físico que pode queimar, a nuvem garante que suas informações estejam sempre seguras.
            </p>
          </div>
        </div>

        {/* The Game Changer: AI Section */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden mb-20">
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 opacity-20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-indigo-100 font-medium text-sm mb-6 border border-white/10">
              <Brain size={16} />
              <span>O Futuro da Odontologia</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              A Revolução do Prontuário com IA
            </h2>
            
            <p className="text-indigo-100 text-lg mb-8 leading-relaxed">
              A maioria dos softwares odontológicos apenas digitaliza o papel: você ainda precisa digitar tudo manualmente após cada consulta. O DentiHub muda esse jogo.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 hover:bg-white/20 transition">
                <Mic className="text-purple-300 mb-3" size={28} />
                <h4 className="font-bold text-lg mb-2">Voz para Texto</h4>
                <p className="text-sm text-indigo-100">
                  Não perca tempo digitando. Apenas dite o que foi feito durante o procedimento e nossa IA transcreve tudo com precisão.
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 hover:bg-white/20 transition">
                <FileText className="text-purple-300 mb-3" size={28} />
                <h4 className="font-bold text-lg mb-2">Estruturação SOAP</h4>
                <p className="text-sm text-indigo-100">
                  A Inteligência Artificial organiza automaticamente sua fala no padrão clínico internacional: Subjetivo, Objetivo, Avaliação e Plano.
                </p>
              </div>
            </div>

            <div className="mt-10 p-6 bg-indigo-800/50 rounded-xl border border-indigo-700/50">
              <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                <Clock size={18} className="text-green-400"/>
                Economia Real de Tempo
              </h4>
              <p className="text-sm text-indigo-200">
                Dentistas que utilizam o Prontuário IA economizam, em média, <strong>10 a 15 minutos por consulta</strong>. Ao final do dia, isso significa mais de uma hora livre para descansar ou atender mais pacientes.
              </p>
            </div>
          </div>
        </div>

        {/* Conclusion */}
        <div className="prose prose-lg prose-blue mx-auto text-gray-600 mb-12">
          <h3>Conclusão</h3>
          <p>
            A tecnologia não vem para substituir o dentista, mas para potencializar sua capacidade humana. Ao automatizar a burocracia e o preenchimento de prontuários, você ganha o ativo mais valioso de todos: tempo de qualidade com seu paciente.
          </p>
          <p>
            O DentiHub foi desenhado pensando exatamente nisso. Não somos apenas uma agenda digital; somos um assistente inteligente para o seu consultório.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pronto para modernizar sua clínica?</h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Experimente o poder do Prontuário com IA e todas as ferramentas de gestão financeira e agenda. Comece gratuitamente hoje mesmo.
          </p>
          <button 
            onClick={() => navigate('/auth')}
            className="bg-primary text-white text-lg font-bold px-8 py-4 rounded-xl shadow-xl shadow-primary/20 hover:bg-sky-600 transition-all transform hover:-translate-y-1"
          >
            Criar Conta Gratuita
          </button>
          <p className="mt-4 text-sm text-gray-500 flex items-center justify-center gap-1">
            <CheckCircle size={14} className="text-green-500" /> Sem necessidade de cartão de crédito.
          </p>
        </div>

      </article>

      {/* Footer */}
      <footer className="bg-white border-t py-12 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} DentiHub. Conteúdo educativo.
      </footer>
    </div>
  );
};

export default LearnMorePage;
