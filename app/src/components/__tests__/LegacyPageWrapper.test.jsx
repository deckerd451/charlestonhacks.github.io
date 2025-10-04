import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegacyPageWrapper } from '../LegacyPageWrapper';

describe('LegacyPageWrapper', () => {
  it('should render an iframe', () => {
    render(<LegacyPageWrapper pagePath="/test.html" title="Test Page" />);

    const iframe = screen.getByTitle('Test Page');
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName).toBe('IFRAME');
  });

  it('should set correct iframe src', () => {
    render(<LegacyPageWrapper pagePath="/2card.html" title="Innovation Engine" />);

    const iframe = screen.getByTitle('Innovation Engine');
    expect(iframe.src).toContain('/2card.html');
  });

  it('should apply correct sandbox attribute', () => {
    render(<LegacyPageWrapper pagePath="/test.html" title="Test" />);

    const iframe = screen.getByTitle('Test');
    expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
    expect(iframe.getAttribute('sandbox')).toContain('allow-same-origin');
  });

  it('should have correct styling', () => {
    render(<LegacyPageWrapper pagePath="/test.html" title="Test" />);

    const iframe = screen.getByTitle('Test');
    expect(iframe.style.width).toBe('100%');
    expect(iframe.style.display).toBe('block');
  });
});
