import type { ModelInfo } from "../types";

type Props = {
  models: ModelInfo[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function ModelSelect({ models, value, onChange, className }: Props) {
  const groups = new Map<string, ModelInfo[]>();
  for (const model of models) {
    const list = groups.get(model.providerName) ?? [];
    list.push(model);
    groups.set(model.providerName, list);
  }

  return (
    <select className={className} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Modelo del agente</option>
      {[...groups.entries()].map(([provider, list]) => (
        <optgroup key={provider} label={provider}>
          {list.map((model) => (
            <option key={`${model.providerID}::${model.modelID}`} value={`${model.providerID}::${model.modelID}`}>
              {model.label}
              {model.providerID === "opencode"
                ? " · pago por uso"
                : model.providerID === "opencode-go"
                  ? " · Go · región Global"
                  : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
