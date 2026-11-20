import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button, Modal } from './ui';
export function ExerciseDemo({ exercise, onClose }: { exercise: any; onClose: () => void }) {
  const frames: string[] = exercise.images?.length
    ? exercise.images
    : exercise.imageUrl
      ? [exercise.imageUrl]
      : [];
  const [frame, setFrame] = useState(0),
    [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % frames.length), 1200);
    return () => clearInterval(timer);
  }, [playing, frames.length]);
  return (
    <Modal title={`${exercise.name} · movement guide`} onClose={onClose}>
      {frames.length > 0 && (
        <div className="demo-frame">
          <img src={frames[frame]} alt={`${exercise.name}, demonstration position ${frame + 1}`} />
        </div>
      )}
      {frames.length > 1 && (
        <div className="demo-controls">
          <Button
            variant="secondary"
            onClick={() => setFrame((frame + frames.length - 1) % frames.length)}
            aria-label="Previous demonstration position"
          >
            <ChevronLeft size={18} />
          </Button>
          <Button variant="secondary" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? 'Pause positions' : 'Play positions'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setFrame((frame + 1) % frames.length)}
            aria-label="Next demonstration position"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      )}
      {exercise.videoUrl && (
        <video controls playsInline preload="none" className="demo-video" src={exercise.videoUrl}>
          Your browser cannot play this video.{' '}
          <a href={exercise.videoUrl} target="_blank" rel="noreferrer">
            Open the source video.
          </a>
        </video>
      )}
      <p className="hint">{exercise.instructions}</p>
      <p className="media-credit">
        {exercise.attribution}.{' '}
        {exercise.sourceUrl && (
          <a href={exercise.sourceUrl} target="_blank" rel="noreferrer">
            Original source
          </a>
        )}
      </p>
    </Modal>
  );
}
