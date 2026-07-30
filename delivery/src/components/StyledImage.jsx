const SHAPE_CLASS = { square: 'rounded-none', rounded: 'rounded-xl', circle: 'rounded-full' };

export default function StyledImage({ src, alt = '', shape = 'rounded', zoom = 1, posX = 50, posY = 50, className = '' }) {
  if (!src) return null;
  return (
    <div className={`overflow-hidden ${SHAPE_CLASS[shape] || SHAPE_CLASS.rounded} ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full object-cover"
        style={{ transform: `scale(${zoom})`, objectPosition: `${posX}% ${posY}%` }}
      />
    </div>
  );
}
