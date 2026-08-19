import { useEffect, useMemo, useState } from "react";
import "./ComponentCard.css";

function displayValue(value, fallback = "-") {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return fallback;
  }

  return String(value);
}

function getField(component, ...names) {
  if (!component) return null

  for (const name of names) {
    if (
      component[name] !== undefined &&
      component[name] !== null &&
      String(component[name]).trim() !== ""
    ) {
      return component[name];
    }
  }

  return null;
}

function normalizeType(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export default function ComponentCard({
  component,
  bike,
  imageSources = [],
  onClick,
}) {
  const [imageIndex, setImageIndex] =
    useState(0);

  const [imageFailed, setImageFailed] =
    useState(false);

  const type = normalizeType(
    getField(
      component,
      "component_type",
      "komponen"
    )
  );

  const name = getField(
    component,
    "component_name",
    "name",
    "nama_komponen",
    "component_model",
    "model",
    "brand"
  );

  const brand = getField(
    component,
    "brand",
    "component_brand",
    "merek"
  );

  const model = getField(
    component,
    "model",
    "component_model",
    "tipe"
  );

  const serial = getField(
    component,
    "serial_number",
    "serial",
    "no_seri"
  );

  const status = getField(
    component,
    "status",
    "component_status",
    "status_komponen"
  );

  const currentImage =
    imageSources[imageIndex] || null;

  useEffect(() => {
    setImageIndex(0);
    setImageFailed(false);
  }, [
    component?.id,
    imageSources.join("|"),
  ]);

  const title = useMemo(() => {
    if (name) return name;

    if (brand && model) {
      return `${brand} ${model}`;
    }

    if (brand) return brand;

    if (model) return model;

    return type || "Komponen";
  }, [
    name,
    brand,
    model,
    type,
  ]);

  function handleImageError() {
    if (
      imageIndex <
      imageSources.length - 1
    ) {
      setImageIndex(
        (current) => current + 1
      );
    } else {
      setImageFailed(true);
    }
  }

  function handleClick() {
    if (onClick) {
      onClick();
    }
  }

  return (
    <button
      type="button"
      className="component-card"
      onClick={handleClick}
    >
      <div className="component-top">
        <span className="component-type">
          {type || "COMPONENT"}
        </span>

        {status && (
          <span className="component-status">
            {displayValue(status)}
          </span>
        )}
      </div>

      <div className="component-image">
        {currentImage &&
        !imageFailed ? (
          <img
            src={currentImage}
            alt={`${type} ${title}`}
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="component-image-empty">
            <span>NO IMAGE</span>

            <small>
              GIF / gambar tidak tersedia
            </small>
          </div>
        )}

        {currentImage &&
          !imageFailed && (
            <span className="gif-indicator">
              GIF
            </span>
          )}
      </div>

      <div className="component-content">
        <h3>
          {title}
        </h3>

        {brand && (
          <div className="component-info-row">
            <span>Brand</span>
            <strong>
              {brand}
            </strong>
          </div>
        )}

        {model && (
          <div className="component-info-row">
            <span>Model</span>
            <strong>
              {model}
            </strong>
          </div>
        )}

        {serial && (
          <div className="component-info-row">
            <span>Serial</span>
            <strong>
              {serial}
            </strong>
          </div>
        )}
      </div>

      <div className="component-footer">
        <span>
          Lihat detail
        </span>

        <span className="component-arrow">
          →
        </span>
      </div>
    </button>
  );
}