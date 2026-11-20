import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, ZoomIn, RotateCcw } from 'lucide-react';
import { Modal, Button, Field } from './ui';
import { useApp, errorMessage, api } from '../lib/app';
import { isNative, nativePhoto } from '../lib/native';
export function MediaPicker({
  onClose,
  onConfirm,
  crop = false,
}: {
  onClose: () => void;
  onConfirm: (file: File) => Promise<void>;
  crop?: boolean;
}) {
  const { toast } = useApp();
  const [preview, setPreview] = useState(''),
    [camera, setCamera] = useState(false),
    [busy, setBusy] = useState(false),
    [zoom, setZoom] = useState(1),
    [x, setX] = useState(50),
    [y, setY] = useState(50);
  const fileRef = useRef<File | null>(null),
    input = useRef<HTMLInputElement>(null),
    video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    image = useRef<HTMLImageElement>(null);
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
  }
  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function select(file?: File) {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      toast('Choose a JPG, PNG or WebP image smaller than 5 MB.', true);
      return;
    }
    stop();
    fileRef.current = file;
    setPreview(URL.createObjectURL(file));
    setZoom(1);
    setX(50);
    setY(50);
  }
  async function start() {
    try {
      if (isNative) {
        select(await nativePhoto('camera'));
        return;
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      stream.current = media;
      setCamera(true);
      setPreview('');
      setTimeout(() => {
        if (video.current) {
          video.current.srcObject = media;
          video.current.play().catch(() => {});
        }
      }, 0);
    } catch {
      toast('Camera unavailable or permission denied. You can upload an image instead.', true);
    }
  }
  async function gallery() {
    if (!isNative) {
      input.current?.click();
      return;
    }
    try {
      select(await nativePhoto('gallery'));
    } catch (error) {
      toast(errorMessage(error), true);
    }
  }
  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')!.drawImage(v, 0, 0);
    canvas.toBlob(
      (b) => {
        if (b) select(new File([b], 'camera.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  }
  async function confirm() {
    if (!fileRef.current) return;
    setBusy(true);
    try {
      let file = fileRef.current;
      if (crop) {
        const img = image.current!;
        const side = Math.min(img.naturalWidth, img.naturalHeight) / zoom,
          sx = ((img.naturalWidth - side) * x) / 100,
          sy = ((img.naturalHeight - side) * y) / 100;
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        canvas.getContext('2d')!.drawImage(img, sx, sy, side, side, 0, 0, 512, 512);
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.9));
        if (!blob) throw new Error('Could not crop image.');
        file = new File([blob], 'profile.webp', { type: 'image/webp' });
      }
      await onConfirm(file);
      onClose();
    } catch (e) {
      toast(errorMessage(e), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={crop ? 'Your profile photo' : 'Capture your meal'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p className="muted">
        {crop
          ? 'Make it yours. Crop, zoom and reposition your photo.'
          : 'A clear overhead photo works best. You’ll review every estimate before saving.'}
      </p>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => select(e.target.files?.[0])}
      />
      <div className="button-row">
        <Button variant="secondary" onClick={start}>
          <Camera size={18} />
          Take a photo
        </Button>
        <Button variant="secondary" onClick={gallery}>
          <Upload size={18} />
          Upload {crop ? 'from gallery' : 'an image'}
        </Button>
      </div>
      {camera && (
        <>
          <video ref={video} className="camera-preview" autoPlay playsInline muted />
          <Button onClick={capture}>
            <Camera size={18} />
            Capture photo
          </Button>
        </>
      )}
      {preview && (
        <>
          <div className={crop ? 'crop-stage' : 'image-stage'}>
            {crop ? (
              <CropPreview src={preview} zoom={zoom} x={x} y={y} />
            ) : (
              <img src={preview} alt="Meal preview" />
            )}
            <img ref={image} src={preview} alt="" hidden />
          </div>
          {crop && (
            <div className="crop-controls">
              <Field label="Zoom">
                <input
                  aria-label="Zoom photo"
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(+e.target.value)}
                />
              </Field>
              <Field label="Horizontal position">
                <input
                  aria-label="Horizontal crop position"
                  type="range"
                  value={x}
                  onChange={(e) => setX(+e.target.value)}
                />
              </Field>
              <Field label="Vertical position">
                <input
                  aria-label="Vertical crop position"
                  type="range"
                  value={y}
                  onChange={(e) => setY(+e.target.value)}
                />
              </Field>
            </div>
          )}
          <div className="modal-actions">
            <Button
              variant="ghost"
              onClick={() => {
                setPreview('');
                fileRef.current = null;
              }}
            >
              <RotateCcw size={16} />
              Retake
            </Button>
            <Button busy={busy} onClick={confirm}>
              {crop ? <ZoomIn size={17} /> : <Camera size={17} />}
              {crop ? 'Confirm photo' : 'Analyze food'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
function CropPreview({ src, zoom, x, y }: { src: string; zoom: number; x: number; y: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
      canvas.current
        ?.getContext('2d')
        ?.drawImage(
          img,
          ((img.naturalWidth - side) * x) / 100,
          ((img.naturalHeight - side) * y) / 100,
          side,
          side,
          0,
          0,
          512,
          512,
        );
    };
    img.src = src;
  }, [src, zoom, x, y]);
  return <canvas ref={canvas} width={512} height={512} />;
}
export function PhotoUpload({ onClose }: { onClose: () => void }) {
  const { setUser, user, refresh } = useApp();
  return (
    <MediaPicker
      crop
      onClose={onClose}
      onConfirm={async (file) => {
        const form = new FormData();
        form.append('image', file);
        const { data } = await api.post('/photo', form);
        setUser(data.user);
        if (user?.onboardingCompleted) await refresh();
      }}
    />
  );
}
