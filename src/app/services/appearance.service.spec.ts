import { AppearanceService } from './appearance.service';

describe('AppearanceService', () => {
  it('persists the theme on the document root and formats imperial units', () => {
    const service = new AppearanceService();
    service.apply({ tema: 'oscuro', unidades: 'imperial' });
    expect(document.documentElement.dataset['theme']).toBe('oscuro');
    expect(service.format(10, 'km')).toContain('mi');
    expect(service.format(2, 'kg CO₂e')).toContain('lb CO₂e');
    expect(service.displayUnit('km/semana')).toBe('mi/semana');
    expect(service.toStorage(service.toDisplay(10, 'km/semana'), 'km/semana')).toBeCloseTo(10, 8);
  });

  it('keeps metric quantities unchanged and handles missing measurements', () => {
    const service = new AppearanceService();
    expect(service.format(10, 'km')).toContain('10');
    expect(service.format(null, 'km')).toBe('—');
  });
});
