import { validatePassport } from './equipment-passport';
describe('Technical passport validation', () => {
  it('allows missing specifications and retains explicit zero Celsius', () => {
    expect(validatePassport({})).toEqual({});
    expect(validatePassport({ model: ' M1 ', maxTemperatureC: 0 })).toEqual({
      model: 'M1',
      maxTemperatureC: 0,
    });
  });
  it.each([
    null,
    [],
    { ratedCurrentA: -1 },
    { ratedPowerKw: Infinity },
    { maxTemperatureC: -300 },
    { model: 3 },
    { extra: true },
  ])('rejects invalid input %p', (value) => {
    expect(() => validatePassport(value)).toThrow();
  });
});
