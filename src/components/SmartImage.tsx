import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { isNative, privateImage } from '../lib/native';
export function SmartImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [source, setSource] = useState(src);
  useEffect(() => {
    let cancelled = false;
    if (isNative && src?.includes('/api/images/'))
      privateImage(src)
        .then((value) => {
          if (!cancelled) setSource(value);
        })
        .catch(() => {});
    else setSource(src);
    return () => {
      cancelled = true;
    };
  }, [src]);
  return <img {...props} src={source} />;
}
