import { QRCodeCanvas } from 'qrcode.react';

const mesas = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Mesa 6'];

export default function QRPage() {
  const baseUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-cream-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black font-display text-ink-900 mb-2">📱 Códigos QR para Mesas</h1>
          <p className="text-ink-400">Imprime y coloca en cada mesa para que los clientes ordenen desde su celular</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {mesas.map(m => {
            const url = `${baseUrl}/local-order?mesa=${encodeURIComponent(m)}`;
            return (
              <div key={m} className="bg-white rounded-2xl p-6 shadow-md border border-ink-100 flex flex-col items-center text-center">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-ink-200 mb-4">
                  <QRCodeCanvas value={url} size={180} level="M" />
                </div>
                <h2 className="text-xl font-bold font-display text-ink-900">{m}</h2>
                <p className="text-xs text-ink-400 mt-1 break-all">{url}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-10 bg-brand-50 border border-brand-200 rounded-2xl p-6 text-center">
          <p className="text-brand-700 font-semibold text-sm">💡 Escanea y pide desde tu mesa — sin esperar al mesero</p>
        </div>
      </div>
    </div>
  );
}
