import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Sparkline from './Sparkline.jsx';

describe('Sparkline', () => {
  it('renders an SVG chart when given enough data', () => {
    const { container } = render(<Sparkline data={[2, 4, 6, 8]} color="#2563eb" />);
    const svg = container.querySelector('svg.sparkline');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('linearGradient')).not.toBe(null);
  });

  it('renders nothing with fewer than 2 data points', () => {
    const { container } = render(<Sparkline data={[5]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when data is missing', () => {
    const { container } = render(<Sparkline />);
    expect(container).toBeEmptyDOMElement();
  });

  it('gives every instance a unique gradient id (no SVG id collision)', () => {
    const { container } = render(
      <div>
        <Sparkline data={[1, 2, 3]} color="#2563eb" />
        <Sparkline data={[4, 5, 6]} color="#2563eb" />
      </div>
    );
    const ids = [...container.querySelectorAll('linearGradient')].map((g) => g.getAttribute('id'));
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});