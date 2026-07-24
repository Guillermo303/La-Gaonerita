import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import animationData from '../assets/growth-lottie.json';

export default function GrowthLottie({ positive = true, className = '' }) {
  const containerRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData
    });
    return () => animRef.current?.destroy();
  }, []);

  useEffect(() => {
    // El punto recorre la línea hacia adelante cuando la utilidad es positiva
    // y hacia atrás cuando es negativa — un reflejo simple pero real de la tendencia.
    animRef.current?.setDirection(positive ? 1 : -1);
  }, [positive]);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}
