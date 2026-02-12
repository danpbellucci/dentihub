import React from 'react';

// Tipos de condições suportadas
export type ToothCondition = 'healthy' | 'carie' | 'restoration' | 'canal' | 'protese' | 'implant' | 'missing';

interface DentalArchProps {
  toothConditions: Record<string, ToothCondition[]>; // Mapa de ID do dente -> Lista de Condições
  onToothClick: (toothId: string) => void;
  readOnly?: boolean;
}

// Mapa de cores (Hex) para SVG
const CONDITION_COLORS: Record<ToothCondition, string> = {
    healthy: '#f1f5f9',     // Slate-100
    carie: '#ef4444',       // Red-500
    restoration: '#3b82f6', // Blue-500
    canal: '#22c55e',       // Green-500
    protese: '#eab308',     // Yellow-500
    implant: '#a855f7',     // Purple-500
    missing: '#334155'      // Slate-700
};

// Simplified paths for a stylized dental chart representation
const TOOTH_PATHS = {
  incisor: "M15,5 C20,5 25,10 25,25 C25,45 20,55 15,55 C10,55 5,45 5,25 C5,10 10,5 15,5 Z",
  canine: "M15,2 C22,10 25,20 25,35 C25,50 20,58 15,58 C10,58 5,50 5,35 C5,20 8,10 15,2 Z",
  premolar: "M5,10 C5,5 10,0 15,0 C20,0 25,5 25,10 L28,25 C28,35 25,45 15,45 C5,45 2,35 2,25 L5,10 Z",
  molar: "M2,10 C2,5 8,0 18,0 C28,0 34,5 34,10 L32,35 C32,42 28,48 18,48 C8,48 4,42 4,35 L2,10 Z"
};

const TEETH_DATA = [
  // Upper Right (Q1) - 18 to 11
  { id: '18', type: 'molar', x: 10, y: 40, rot: 20 },
  { id: '17', type: 'molar', x: 45, y: 25, rot: 15 },
  { id: '16', type: 'molar', x: 80, y: 15, rot: 10 },
  { id: '15', type: 'premolar', x: 115, y: 10, rot: 5 },
  { id: '14', type: 'premolar', x: 145, y: 10, rot: 0 },
  { id: '13', type: 'canine', x: 175, y: 15, rot: -5 },
  { id: '12', type: 'incisor', x: 200, y: 20, rot: -5 },
  { id: '11', type: 'incisor', x: 225, y: 25, rot: -5 },

  // Upper Left (Q2) - 21 to 28
  { id: '21', type: 'incisor', x: 255, y: 25, rot: 5 },
  { id: '22', type: 'incisor', x: 280, y: 20, rot: 5 },
  { id: '23', type: 'canine', x: 305, y: 15, rot: 5 },
  { id: '24', type: 'premolar', x: 335, y: 10, rot: 0 },
  { id: '25', type: 'premolar', x: 365, y: 10, rot: -5 },
  { id: '26', type: 'molar', x: 400, y: 15, rot: -10 },
  { id: '27', type: 'molar', x: 435, y: 25, rot: -15 },
  { id: '28', type: 'molar', x: 470, y: 40, rot: -20 },

  // Lower Right (Q4) - 48 to 41
  { id: '48', type: 'molar', x: 10, y: 150, rot: -20 },
  { id: '47', type: 'molar', x: 45, y: 165, rot: -15 },
  { id: '46', type: 'molar', x: 80, y: 175, rot: -10 },
  { id: '45', type: 'premolar', x: 115, y: 180, rot: -5 },
  { id: '44', type: 'premolar', x: 145, y: 180, rot: 0 },
  { id: '43', type: 'canine', x: 175, y: 175, rot: 5 },
  { id: '42', type: 'incisor', x: 200, y: 170, rot: 5 },
  { id: '41', type: 'incisor', x: 225, y: 165, rot: 5 },

  // Lower Left (Q3) - 31 to 38
  { id: '31', type: 'incisor', x: 255, y: 165, rot: -5 },
  { id: '32', type: 'incisor', x: 280, y: 170, rot: -5 },
  { id: '33', type: 'canine', x: 305, y: 175, rot: -5 },
  { id: '34', type: 'premolar', x: 335, y: 180, rot: 0 },
  { id: '35', type: 'premolar', x: 365, y: 180, rot: 5 },
  { id: '36', type: 'molar', x: 400, y: 175, rot: 10 },
  { id: '37', type: 'molar', x: 435, y: 165, rot: 15 },
  { id: '38', type: 'molar', x: 470, y: 150, rot: 20 },
];

