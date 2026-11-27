import { FormControl } from '@angular/forms';
import { securePassword } from './secure-password.validator';

describe('securePassword', () => {
  it('accepts a password meeting the backend rules', () => {
    expect(securePassword(new FormControl('SafeExample123!', { nonNullable: true }))).toBeNull();
  });

  it('rejects short, whitespace, and missing character classes', () => {
    expect(securePassword(new FormControl('Short1!', { nonNullable: true }))).toEqual({ passwordMinLength: true });
    expect(securePassword(new FormControl('No Space1!Pass', { nonNullable: true }))).toEqual({ passwordWhitespace: true });
    expect(securePassword(new FormControl('lowercase1234!', { nonNullable: true }))).toEqual({ passwordUppercase: true });
    expect(securePassword(new FormControl('NoDigitPassword!', { nonNullable: true }))).toEqual({ passwordNumber: true });
    expect(securePassword(new FormControl('NoSymbolPass123', { nonNullable: true }))).toEqual({ passwordSymbol: true });
  });

  it('limits the encoded length to the backend maximum', () => {
    expect(securePassword(new FormControl(`Aa1!${'x'.repeat(69)}`, { nonNullable: true }))).toEqual({ passwordMaxLength: true });
  });
});
