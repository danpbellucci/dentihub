
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';
import { ArrowLeft, Calendar, User, Clock, ChevronRight, Search, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    image_url?: string;
    author_name: string;
    created_at: string;
}

const BlogPage: React.FC = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!error && data) {
            setPosts(data as BlogPost[]);
        }
        setLoading(false);
    };

    const filteredPosts = posts.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-purple-500 selection:text-white">
            
            {/* Header */}
            <header className="fixed w-full top-0 z-50 border-b border-white/5 bg-gray-950/90 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2 text-white font-bold text-xl cursor-pointer hover:opacity-80 transition" onClick={() => navigate('/')}>
                            <Logo className="w-8 h-8" />
                            <span>Denti<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Hub</span> <span className="text-gray-500 font-medium text-sm ml-2 border-l border-white/10 pl-2">Blog</span></span>
                        </div>
                        <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-300 hover:text-white transition flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-full">
                            <ArrowLeft size={16}/> Voltar ao Início
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
                        Conteúdos para <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Dentistas Modernos</span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Dicas de gestão, tecnologia na odontologia e novidades sobre o DentiHub.
                    </p>
                    
                    <div className="mt-8 max-w-md mx-auto relative">
                        <input 
                            type="text" 
                            placeholder="Buscar artigos..." 
                            className="w-full bg-gray-900/50 border border-white/10 rounded-full py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-4 top-3.5 text-gray-500" size={18} />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1,2,3].map(i => (
                            <div key={i} className="bg-gray-900 rounded-2xl h-96 animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-20 bg-gray-900/30 rounded-2xl border border-white/5">
                        <p className="text-gray-500">Nenhum artigo encontrado.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPosts.map(post => (
                            <article 
                                key={post.id} 
                                className="group bg-gray-900 rounded-2xl border border-white/5 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/10 cursor-pointer flex flex-col"
                                onClick={() => setSelectedPost(post)}
                            >
                                <div className="h-48 bg-gray-800 overflow-hidden relative">
                                    {post.image_url ? (
                                        <>
                                            <img 
                                                src={post.image_url} 
                                                alt={post.title} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    const fallback = target.nextElementSibling;
                                                    if (fallback) fallback.classList.remove('hidden');
                                                }}
                                            />
                                            <div className="fallback-icon hidden w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                                <Logo className="w-16 h-16 opacity-10" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                            <Logo className="w-16 h-16 opacity-10" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60"></div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                                        <span className="flex items-center gap-1"><Calendar size={12}/> {format(parseISO(post.created_at), "d 'de' MMM, yyyy", { locale: ptBR })}</span>
                                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                        <span className="flex items-center gap-1"><Clock size={12}/> 5 min</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors line-clamp-2">{post.title}</h2>
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-1">{post.excerpt}</p>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-500 border border-white/10">
                                                {post.author_name.charAt(0)}
                                            </div>
                                            {post.author_name}
                                        </div>
                                        <span className="text-purple-400 text-sm font-bold flex items-center group-hover:translate-x-1 transition-transform">Ler mais <ChevronRight size={16}/></span>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>

            {/* Post Modal Overlay */}
            {selectedPost && (
                <div 
                    className="fixed inset-0 z-[100] flex justify-center items-start bg-black/90 backdrop-blur-sm overflow-y-auto custom-scrollbar p-4 sm:p-8 animate-fade-in cursor-pointer"
                    onClick={(e) => e.target === e.currentTarget && setSelectedPost(null)}
                >
                    <div className="bg-gray-950 w-full max-w-3xl rounded-2xl border border-white/10 shadow-2xl relative flex flex-col my-8 cursor-default" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => setSelectedPost(null)} 
                            className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-white hover:text-black transition backdrop-blur-md"
                        >
                            <X size={24} />
                        </button>

                        <div className="h-64 sm:h-80 w-full relative shrink-0 overflow-hidden rounded-t-2xl">
                            {selectedPost.image_url ? (
                                <>
                                    <img 
                                        src={selectedPost.image_url} 
                                        className="w-full h-full object-cover" 
                                        alt={selectedPost.title} 
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const fallback = target.nextElementSibling;
                                            if (fallback) fallback.classList.remove('hidden');
                                        }}
                                    />
                                    <div className="fallback-icon hidden w-full h-full bg-gradient-to-r from-blue-900 to-purple-900 flex items-center justify-center">
                                        <Logo className="w-24 h-24 opacity-20 text-white" />
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full bg-gradient-to-r from-blue-900 to-purple-900 flex items-center justify-center">
                                    <Logo className="w-24 h-24 opacity-20 text-white" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent"></div>
                            
                            <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8">
                                <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight drop-shadow-lg">{selectedPost.title}</h1>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                                    <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                        <User size={14} className="text-purple-400"/> {selectedPost.author_name}
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                                        <Calendar size={14} className="text-blue-400"/> {format(parseISO(selectedPost.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 sm:p-10 text-gray-300 leading-relaxed text-lg blog-content">
                            <div dangerouslySetInnerHTML={{ __html: selectedPost.content }} />
                        </div>

                        <div className="p-8 border-t border-white/5 bg-gray-900/50 mt-auto text-center">
                            <h3 className="text-xl font-bold text-white mb-4">Gostou do conteúdo?</h3>
                            <button onClick={() => { setSelectedPost(null); navigate('/auth', { state: { view: 'signup' } }); }} className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-sky-600 transition shadow-lg shadow-blue-500/20">
                                Começar Grátis no DentiHub
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="bg-gray-950 border-t border-white/5 py-12 text-center text-sm text-gray-500">
                <div className="max-w-7xl mx-auto px-4">
                    <p>&copy; {new Date().getFullYear()} DentiHub. Inovação em Odontologia.</p>
                </div>
            </footer>
        </div>
    );
};

export default BlogPage;