const DentalArch: React.FC<DentalArchProps> = ({ toothConditions, onToothClick, readOnly = false }) => {
  return (
    <div className="w-full flex justify-center py-4 bg-gray-50/5 rounded-xl border border-white/5 relative select-none">
        <svg width="510" height="230" viewBox="0 0 510 230">
            {/* Guide Lines */}
            <path d="M255,20 L255,210" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4"/>
            <path d="M10,115 L500,115" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4"/>

            {/* Labels */}
            <text x="20" y="100" fill="#64748b" fontSize="10" fontWeight="bold">Direita</text>
            <text x="460" y="100" fill="#64748b" fontSize="10" fontWeight="bold">Esquerda</text>
            <text x="245" y="15" fill="#64748b" fontSize="10" fontWeight="bold">Superior</text>
            <text x="245" y="225" fill="#64748b" fontSize="10" fontWeight="bold">Inferior</text>

            <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {TEETH_DATA.map((tooth) => {
                // Obtém a lista de condições ou padrão ['healthy']
                const conditions = toothConditions[tooth.id] && toothConditions[tooth.id].length > 0 
                    ? toothConditions[tooth.id] 
                    : ['healthy'];
                
                const isSelected = conditions.length > 0 && conditions[0] !== 'healthy';
                
                let fillProp: string;

                // Lógica de preenchimento (Multi-color ou Single-color)
                if (conditions.length > 1) {
                    const gradientId = `grad-${tooth.id}`;
                    const step = 100 / conditions.length;
                    
                    fillProp = `url(#${gradientId})`;
                    
                    // Renderiza o gradiente dinâmico dentro do SVG se houver múltiplas condições
                    return (
                        <g 
                            key={tooth.id} 
                            transform={`translate(${tooth.x}, ${tooth.y}) rotate(${tooth.rot})`}
                            onClick={() => !readOnly && onToothClick(tooth.id)}
                            className={`transition-all duration-200 ${readOnly ? '' : 'cursor-pointer hover:opacity-80'}`}
                        >
                             <defs>
                                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                    {conditions.map((cond, index) => (
                                        <React.Fragment key={index}>
                                            <stop offset={`${index * step}%`} stopColor={CONDITION_COLORS[cond]} />
                                            <stop offset={`${(index + 1) * step}%`} stopColor={CONDITION_COLORS[cond]} />
                                        </React.Fragment>
                                    ))}
                                </linearGradient>
                            </defs>
                            <path 
                                d={TOOTH_PATHS[tooth.type as keyof typeof TOOTH_PATHS]} 
                                style={{ fill: fillProp }}
                                stroke={isSelected ? '#94a3b8' : '#cbd5e1'}
                                strokeWidth={isSelected ? "1.5" : "1"}
                                className="transition-all duration-300"
                            />
                            <text x="10" y="25" fontSize="10" fontWeight="bold" textAnchor="middle" fill={isSelected ? '#334155' : '#94a3b8'} style={{ pointerEvents: 'none' }}>
                                {tooth.id}
                            </text>
                        </g>
                    );

                } else {
                    // Single Color
                    fillProp = CONDITION_COLORS[conditions[0]];
                    const singleCond = conditions[0];
                    const isDark = singleCond === 'missing' || singleCond === 'carie' || singleCond === 'implant';

                    return (
                        <g 
                            key={tooth.id} 
                            transform={`translate(${tooth.x}, ${tooth.y}) rotate(${tooth.rot})`}
                            onClick={() => !readOnly && onToothClick(tooth.id)}
                            className={`transition-all duration-200 ${readOnly ? '' : 'cursor-pointer hover:opacity-80'}`}
                        >
                            <path 
                                d={TOOTH_PATHS[tooth.type as keyof typeof TOOTH_PATHS]} 
                                style={{ fill: fillProp }}
                                stroke={isSelected ? '#94a3b8' : '#cbd5e1'}
                                strokeWidth={isSelected ? "1.5" : "1"}
                                className="transition-all duration-300"
                            />
                            <text x="10" y="25" fontSize="10" fontWeight="bold" textAnchor="middle" fill={isSelected && isDark ? 'white' : (isSelected ? '#334155' : '#94a3b8')} style={{ pointerEvents: 'none' }}>
                                {tooth.id}
                            </text>
                        </g>
                    );
                }
            })}
        </svg>
    </div>
  );
};

export default DentalArch;