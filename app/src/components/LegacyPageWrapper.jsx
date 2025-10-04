// Wrapper component to embed legacy HTML pages in React
import { useEffect, useRef } from 'react';

export function LegacyPageWrapper({ pagePath, title }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current) {
      // Adjust iframe height to content
      const handleLoad = () => {
        try {
          const iframe = iframeRef.current;
          if (iframe.contentWindow) {
            const height = iframe.contentWindow.document.body.scrollHeight;
            iframe.style.height = `${height}px`;
          }
        } catch (e) {
          console.warn('Cannot access iframe content:', e);
        }
      };

      iframeRef.current.addEventListener('load', handleLoad);
      return () => iframeRef.current?.removeEventListener('load', handleLoad);
    }
  }, []);

  return (
    <div className="legacy-page-wrapper">
      <iframe
        ref={iframeRef}
        src={pagePath}
        title={title}
        style={{
          width: '100%',
          minHeight: '100vh',
          border: 'none',
          display: 'block'
        }}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
