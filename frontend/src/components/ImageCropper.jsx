import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const defaults = {
  title: 'Crop image',
  description: 'Move and zoom the image, then confirm your crop.',
  zoom: 'Zoom',
  cancel: 'Cancel',
  useImage: 'Use cropped image',
  processing: 'Preparing image...',
};

export default function ImageCropper({ file, labels = {}, onCancel, onComplete, aspectRatio = 1, outputWidth = 800, outputHeight = 800, areaClassName = 'max-w-[360px]' }) {
  const text = { ...defaults, ...labels };
  const cropAspectRatio = Number.isFinite(Number(aspectRatio)) && Number(aspectRatio) > 0 ? Number(aspectRatio) : 1;
  const areaRef = useRef(null);
  const imageRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [source, setSource] = useState('');
  const [imageSize, setImageSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!file) {
      setSource('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setSource(objectUrl);
    setImageSize(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const metrics = useMemo(() => {
    if (!imageSize || !areaRef.current) return null;
    const areaWidth = areaRef.current.clientWidth;
    const areaHeight = areaRef.current.clientHeight;
    const scale = Math.max(areaWidth / imageSize.width, areaHeight / imageSize.height) * zoom;
    return { areaWidth, areaHeight, width: imageSize.width * scale, height: imageSize.height * scale };
  }, [imageSize, zoom, source, cropAspectRatio]);

  useEffect(() => {
    if (!metrics) return;
    setOffset({ x: (metrics.areaWidth - metrics.width) / 2, y: (metrics.areaHeight - metrics.height) / 2 });
  }, [metrics?.areaWidth, metrics?.areaHeight, metrics?.width, metrics?.height]);

  const clampOffset = (next) => {
    if (!metrics) return next;
    return {
      x: Math.min(0, Math.max(metrics.areaWidth - metrics.width, next.x)),
      y: Math.min(0, Math.max(metrics.areaHeight - metrics.height, next.y)),
    };
  };

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerRef.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  };

  const handlePointerMove = (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - pointerRef.current.x;
    const deltaY = event.clientY - pointerRef.current.y;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    setOffset((current) => clampOffset({ x: current.x + deltaX, y: current.y + deltaY }));
  };

  const finishDrag = () => setDragging(false);

  const crop = () => {
    const area = areaRef.current;
    const image = imageRef.current;
    if (!area || !image || !image.naturalWidth || !image.naturalHeight) return;

    setProcessing(true);
    const areaRect = area.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const sourceScale = image.naturalWidth / imageRect.width;
    const sourceX = Math.max(0, (areaRect.left - imageRect.left) * sourceScale);
    const sourceY = Math.max(0, (areaRect.top - imageRect.top) * sourceScale);
    const sourceWidth = Math.min(image.naturalWidth - sourceX, areaRect.width * sourceScale);
    const sourceHeight = Math.min(image.naturalHeight - sourceY, areaRect.height * sourceScale);
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setProcessing(false);
        return;
      }
      const fileName = `${file.name.replace(/\.[^/.]+$/, '') || 'profile-image'}-cropped.jpg`;
      onComplete(new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() }));
      setProcessing(false);
    }, 'image/jpeg', 0.9);
  };

  if (!file) return null;
  return createPortal(
    <div className="cropper-overlay fixed inset-0 z-[200] grid min-h-dvh place-items-center overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-labelledby="crop-image-title">
      <div className="cropper-panel flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-white/20 bg-white shadow-2xl shadow-black/40 dark:border-slate-700 dark:bg-slate-900 sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 id="crop-image-title" className="text-lg font-bold text-ink dark:text-white">{text.title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text.description}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-xl px-2 py-1 text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label={text.cancel}>×</button>
        </div>

        <div className="cropper-body min-h-0 overflow-y-auto p-5 sm:p-6">
          <div
            ref={areaRef}
            className={`relative mx-auto w-full ${areaClassName} touch-none select-none overflow-hidden rounded-2xl bg-slate-950 ring-4 ring-white shadow-xl dark:ring-slate-800 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{ aspectRatio: cropAspectRatio }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            {source && <img ref={imageRef} src={source} alt="" onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} className="pointer-events-none absolute max-w-none" style={metrics ? { width: metrics.width, height: metrics.height, left: offset.x, top: offset.y } : { inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />}
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/70" />
            <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(to right, transparent 33.1%, rgba(255,255,255,.6) 33.3%, transparent 33.5%, transparent 66.1%, rgba(255,255,255,.6) 66.3%, transparent 66.5%), linear-gradient(to bottom, transparent 33.1%, rgba(255,255,255,.6) 33.3%, transparent 33.5%, transparent 66.1%, rgba(255,255,255,.6) 66.3%, transparent 66.5%)' }} />
          </div>

          <label className="mt-5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span className="flex items-center justify-between"><span>{text.zoom}</span><span className="font-mono text-xs text-slate-400">{zoom.toFixed(1)}×</span></span>
            <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-3 w-full accent-[#10243f]" />
          </label>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{text.cancel}</button>
            <button type="button" onClick={crop} disabled={!imageSize || processing} className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{processing ? text.processing : text.useImage}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
