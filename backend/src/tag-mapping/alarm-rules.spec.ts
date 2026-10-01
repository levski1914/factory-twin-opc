import { validateAlarmRules } from './alarm-rules';
const rule = {
  name: 'Overload',
  nodeId: 'ns=3;s=Motor1.Fault',
  tagName: 'Fault',
  integrationId: 'plc-a',
  condition: 'TRUE',
  threshold: 0,
  severity: 'CRITICAL',
};
describe('Alarm binding validation', () => {
  it('requires explicit target tag after copying a template', () => {
    expect(() =>
      validateAlarmRules([{ ...rule, nodeId: '' }], 'plc-a'),
    ).toThrow();
  });
  it('rejects a rule bound to a different PLC', () => {
    expect(() => validateAlarmRules([rule], 'plc-b')).toThrow();
  });
  it('accepts separate rules using distinct bits of the same word', () => {
    expect(
      validateAlarmRules(
        [0, 31].map((threshold) => ({
          ...rule,
          condition: 'BIT_SET',
          threshold,
        })),
        'plc-a',
      ),
    ).toHaveLength(2);
  });
  it.each([-1, 32, 0.5, NaN])('rejects invalid bit index %s', (threshold) => {
    expect(() =>
      validateAlarmRules(
        [{ ...rule, condition: 'BIT_SET', threshold }],
        'plc-a',
      ),
    ).toThrow();
  });
  it('rejects missing numeric threshold', () => {
    expect(() =>
      validateAlarmRules(
        [{ ...rule, condition: 'GT', threshold: null }],
        'plc-a',
      ),
    ).toThrow();
  });
});
