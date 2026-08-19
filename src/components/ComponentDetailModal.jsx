import { useEffect, useMemo, useState } from "react";
import "./ComponentDetailModal.css";

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

function normalizeType(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function formatLabel(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isUrl(value) {
  if (!value) return false;

  const text = String(value).trim();

  return (
    text.startsWith("http://") ||
    text.startsWith("https://")
  );
}

function isImageField(key) {
  const normalized = String(key || "").toLowerCase();

  return (
    normalized.includes("image") ||
    normalized.includes("gambar") ||
    normalized.includes("gif") ||
    normalized.includes("photo") ||
    normalized.includes("foto")
  );
}

function isTechnicalField(key) {
  const normalized = String(key || "").toLowerCase();

  return [
    "id",
    "bicycle_id",
    "created_at",
    "updated_at",
  ].includes(normalized);
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function getStatusClass(value) {
  const status = normalizeStatus(value);

  if (
    status === "BAIK" ||
    status === "TERPASANG" ||
    status === "ROADWORTHY" ||
    status === "AKTIF"
  ) {
    return "good";
  }

  if (
    status === "RUSAK" ||
    status === "NONAKTIF" ||
    status === "NON_AKTIF"
  ) {
    return "danger";
  }

  if (
    status === "MAINTENANCE" ||
    status === "PERLU_INSPEKSI"
  ) {
    return "warning";
  }

  return "";
}

function getComponentValue(component, ...keys) {
  if (!component) return null;

  for (const key of keys) {
    if (
      component[key] !== undefined &&
      component[key] !== null &&
      String(component[key]).trim() !== ""
    ) {
      return component[key];
    }
  }

  return null;
}

export default function ComponentDetailModal({
  component,
  bike,
  imageSources = [],
  onClose,
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageIndex(0);
    setImageFailed(false);
  }, [component?.id, imageSources.join("|")]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  const type = normalizeType(
    component?.component_type ||
      component?.komponen
  );

  const brand = getComponentValue(
    component,
    "brand",
    "component_brand",
    "merek"
  );

  const model = getComponentValue(
    component,
    "model",
    "component_model",
    "tipe"
  );

  const componentName = getComponentValue(
    component,
    "component_name",
    "name",
    "nama_komponen"
  );

  const condition = getComponentValue(
    component,
    "condition",
    "kondisi",
    "status_kondisi"
  );

  const installation = getComponentValue(
    component,
    "installation_status",
    "status_pemasangan",
    "pemasangan"
  );

  const status =
    getComponentValue(
      component,
      "status"
    );

  const componentNumber = getComponentValue(
    component,
    "component_number",
    "nomor_komponen",
    "part_number",
    "serial_number",
    "nomor"
  );

  const currentImage =
    imageSources[imageIndex] || null;

  const fields = useMemo(() => {
    if (!component) return [];

    return Object.entries(component).filter(
      ([key, value]) => {
        if (isTechnicalField(key)) {
          return false;
        }

        if (isImageField(key)) {
          return false;
        }

        if (
          value === null ||
          value === undefined ||
          String(value).trim() === ""
        ) {
          return false;
        }

        return true;
      }
    );
  }, [component]);

  if (!component) {
    return null;
  }

  const title =
    componentName ||
    model ||
    brand ||
    type ||
    "Komponen";

  function handleImageError() {
    if (
      imageIndex <
      imageSources.length - 1
    ) {
      setImageIndex(
        (current) => current + 1
      );

      return;
    }

    setImageFailed(true);
  }

  function renderValue(key, value) {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return "-";
    }

    if (isImageField(key)) {
      return null;
    }

    if (typeof value === "boolean") {
      return value ? "Ya" : "Tidak";
    }

    if (typeof value === "object") {
      return (
        <pre>
          {JSON.stringify(
            value,
            null,
            2
          )}
        </pre>
      );
    }

    if (isUrl(value)) {
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noreferrer"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          Buka link
        </a>
      );
    }

    return String(value);
  }

  return (
    <div
      className="component-modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
      <div
        className="component-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Detail ${type}`}
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="component-modal-header">
          <div className="modal-header-content">
            <div className="modal-header-kicker">
              <span className="modal-kicker-line" />
              DETAIL KOMPONEN
            </div>

            <h2>{title}</h2>

            {bike && (
              <p>
                {displayValue(
                  bike.bike_brand,
                  ""
                )}{" "}
                {displayValue(
                  bike.bike_model,
                  ""
                )}
                {bike.no_unit
                  ? ` • ${bike.no_unit}`
                  : ""}
              </p>
            )}
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Tutup popup"
          >
            ×
          </button>
        </header>

        {/* =====================================================
            BODY SCROLL
        ===================================================== */}

        <div className="component-modal-body">
          {/* =================================================
              TOP SECTION
          ================================================= */}

          <section className="modal-top-section">
            {/* -----------------------------------------------
                IMAGE
            ----------------------------------------------- */}

            <div className="modal-image-card">
              <div className="modal-image-frame">
                {currentImage &&
                !imageFailed ? (
                  <img
                    src={currentImage}
                    alt={`${type} ${title}`}
                    onError={
                      handleImageError
                    }
                  />
                ) : (
                  <div className="modal-no-image">
                    <div className="no-image-icon">
                      ⚙
                    </div>

                    <strong>
                      GIF tidak tersedia
                    </strong>

                    <span>
                      Pastikan file komponen
                      berada di bucket
                    </span>

                    <small>
                      bike-components
                    </small>
                  </div>
                )}
              </div>

              {imageSources.length > 1 &&
                !imageFailed && (
                  <div className="image-source-count">
                    {imageIndex + 1} /{" "}
                    {imageSources.length}
                  </div>
                )}
            </div>

            {/* -----------------------------------------------
                INFORMATION
            ----------------------------------------------- */}

            <div className="modal-information">
              <div className="information-title">
                Informasi Komponen
              </div>

              {/* STATUS DOTS */}

              <div className="information-status-row">
                {installation && (
                  <div className="status-inline">
                    <span className="status-dot" />
                    <strong>
                      {String(
                        installation
                      ).toUpperCase()}
                    </strong>
                  </div>
                )}

                {condition && (
                  <div className="status-inline">
                    <span className="status-dot" />
                    <strong>
                      {String(
                        condition
                      ).toUpperCase()}
                    </strong>
                  </div>
                )}

                {!installation &&
                  !condition &&
                  status && (
                    <div className="status-inline">
                      <span
                        className={`status-dot ${getStatusClass(
                          status
                        )}`}
                      />

                      <strong>
                        {String(
                          status
                        ).toUpperCase()}
                      </strong>
                    </div>
                  )}
              </div>

              {/* INFORMATION GRID */}

              <div className="information-grid">
                <div className="information-card">
                  <span>KOMPONEN</span>
                  <strong>
                    {displayValue(
                      type
                    )}
                  </strong>
                </div>

                <div className="information-card">
                  <span>NOMOR</span>
                  <strong>
                    {displayValue(
                      componentNumber,
                      displayValue(
                        bike?.no_unit
                      )
                    )}
                  </strong>
                </div>

                <div className="information-card">
                  <span>MEREK</span>
                  <strong>
                    {displayValue(
                      brand
                    )}
                  </strong>
                </div>

                <div className="information-card">
                  <span>SET SEPEDA</span>
                  <strong>
                    {displayValue(
                      bike?.bicycleset
                    )}
                  </strong>
                </div>

                <div className="information-card">
                  <span>MODEL</span>
                  <strong>
                    {displayValue(
                      model
                    )}
                  </strong>
                </div>

                <div className="information-card information-card-wide">
                  <span>KONDISI</span>

                  <strong
                    className={`condition-badge ${getStatusClass(
                      condition
                    )}`}
                  >
                    <i />
                    {displayValue(
                      condition ||
                        status
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              DETAIL LENGKAP
          ================================================= */}

          {fields.length > 0 && (
            <section className="modal-full-details">
              <div className="full-details-header">
                <div>
                  <span>
                    DATA KOMPONEN
                  </span>

                  <h3>
                    Detail Lengkap
                  </h3>
                </div>

                <div className="details-count">
                  {fields.length} DATA
                </div>
              </div>

              <div className="modal-detail-grid">
                {fields.map(
                  ([key, value]) => (
                    <div
                      className="modal-detail-card"
                      key={key}
                    >
                      <span>
                        {formatLabel(
                          key
                        )}
                      </span>

                      <strong>
                        {renderValue(
                          key,
                          value
                        )}
                      </strong>
                    </div>
                  )
                )}
              </div>
            </section>
          )}
        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <footer className="component-modal-footer">
          <span>
            Tekan <b>ESC</b> atau klik di
            luar untuk menutup
          </span>

          <button
            type="button"
            onClick={onClose}
          >
            Tutup
          </button>
        </footer>
      </div>
    </div>
  );
}