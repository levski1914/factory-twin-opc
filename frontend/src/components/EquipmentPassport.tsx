import type { EquipmentPassport } from "../services/api";
export const passportFields = [
  ["manufacturer", "Manufacturer", "text"],
  ["model", "Model", "text"],
  ["serialNumber", "Serial number", "text"],
  ["reference", "Specification / document reference", "text"],
  ["ratedPowerKw", "Rated power (kW)", "number"],
  ["ratedCurrentA", "Rated current (A)", "number"],
  ["maxTemperatureC", "Maximum permitted temperature (°C)", "number"],
] as const;
export function PassportEditor({
  value,
  onChange,
}: {
  value: EquipmentPassport;
  onChange: (value: EquipmentPassport) => void;
}) {
  return (
    <section className="panel space-y-4">
      <h2>Technical passport</h2>
      <p className="text-sm text-slate-400">
        Copy known values from the nameplate or manufacturer documentation.
        Leave unknown or inapplicable fields blank. Nominal values are reference
        data, not automatic alarm limits.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {passportFields.map(([key, label, type]) => (
          <label key={key} className="grid gap-2 text-sm">
            {label}
            <input
              className="rounded-lg bg-slate-950 p-3"
              type={type}
              step="any"
              maxLength={256}
              value={value[key] ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  [key]:
                    e.target.value === ""
                      ? undefined
                      : type === "number"
                        ? e.target.valueAsNumber
                        : e.target.value,
                })
              }
            />
          </label>
        ))}
      </div>
    </section>
  );
}
export function PassportSummary({ value }: { value?: EquipmentPassport }) {
  const fields = passportFields.filter(
    ([key]) => value?.[key] !== undefined && value?.[key] !== "",
  );
  return (
    <section className="panel space-y-3">
      <h2>Technical passport</h2>
      {fields.length ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {fields.map(([key, label]) => (
            <div key={key}>
              <dt className="text-sm text-slate-400">{label}</dt>
              <dd className="break-words">{value?.[key]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-slate-400">No specification data entered yet.</p>
      )}
      <p className="text-xs text-slate-400">
        Reference data. Alarm limits are configured separately.
      </p>
    </section>
  );
}
