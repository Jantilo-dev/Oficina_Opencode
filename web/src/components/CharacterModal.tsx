import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  ACCESSORIES,
  BUILTIN_AVATARS,
  DEFAULT_PARTS,
  HAIR_STYLES,
  SKIN_TONES,
  isBuiltinAvatar,
  isImageAvatar,
  type Accessory,
  type CharacterLook,
  type CharacterParts,
  type HairStyle
} from "../characters";
import { drawCharacterPreview } from "../office/sprites";

type Props = {
  title: string;
  current: CharacterLook;
  onSave: (look: CharacterLook) => void;
  onClose: () => void;
};

const MAX_BYTES = 256 * 1024;
const SKIN_LABELS = ["Claro", "Claro cálido", "Medio", "Moreno", "Oscuro"];

export default function CharacterModal({ title, current, onSave, onClose }: Props) {
  const [name, setName] = useState(current.name ?? "");
  const [avatar, setAvatar] = useState(current.avatar ?? "default");
  const [parts, setParts] = useState<CharacterParts | undefined>(current.parts);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!previewRef.current) return;
    const look = !parts && isBuiltinAvatar(avatar) ? avatar : undefined;
    drawCharacterPreview(previewRef.current, parts, look);
  }, [parts, avatar]);

  const changeParts = (patch: Partial<CharacterParts>) => {
    setParts((prev) => ({ ...(prev ?? DEFAULT_PARTS), ...patch }));
    setAvatar("default");
    setError(null);
  };

  const chooseAvatar = (id: string) => {
    setAvatar(id);
    setParts(undefined);
  };

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen (PNG, JPG, WEBP, GIF o SVG).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen supera 256 KB. Usa una versión más pequeña.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
        setParts(undefined);
        setError(null);
      }
    };
    reader.onerror = () => setError("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
  };

  const save = () => {
    const hasImage = isImageAvatar(avatar) || (avatar !== "default" && !isBuiltinAvatar(avatar));
    onSave({
      name: name.trim() ? name.trim() : undefined,
      avatar: hasImage || (isBuiltinAvatar(avatar) && avatar !== "default") ? avatar : undefined,
      parts: hasImage ? undefined : parts
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal char-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>PERSONAJE</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="modal-body">
          <p className="modal-note">Sesión: {title}</p>

          <label className="modal-block">
            Nombre del personaje
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej.: Kira, Mochi, Sora…"
              maxLength={24}
            />
          </label>

          <h3>Diseño personalizado</h3>
          <div className="parts-row">
            <div className="preview-box">
              <canvas ref={previewRef} />
              <span>{parts ? "Personalizado" : "Galería"}</span>
            </div>
            <div className="parts-controls">
              <div className="parts-grid">
                <label>
                  Peinado
                  <select
                    value={parts?.hair ?? "short"}
                    onChange={(event) => changeParts({ hair: event.target.value as HairStyle })}
                  >
                    {HAIR_STYLES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Accesorio
                  <select
                    value={parts?.accessory ?? "none"}
                    onChange={(event) => changeParts({ accessory: event.target.value as Accessory })}
                  >
                    {ACCESSORIES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="colors-row">
                <label>
                  Pelo
                  <input
                    type="color"
                    value={parts?.hairColor ?? DEFAULT_PARTS.hairColor}
                    onChange={(event) => changeParts({ hairColor: event.target.value })}
                  />
                </label>
                <label>
                  Ropa
                  <input
                    type="color"
                    value={parts?.shirt ?? DEFAULT_PARTS.shirt}
                    onChange={(event) => changeParts({ shirt: event.target.value })}
                  />
                </label>
                <div className="skin-field">
                  <span>Piel</span>
                  <div className="tone-row">
                    {SKIN_TONES.map((tone, index) => (
                      <button
                        key={tone}
                        type="button"
                        title={SKIN_LABELS[index] ?? tone}
                        aria-label={SKIN_LABELS[index] ?? tone}
                        className={`tone ${(parts?.skin ?? DEFAULT_PARTS.skin) === tone ? "on" : ""}`}
                        style={{ background: tone }}
                        onClick={() => changeParts({ skin: tone })}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {parts ? (
                <button type="button" className="btn ghost small" onClick={() => setParts(undefined)}>
                  Volver a la galería
                </button>
              ) : null}
            </div>
          </div>

          <h3>Galería</h3>
          <div className="avatar-grid">
            {BUILTIN_AVATARS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`avatar-card ${!parts && avatar === item.id ? "on" : ""}`}
                onClick={() => chooseAvatar(item.id)}
              >
                <span className="avatar-label">{item.label}</span>
                <span className="avatar-hint">{item.hint}</span>
              </button>
            ))}
          </div>

          <div className="upload-row">
            <label className="btn ghost file-btn">
              Subir imagen…
              <input type="file" accept="image/*" onChange={upload} hidden />
            </label>
            {isImageAvatar(avatar) && (
              <>
                <img className="avatar-preview" src={avatar} alt="Avatar" />
                <button type="button" className="btn ghost" onClick={() => setAvatar("default")}>
                  Quitar imagen
                </button>
              </>
            )}
          </div>

          <div className="modal-warning">
            Los arquetipos y piezas son originales y genéricos. No se incluyen personajes con
            copyright (JJK, Pokémon, Miku…). Si subes imágenes, usa solo material que tengas derecho
            a utilizar.
          </div>

          {error && <div className="errbox">{error}</div>}
        </div>

        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" onClick={save}>
            Guardar
          </button>
        </footer>
      </div>
    </div>
  );
}
