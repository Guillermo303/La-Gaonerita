import { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import TipoServicio from './pages/TipoServicio';
import Horario from './pages/Horario';
import Menu from './pages/Menu';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import TrackOrder from './pages/TrackOrder';
import StepIndicator from './components/StepIndicator';
import { useCart } from './context/CartContext';

const STEPS = [
  { num: 1, label: 'Inicio' },
  { num: 2, label: 'Tipo' },
  { num: 3, label: 'Horario' },
  { num: 4, label: 'Menú' },
  { num: 5, label: 'Conf.' },
  { num: 6, label: 'Listo' },
  { num: 7, label: 'Seguir' },
];

export default function App() {
  const [step, setStep] = useState(1);
  const [placed, setPlaced] = useState(null);
  const [trackFrom, setTrackFrom] = useState(null);
  const { count } = useCart();

  const goToStep = useCallback((s) => setStep(s), []);

  const handleStartOrder = useCallback(() => {
    goToStep(2);
  }, [goToStep]);

  const handleOrderPlaced = useCallback((order) => {
    setPlaced(order);
    goToStep(6);
  }, [goToStep]);

  const handleReset = useCallback(() => {
    goToStep(1);
  }, [goToStep]);

  const handleTrack = useCallback((from) => {
    setTrackFrom(from);
    goToStep(7);
  }, [goToStep]);

  const handleBackFromTrack = useCallback(() => {
    goToStep(trackFrom === 'confirm' ? 6 : 1);
  }, [trackFrom]);

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Navbar onReset={handleReset} />
      <StepIndicator steps={STEPS} current={step} />
      <main className="flex-1">
        <div key={step} className="step-fade">
          {step === 1 && <Landing onStartOrder={handleStartOrder} hasOrder={!!placed} onTrackOrder={() => handleTrack('landing')} />}
          {step === 2 && <TipoServicio onPrev={() => goToStep(1)} onNext={() => goToStep(3)} />}
          {step === 3 && <Horario onPrev={() => goToStep(2)} onNext={() => goToStep(4)} />}
          {step === 4 && <Menu onPrev={() => goToStep(3)} onNext={() => goToStep(5)} />}
          {step === 5 && <Checkout onPrev={() => goToStep(4)} onGoToMenu={() => goToStep(4)} onPlaced={handleOrderPlaced} />}
          {step === 6 && <Confirmation order={placed} onReset={handleReset} onTrack={() => handleTrack('confirm')} />}
          {step === 7 && <TrackOrder order={placed} onBack={handleBackFromTrack} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
