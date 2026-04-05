import { useState, ImgHTMLAttributes } from 'react';

const UPLOAD_SEG = '/upload/';
function cldUrl(url: string | null | undefined, transforms: string): string {
  if (!url) return '';
  const idx = url.indexOf(UPLOAD_SEG);
  if (idx === -1) return url;
  return url.slice(0, idx + UPLOAD_SEG.length) + transforms + '/' + url.slice(idx + UPLOAD_SEG.length);
}

interface CloudinaryImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;

  /**
   * Widths (px) to generate srcSet.
   * - 1 element: fixed-size image (avatars, icons) — no srcSet, loads image at that width.
   *   Pass width = 2× CSS display size for retina support.
   *   Example: avatar w-10 h-10 (40px CSS) → widths={[80]}
   *
   * - 2 elements: fluid image (thumbnails filling container) — generates srcSet with 2 breakpoints.
   *   Example: course card thumbnail → widths={[480, 960]}
   *   Must also pass sizes when using 2 elements.
   */
  widths: [number] | [number, number];

  /** CSS sizes attribute — required when widths has 2 elements */
  sizes?: string;

  /**
   * true → fetchPriority="high" + loading="eager"
   * Use for above-the-fold images: hero banners, navbar avatar, first N cards in grid
   */
  priority?: boolean;
}

const T = 'f_auto,q_auto,c_limit'; // Base transforms — always present in every URL

export function CloudinaryImage({
  src,
  widths,
  sizes,
  priority = false,
  alt,
  className,
  onError,
  ...rest
}: CloudinaryImageProps) {
  const [failed, setFailed] = useState(false);

  // src falsy or load failed → return null, caller's fallback (BookOpen icon, bg container) shows
  if (!src || failed) return null;

  const loading = priority ? 'eager' : 'lazy';
  const fetchPriority = priority ? ('high' as const) : ('auto' as const);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setFailed(true);
    onError?.(e);
  };

  // Fixed size — single URL, no srcSet
  if (widths.length === 1) {
    return (
      <img
        src={cldUrl(src, `${T},w_${widths[0]}`)}
        alt={alt}
        className={className}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        onError={handleError}
        {...rest}
      />
    );
  }

  // Fluid — srcSet 2 breakpoints
  const [w1, w2] = widths;
  const srcSet = `${cldUrl(src, `${T},w_${w1}`)} ${w1}w, ${cldUrl(src, `${T},w_${w2}`)} ${w2}w`;

  return (
    <img
      src={cldUrl(src, `${T},w_${w2}`)} // fallback src = largest
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      onError={handleError}
      {...rest}
    />
  );
}
