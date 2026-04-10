import { useState, useEffect, useCallback } from 'react';
import { useBodyCheckpoints } from '../../api/hooks/useBody.js';
import { formatDateLong } from '../../utils/format.js';
import './body.css';

const PHOTO_TYPES = [
  { key: 'front', label: 'Спереди' },
  { key: 'back', label: 'Сзади' },
  { key: 'side_left', label: 'Сбоку (лев)' },
  { key: 'side_right', label: 'Сбоку (прав)' },
];

function FullscreenView({ photos, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);

  const goPrev = useCallback(
    () => setIndex((i) => (i > 0 ? i - 1 : photos.length - 1)),
    [photos.length],
  );
  const goNext = useCallback(
    () => setIndex((i) => (i < photos.length - 1 ? i + 1 : 0)),
    [photos.length],
  );

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, goPrev, goNext]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div className="fullscreen-photo" onClick={onClose}>
      <img
        src={`/api/uploads/${photo.filename}`}
        alt={photo.label}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="fullscreen-photo__close"
        onClick={onClose}
        aria-label="Закрыть"
      >
        ×
      </button>
      {photos.length > 1 && (
        <>
          <button
            className="fullscreen-photo__nav fullscreen-photo__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Предыдущее"
          >
            ‹
          </button>
          <button
            className="fullscreen-photo__nav fullscreen-photo__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Следующее"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

function getPhotosForCheckpoint(checkpoint) {
  return (checkpoint?.photos || []).map((p) => ({
    ...p,
    label: PHOTO_TYPES.find((t) => t.key === p.photo_type)?.label || p.photo_type,
  }));
}

export default function PhotoGallery() {
  const { data: checkpoints } = useBodyCheckpoints();
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [fullscreen, setFullscreen] = useState(null);

  const withPhotos = (checkpoints || []).filter(
    (cp) => cp.photos && cp.photos.length > 0,
  );

  const sorted = [...withPhotos].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  useEffect(() => {
    if (sorted.length >= 2 && !leftId && !rightId) {
      setLeftId(String(sorted[sorted.length - 1].id));
      setRightId(String(sorted[0].id));
    } else if (sorted.length === 1 && !leftId) {
      setLeftId(String(sorted[0].id));
    }
  }, [sorted, leftId, rightId]);

  const leftCp = sorted.find((cp) => String(cp.id) === leftId);
  const rightCp = sorted.find((cp) => String(cp.id) === rightId);

  const allFullscreenPhotos = [];
  PHOTO_TYPES.forEach((type) => {
    const leftPhoto = leftCp?.photos?.find((p) => p.photo_type === type.key);
    const rightPhoto = rightCp?.photos?.find((p) => p.photo_type === type.key);
    if (leftPhoto) allFullscreenPhotos.push({ ...leftPhoto, label: `${type.label} — ${formatDateLong(leftCp.date)}` });
    if (rightPhoto) allFullscreenPhotos.push({ ...rightPhoto, label: `${type.label} — ${formatDateLong(rightCp.date)}` });
  });

  const openFullscreen = (filename) => {
    const idx = allFullscreenPhotos.findIndex((p) => p.filename === filename);
    if (idx >= 0) setFullscreen(idx);
  };

  if (sorted.length === 0) {
    return (
      <div className="photo-gallery__empty">
        📷 Нет фотографий для сравнения
      </div>
    );
  }

  return (
    <div className="photo-gallery">
      <div className="photo-gallery__selectors">
        <div className="photo-gallery__select-group">
          <span className="photo-gallery__select-label">Дата «до»</span>
          <select
            className="photo-gallery__select"
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
          >
            <option value="">—</option>
            {sorted.map((cp) => (
              <option key={cp.id} value={String(cp.id)}>
                {formatDateLong(cp.date)}
              </option>
            ))}
          </select>
        </div>
        <div className="photo-gallery__select-group">
          <span className="photo-gallery__select-label">Дата «после»</span>
          <select
            className="photo-gallery__select"
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
          >
            <option value="">—</option>
            {sorted.map((cp) => (
              <option key={cp.id} value={String(cp.id)}>
                {formatDateLong(cp.date)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="photo-gallery__comparison">
        {PHOTO_TYPES.map((type) => {
          const leftPhoto = leftCp?.photos?.find(
            (p) => p.photo_type === type.key,
          );
          const rightPhoto = rightCp?.photos?.find(
            (p) => p.photo_type === type.key,
          );

          if (!leftPhoto && !rightPhoto) return null;

          return (
            <div key={type.key} className="photo-gallery__pair">
              <div className="photo-gallery__pair-title">{type.label}</div>
              <div className="photo-gallery__pair-images">
                <div className="photo-gallery__img-wrap">
                  {leftPhoto ? (
                    <>
                      <img
                        src={`/api/uploads/${leftPhoto.filename}`}
                        alt={type.label}
                        onClick={() => openFullscreen(leftPhoto.filename)}
                      />
                      <span className="photo-gallery__img-date">
                        {leftCp && formatDateLong(leftCp.date)}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text2)', fontSize: 13 }}>
                      Нет фото
                    </span>
                  )}
                </div>
                <div className="photo-gallery__img-wrap">
                  {rightPhoto ? (
                    <>
                      <img
                        src={`/api/uploads/${rightPhoto.filename}`}
                        alt={type.label}
                        onClick={() => openFullscreen(rightPhoto.filename)}
                      />
                      <span className="photo-gallery__img-date">
                        {rightCp && formatDateLong(rightCp.date)}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text2)', fontSize: 13 }}>
                      Нет фото
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {fullscreen !== null && (
        <FullscreenView
          photos={allFullscreenPhotos}
          initialIndex={fullscreen}
          onClose={() => setFullscreen(null)}
        />
      )}
    </div>
  );
}
