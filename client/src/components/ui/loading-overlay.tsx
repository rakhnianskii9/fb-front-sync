import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  className?: string;
}

const METRICS = ['CPM', 'CPV', 'CPC', 'CTR', 'CPA', 'ROAS', 'ROI', 'CAC', 'ARPU', 'LTV', 'AOV', 'CR', 'CPL', 'MRR'];
const CYCLE_DURATION = 6000; // 6 секунд жесткий цикл

export function LoadingOverlay({ isLoading, message = 'Loading data...', className }: LoadingOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [metricIndex, setMetricIndex] = useState(() => Math.floor(Math.random() * METRICS.length));

  // Синхронизация смены текста с циклом анимации — рандомный следующий показатель
  useEffect(() => {
    if (!isLoading) return;
    
    // При открытии лоадера — сразу рандомный показатель
    setMetricIndex(Math.floor(Math.random() * METRICS.length));
    
    const interval = setInterval(() => {
      setMetricIndex(Math.floor(Math.random() * METRICS.length));
    }, CYCLE_DURATION);

    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  const currentMetric = METRICS[metricIndex];

  return (
    <div className={cn('fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0', className)}>
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
      
      <div className="relative z-10 flex flex-col items-center gap-12">
        <div className="scene">
          {/* Контейнер для вылетающего текста */}
          {/* key={metricIndex} перезапускает анимацию при смене текста */}
          <div key={metricIndex} className="metric-emitter">
            <div className="metric-3d metric-3d--white" data-text={currentMetric}>
              {currentMetric}
            </div>
            
            {/* Фейерверк привязан к вылету */}
            <div className="fireworks">
              {[...Array(8)].map((_, i) => (
                <span key={i} className={`spark s${i + 1}`} />
              ))}
            </div>
          </div>

          {/* 3D Коробка */}
          <div className="box-wrapper">
            <div className="box">
              {/* Объём воды внутри куба — 5 граней 3D-призмы */}
              <div className="water-volume" aria-hidden="true">
                {/* Передняя грань воды — самая яркая */}
                <div className="water-front">
                  <div className="float-num fn1">0.9</div>
                  <div className="float-num fn2">%</div>
                  <div className="float-num fn3">$2</div>
                  <div className="float-num fn4">K</div>
                  <div className="float-num fn5">$</div>
                </div>
                {/* Левая грань — темнее */}
                <div className="water-left" />
                {/* Правая грань */}
                <div className="water-right" />
                {/* Задняя грань — самая тёмная */}
                <div className="water-back" />
                {/* Верхняя поверхность воды */}
                <div className="water-top" />
              </div>

              {/* Стены */}
              <div className="wall wall-front"><FbIcon /></div>
              <div className="wall wall-back"><FbIcon /></div>
              <div className="wall wall-left"><FbIcon /></div>
              <div className="wall wall-right"><FbIcon /></div>
              {/* Дно коробки — без отдельной «жидкости» (вода рисуется отдельным слоем) */}
              <div className="wall wall-bottom" />
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xl font-bold text-primary animate-pulse">{message}</p>
        </div>
      </div>

      <style>{`
        /* --- НАСТРОЙКИ СЦЕНЫ --- */
        .scene {
          width: 300px;
          height: 300px;
          perspective: 1000px;
          position: relative;
          overflow: visible;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* --- 1. КОРОБКА (Вращение -> Стоп) --- */
        .box-wrapper {
          width: 100px;
          height: 100px;
          position: absolute;
          top: 50%;
          left: 50%;
          margin-top: -50px;
          margin-left: -50px;
          transform-style: preserve-3d;
          animation: box-sequence 6s ease-in-out infinite;
        }

        @keyframes box-sequence {
          0% { transform: rotateX(-20deg) rotateY(0deg); }
          30% { transform: rotateX(-20deg) rotateY(360deg); } /* Полный оборот */
          40%, 90% { transform: rotateX(-20deg) rotateY(405deg); } /* Стоп на ребре (360+45) */
          100% { transform: rotateX(-20deg) rotateY(720deg); } /* Уход в след. цикл */
        }

        .box {
          width: 100px;
          height: 100px;
          transform-style: preserve-3d;
          position: relative;
        }

        /* ===== ВОДА: 3D ОБЪЁМ ===== */
        /* Цвет воды: #1e87db */
        .water-volume {
          --cube: 100px;
          --half: 50px;
          --water-level: 0.50;
          --water-h: calc(var(--water-level) * var(--cube));
          /* Основной цвет воды */
          --water-base: 30, 135, 219; /* #1e87db в RGB */
          
          position: absolute;
          inset: 0;
          overflow: hidden;
          transform-style: preserve-3d;
          pointer-events: none;
          z-index: 1;
        }

        .water-front,
        .water-back,
        .water-left,
        .water-right,
        .water-top {
          backface-visibility: hidden;
          transform-style: preserve-3d;
        }

        /* Передняя грань воды — самая яркая, ближе к зрителю */
        .water-front {
          position: absolute;
          width: var(--cube);
          height: var(--water-h);
          bottom: 0;
          left: 0;
          transform: translateZ(var(--half));
          background: linear-gradient(
            to top,
            rgba(var(--water-base), 0.95) 0%,
            rgba(var(--water-base), 0.75) 50%,
            rgba(100, 180, 240, 0.55) 100%
          );
          box-shadow: 
            inset 0 -15px 30px rgba(0, 50, 120, 0.4),
            inset 0 10px 20px rgba(150, 210, 255, 0.25);
        }

        /* Левая грань — темнее (в тени) */
        .water-left {
          position: absolute;
          width: var(--cube);
          height: var(--water-h);
          bottom: 0;
          left: 0;
          transform: rotateY(-90deg) translateZ(var(--half));
          background: linear-gradient(
            to top,
            rgba(15, 70, 140, 0.95) 0%,
            rgba(20, 90, 170, 0.80) 50%,
            rgba(40, 120, 200, 0.60) 100%
          );
          box-shadow: 
            inset 0 -15px 25px rgba(0, 30, 80, 0.5),
            inset 15px 0 20px rgba(0, 40, 100, 0.3);
        }

        /* Правая грань — чуть светлее левой */
        .water-right {
          position: absolute;
          width: var(--cube);
          height: var(--water-h);
          bottom: 0;
          left: 0;
          transform: rotateY(90deg) translateZ(var(--half));
          background: linear-gradient(
            to top,
            rgba(20, 100, 180, 0.90) 0%,
            rgba(30, 120, 200, 0.75) 50%,
            rgba(60, 150, 220, 0.55) 100%
          );
          box-shadow: 
            inset 0 -15px 25px rgba(0, 40, 100, 0.4),
            inset -15px 0 20px rgba(80, 160, 230, 0.2);
        }

        /* Задняя грань — самая тёмная */
        .water-back {
          position: absolute;
          width: var(--cube);
          height: var(--water-h);
          bottom: 0;
          left: 0;
          transform: rotateY(180deg) translateZ(var(--half));
          background: linear-gradient(
            to top,
            rgba(10, 50, 110, 0.90) 0%,
            rgba(15, 70, 140, 0.70) 100%
          );
        }

        /* Верхняя поверхность воды */
        .water-top {
          position: absolute;
          width: var(--cube);
          height: var(--cube);
          bottom: var(--water-h);
          left: 0;
          transform-origin: 50% 100%;
          transform: rotateX(-90deg) translateZ(var(--half));
          background: 
            radial-gradient(ellipse at 30% 30%, rgba(150, 210, 255, 0.5) 0%, transparent 50%),
            linear-gradient(
              135deg,
              rgba(60, 160, 230, 0.65) 0%,
              rgba(var(--water-base), 0.55) 50%,
              rgba(20, 100, 180, 0.45) 100%
            );
          box-shadow: 
            inset 0 0 30px rgba(100, 180, 240, 0.3),
            0 0 20px rgba(var(--water-base), 0.25);
        }

        /* Блик на поверхности воды */
        .water-top::before {
          content: '';
          position: absolute;
          top: 15%;
          left: 15%;
          width: 35%;
          height: 25%;
          background: radial-gradient(ellipse, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(3px);
        }

        /* Волны на поверхности */
        .water-top::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            90deg,
            transparent 0px,
            rgba(255, 255, 255, 0.08) 2px,
            transparent 4px
          );
          animation: water-ripple 4s ease-in-out infinite;
          opacity: 0.6;
        }

        @keyframes water-ripple {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }

        /* Анимация колыхания передней грани */
        .water-front {
          animation: water-front-slosh 5s ease-in-out infinite;
        }

        /* Плавающие цифры в воде (3D-наклон + дрейф) — размер +15% */
        .float-num {
          position: absolute;
          font-family: 'Balloon Dreams', sans-serif;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: rgba(235, 251, 255, 0.90);
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.30);
          transform-style: preserve-3d;
          transform: translateZ(6px) rotateX(18deg) rotateY(-18deg);
          animation: float-drift 3.6s ease-in-out infinite;
          user-select: none;
        }

        .fn1 { left: 12%; bottom: 14%; animation-delay: 0s; }
        .fn2 { left: 44%; bottom: 28%; animation-delay: 0.6s; font-size: 13px; }
        .fn3 { left: 70%; bottom: 16%; animation-delay: 1.2s; }
        .fn4 { left: 28%; bottom: 40%; animation-delay: 1.8s; font-size: 10px; }
        .fn5 { left: 58%; bottom: 8%; animation-delay: 2.4s; font-size: 14px; }

        @keyframes float-drift {
          0%, 100% {
            transform: translateZ(10px) translateY(0) translateX(0) rotateX(18deg) rotateY(-18deg);
            opacity: 0.75;
          }
          50% {
            transform: translateZ(10px) translateY(-10px) translateX(5px) rotateX(22deg) rotateY(-10deg);
            opacity: 1;
          }
        }

        /* (кромка/пена перенесена на .wp-top) */

        @keyframes water-front-slosh {
          0% {
            transform: translateZ(var(--half)) translateY(0) rotateZ(0deg);
          }
          25% {
            transform: translateZ(var(--half)) translateY(1px) rotateZ(-1.2deg);
          }
          50% {
            transform: translateZ(var(--half)) translateY(-1px) rotateZ(1.2deg);
          }
          75% {
            transform: translateZ(var(--half)) translateY(1px) rotateZ(-0.8deg);
          }
          100% {
            transform: translateZ(var(--half)) translateY(0) rotateZ(0deg);
          }
        }

        @keyframes water-wave {
          0% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(-12px) translateY(-1px); }
          50% { transform: translateX(-24px) translateY(1px); }
          75% { transform: translateX(-36px) translateY(2px); }
          100% { transform: translateX(-48px) translateY(0); }
        }

        @keyframes water-wave-2 {
          0% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(10px) translateY(1px); }
          50% { transform: translateX(20px) translateY(-1px); }
          75% { transform: translateX(30px) translateY(-2px); }
          100% { transform: translateX(40px) translateY(0); }
        }

        .wall {
          position: absolute;
          width: 100px;
          height: 100px;
          background: rgba(24, 119, 242, 0.15);
          border: 2px solid #1877f2;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Убрали backdrop-filter чтобы не мылило текст внутри */
          z-index: 2;
        }

        .wall-front  { transform: translateZ(50px); }
        .wall-back   { transform: rotateY(180deg) translateZ(50px); }
        .wall-left   { transform: rotateY(-90deg) translateZ(50px); }
        .wall-right  { transform: rotateY(90deg) translateZ(50px); }
        .wall-bottom { 
          transform: rotateX(-90deg) translateZ(50px); 
          background: transparent;
          border: 2px solid #1877f2;
        }
        /* --- 2. ТЕКСТ (Выстрел -> Растворение) --- */
        .metric-emitter {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 260px;
          height: 260px;
          pointer-events: none;
          z-index: 20;
          transform-style: preserve-3d;
          overflow: visible;
        }

        .metric-3d {
          font-family: 'Balloon Dreams';
          font-size: 48px;
          font-weight: 900;
          /* ДВА ЦВЕТА ТЕКСТА: #1f8fff → #881fff */
          color: transparent;
          -webkit-text-fill-color: transparent;
          background: linear-gradient(90deg, #1f8fff 0%, #881fff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          display: inline-block;
          line-height: 1;
          position: absolute;
          top: 50%; left: 50%;
          white-space: nowrap;
          transform-style: preserve-3d;
          isolation: isolate;
          
          /* Свечение #1F8FFF сверху + синяя тень вправо-вниз */
          text-shadow:
            /* свечение сверху */
            0 -8px 25px rgba(31, 143, 255, 0.5),
            0 -4px 15px rgba(31, 143, 255, 0.6),
            /* общий glow */
            0 0 20px rgba(31, 143, 255, 0.4),
            0 0 40px rgba(136, 31, 255, 0.25),
            /* белая тень вправо-вниз (направление сохранено) */
            3px 3px 0 rgba(255, 255, 255, 0.85);

          filter: none;
            
          /* Анимация выстрела */
          animation: shoot-out 6s linear infinite;
          opacity: 0;
        }

        /* Белая заливка для всех метрик */
        .metric-3d--white {
          background: none;
          -webkit-background-clip: initial;
          background-clip: initial;
          color: rgba(255, 255, 255, 0.95);
          -webkit-text-fill-color: rgba(255, 255, 255, 0.95);
        }

        /* Глянцевый блик сверху */
        .metric-3d::before {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          color: transparent;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.18) 60%, transparent 100%);
          -webkit-background-clip: text;
          background-clip: text;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
          pointer-events: none;
          transform: translateZ(1px);
        }

        /* Тёмный контур для глубины */
        .metric-3d::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          color: transparent;
          -webkit-text-stroke: 1.25px rgba(0, 0, 0, 0.22);
          pointer-events: none;
          transform: translateZ(-1px);
        }

        @keyframes shoot-out {
          0%, 44% {
            transform: translate(-50%, -50%) translateZ(-40px) scale(0);
            opacity: 0;
          }
          /* ВЫСТРЕЛ (ускорение): сначала чуть, затем резко */
          48% {
            transform: translate(-50%, -70%) translateZ(60px) scale(1.05) rotateY(0deg);
            opacity: 1;
          }
          54% {
            transform: translate(-50%, -125%) translateZ(150px) scale(1.18) rotateY(-14deg);
            opacity: 1;
          }
          /* Небольшой подъём над коробкой */
          76% {
            transform: translate(-50%, -145%) translateZ(170px) scale(1.12) rotateY(-10deg);
            opacity: 1;
          }
          /* Растворение */
          86%, 100% {
            transform: translate(-50%, -155%) translateZ(185px) scale(1.05) rotateY(-6deg);
            opacity: 0;
          }
        }

        /* --- 3. ФЕЙЕРВЕРК (Синхрон с выстрелом) --- */
        .fireworks {
          position: absolute;
          top: 50%; left: 50%;
          width: 0; height: 0;
          transform-style: preserve-3d;
        }
        
        .spark {
          position: absolute;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #FFD700;
          box-shadow: 0 0 10px #FFD700, 0 0 20px #FF4500;
          opacity: 0;
          animation: spark-anim 6s ease-out infinite;
        }

        /* Искры вылетают ровно в 40% (когда текст вылетает) */
        @keyframes spark-anim {
          0%, 47% { transform: translate(0,0) scale(0); opacity: 0; }
          48% { opacity: 1; transform: translate(0,0) scale(1); }
          64% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0); }
          100% { opacity: 0; }
        }

        /* Разлет искр */
        .s1 { --tx: -60px; --ty: -80px; }
        .s2 { --tx: 60px; --ty: -80px; }
        .s3 { --tx: -40px; --ty: -120px; }
        .s4 { --tx: 40px; --ty: -120px; }
        .s5 { --tx: -80px; --ty: -40px; }
        .s6 { --tx: 80px; --ty: -40px; }
        .s7 { --tx: 0px; --ty: -140px; }
        .s8 { --tx: 0px; --ty: -60px; }

        /* --- 4. ЛОГОТИП FB (Пульсация) --- */
        .fb-icon {
          width: 40px; height: 40px;
          color: #1877f2;
          background: white;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          animation: pulse 1s infinite alternate;
        }
        @keyframes pulse {
          from { transform: scale(1); box-shadow: 0 0 10px rgba(255,255,255,0.5); }
          to { transform: scale(1.1); box-shadow: 0 0 20px rgba(255,255,255,0.8); }
        }
      `}</style>
    </div>
  );
}

// Компонент иконки для чистоты кода
function FbIcon() {
  return (
    <div className="fb-icon">
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    </div>
  );
}

export default LoadingOverlay;