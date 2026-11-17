type Props = {
  message: string;
  action?: { label: string; onClick: () => void };
};

const REGION_PATTERN = /hosted outside Europe|privacy#regions|Select Global/i;
const BILLING_PATTERN = /Insufficient balance|pay-as-you-go|Top up at|OpenCode Go covers only/i;

export function isRegionError(message: string): boolean {
  return REGION_PATTERN.test(message);
}

export function isBillingError(message: string): boolean {
  return BILLING_PATTERN.test(message);
}

function linkOf(message: string): string | undefined {
  const raw = message.match(/https:\/\/opencode\.ai\/console\/[^\s]+/)?.[0];
  return raw?.replace(/[.,;]+$/, "");
}

export default function ErrorBox({ message, action }: Props) {
  const region = isRegionError(message);
  const billing = !region && isBillingError(message);
  const url = linkOf(message);

  if (!region && !billing) return <div className="errbox">{message}</div>;

  return (
    <div className="errbox">
      {region ? (
        <div>
          El modelo seleccionado está fuera de Europa y Estados Unidos. Cambia la región de
          privacidad de tu organización de opencode a <b>Global</b> para poder usarlo.
        </div>
      ) : (
        <div>
          No hay saldo para el modelo del proveedor <b>OpenCode</b> (pago por uso). Recarga
          créditos o cambia a un modelo de <b>OpenCode Go</b>; OpenCode Go solo cubre peticiones a
          su propio proveedor.
        </div>
      )}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          {region ? "Abrir configuración de regiones" : "Abrir facturación"}
        </a>
      ) : null}
      {action ? (
        <button type="button" className="btn ghost small" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
