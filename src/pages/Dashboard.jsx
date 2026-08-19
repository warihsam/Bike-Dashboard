import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { supabase } from "../services/supabase";

import {
  checkSyncService,
  syncSpreadsheet,
} from "../services/syncService";

import Navbar from "../components/Navbar";
import ComponentCard from "../components/ComponentCard";
import ComponentDetailModal from "../components/ComponentDetailModal";

import "./Dashboard.css";

/* ============================================================
   SUPABASE STORAGE
============================================================ */

const BUCKET_NAME = "bike-components";

/* ============================================================
   AUTO SYNC
============================================================ */

const AUTO_SYNC_INTERVAL = 3000;

/* ============================================================
   COMPONENT TYPES
============================================================ */

const COMPONENT_TYPES = [
  "MODEL",
  "FRAME",
  "FORK",
  "HANDLEBAR",
  "SADDLE",
  "CHAIN",
  "RIM",
];

/* ============================================================
   STORAGE MAPPING
============================================================ */

const STORAGE_PREFIX_MAP = {
  10: "Bmx",
  14: "Bmxx",
  12: "Polygon",
};

const COMPONENT_PREFIX_MAP = {
  MODEL: "",
  FRAME: "Frame",
  FORK: "Fork",
  HANDLEBAR: "Handlebar",
  SADDLE: "Saddle",
  CHAIN: "Chain",
  RIM: "Rim",
};

const IMAGE_EXTENSIONS = [
  ".gif",
  ".GIF",
  ".png",
  ".PNG",
  ".jpg",
  ".JPG",
  ".jpeg",
  ".JPEG",
  ".webp",
  ".WEBP",
  ".svg",
  ".SVG",
];

/* ============================================================
   BASIC HELPERS
============================================================ */

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

/* ============================================================
   DATE
============================================================ */

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/* ============================================================
   STATUS
============================================================ */

function normalizeStatus(value) {
  if (!value) return "";

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function getStatusLabel(value) {
  const status = normalizeStatus(value);

  const labels = {
    ROADWORTHY: "ROADWORTHY",
    AKTIF: "ROADWORTHY",
    MAINTENANCE: "MAINTENANCE",
    NONAKTIF: "NONAKTIF",
    NON_AKTIF: "NONAKTIF",
    TERPASANG: "TERPASANG",
    TERLEPAS: "TERLEPAS",
    BAIK: "BAIK",
    RUSAK: "RUSAK",
    PERLU_INSPEKSI: "PERLU INSPEKSI",
  };

  return labels[status] || displayValue(value);
}

/* ============================================================
   COMPONENT FIELD HELPER
============================================================ */

function getComponentField(component, ...names) {
  if (!component) return null;

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

/* ============================================================
   STORAGE HELPERS
============================================================ */

function normalizeFileName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/* ============================================================
   GET FILE BASE NAME
============================================================ */

function getFileBaseName(fileName) {
  const cleanName = String(fileName || "").trim();

  if (!cleanName) return "";

  const lastDot = cleanName.lastIndexOf(".");

  if (lastDot === -1) {
    return cleanName;
  }

  return cleanName.substring(0, lastDot);
}

/* ============================================================
   STORAGE URL
============================================================ */

function getStorageUrl(fileName) {
  if (!fileName) return null;

  const cleanName = String(fileName).trim();

  if (!cleanName) return null;

  if (
    cleanName.startsWith("http://") ||
    cleanName.startsWith("https://")
  ) {
    return cleanName;
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(cleanName);

  return data?.publicUrl || null;
}

/* ============================================================
   EXPECTED STORAGE NAME
============================================================ */

function getExpectedStorageBaseName(bike, type) {
  if (!bike || !type) {
    return null;
  }

  const bicycleId = Number(bike.id);

  let baseName = STORAGE_PREFIX_MAP[bicycleId];

  if (!baseName) {
    const brand = String(
      bike.bike_brand || ""
    ).toLowerCase();

    const model = String(
      bike.bike_model || ""
    ).toLowerCase();

    if (brand.includes("polygon")) {
      baseName = "Polygon";
    } else if (
      brand.includes("wimcycle") &&
      model.includes("lite")
    ) {
      baseName = "Bmxx";
    } else if (
      brand.includes("wimcycle")
    ) {
      baseName = "Bmx";
    }
  }

  if (!baseName) {
    return null;
  }

  const componentType = String(type)
    .trim()
    .toUpperCase();

  const prefix =
    COMPONENT_PREFIX_MAP[componentType];

  if (prefix === undefined) {
    return null;
  }

  return `${prefix}${baseName}`;
}

/* ============================================================
   STORAGE CANDIDATES
============================================================ */

function getStorageCandidates(
  bike,
  type,
  storageFiles = []
) {
  const expectedBaseName =
    getExpectedStorageBaseName(
      bike,
      type
    );

  if (!expectedBaseName) {
    return [];
  }

  const expectedNormalized =
    normalizeFileName(
      expectedBaseName
    );

  const candidates = [];

  /* ----------------------------------------------------------
     EXISTING FILES
  ---------------------------------------------------------- */

  for (const file of storageFiles) {
    const fileName =
      typeof file === "string"
        ? file
        : file?.name;

    if (!fileName) {
      continue;
    }

    const baseName =
      getFileBaseName(fileName);

    const normalizedBaseName =
      normalizeFileName(baseName);

    if (
      normalizedBaseName ===
      expectedNormalized
    ) {
      candidates.push(fileName);
    }
  }

  /* ----------------------------------------------------------
     FALLBACK EXTENSIONS
  ---------------------------------------------------------- */

  for (
    const extension of IMAGE_EXTENSIONS
  ) {
    candidates.push(
      `${expectedBaseName}${extension}`
    );
  }

  /* ----------------------------------------------------------
     REMOVE DUPLICATES
  ---------------------------------------------------------- */

  const seen = new Set();

  return candidates.filter(
    (fileName) => {
      const key =
        normalizeFileName(fileName);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

/* ============================================================
   COMPONENT IMAGE SOURCES
============================================================ */

function getComponentImageSources(
  component,
  bike,
  storageFiles = []
) {
  const sources = [];

  /* ----------------------------------------------------------
     STORAGE
  ---------------------------------------------------------- */

  const componentType =
    component?.component_type ||
    component?.komponen;

  const storageCandidates =
    getStorageCandidates(
      bike,
      componentType,
      storageFiles
    );

  for (
    const fileName of storageCandidates
  ) {
    const url =
      getStorageUrl(fileName);

    if (url) {
      sources.push(url);
    }
  }

  /* ----------------------------------------------------------
     DATABASE GIF URL
  ---------------------------------------------------------- */

  const gifUrl =
    component?.gif_url;

  if (gifUrl) {
    const value =
      String(gifUrl).trim();

    if (value) {
      const url =
        getStorageUrl(value);

      if (url) {
        sources.push(url);
      }
    }
  }

  /* ----------------------------------------------------------
     DATABASE IMAGE URL
  ---------------------------------------------------------- */

  const imageUrl =
    component?.image_url;

  if (imageUrl) {
    const value =
      String(imageUrl).trim();

    if (value) {
      const url =
        getStorageUrl(value);

      if (url) {
        sources.push(url);
      }
    }
  }

  return [
    ...new Set(
      sources.filter(Boolean)
    ),
  ];
}

/* ============================================================
   DASHBOARD
============================================================ */

export default function Dashboard() {

  /* ==========================================================
     DATABASE STATE
  ========================================================== */

  const [
    bicycles,
    setBicycles,
  ] = useState([]);

  const [
    components,
    setComponents,
  ] = useState([]);

  /* ==========================================================
     SELECTED STATE
  ========================================================== */

  const [
    selectedBike,
    setSelectedBike,
  ] = useState(null);

  const [
    selectedComponent,
    setSelectedComponent,
  ] = useState(null);

  /* ==========================================================
     STORAGE
  ========================================================== */

  const [
    storageFiles,
    setStorageFiles,
  ] = useState([]);

  /* ==========================================================
     SEARCH
  ========================================================== */

  const [
    search,
    setSearch,
  ] = useState("");

  /* ==========================================================
     LOADING
  ========================================================== */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState(null);

  /* ==========================================================
     SYNC
  ========================================================== */

  const [
    syncing,
    setSyncing,
  ] = useState(false);

  const [
    syncMessage,
    setSyncMessage,
  ] = useState("");

  const [
    syncType,
    setSyncType,
  ] = useState("");

  /* ==========================================================
     SYNC RESULT
  ========================================================== */

  const [
    syncResult,
    setSyncResult,
  ] = useState(null);

  /* ==========================================================
     AUTO SYNC
  ========================================================== */

  const autoSyncingRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {

    mountedRef.current = true;

    loadData();

    return () => {
      mountedRef.current = false;
    };

  }, []);

  /* ==========================================================
     AUTO SYNC
  ========================================================== */

  useEffect(() => {

    let cancelled = false;

    async function runAutoSync() {

      if (cancelled) {
        return;
      }

      if (!mountedRef.current) {
        return;
      }

      if (autoSyncingRef.current) {
        return;
      }

      /*
       * Jangan ganggu manual sync.
       */
      if (syncing) {
        return;
      }

      autoSyncingRef.current = true;

      try {

        console.log(
          "========================================"
        );

        console.log(
          "AUTO SYNC START"
        );

        console.log(
          "========================================"
        );

        const result =
          await syncSpreadsheet({
            direction: "both",

            tables: [
              "bicycles",
              "components",
            ],
          });

        console.log(
          "AUTO SYNC RESULT:",
          result
        );

        if (
          result &&
          result.success === false
        ) {
          console.error(
            "AUTO SYNC FAILED:",
            result.message ||
              result.error
          );

          return;
        }

        /*
         * Setelah Google Sheet → Supabase selesai,
         * ambil data terbaru.
         */
        if (
          mountedRef.current &&
          !cancelled
        ) {
          await loadData();
        }

      } catch (error) {

        console.error(
          "AUTO SYNC ERROR:",
          error
        );

      } finally {

        autoSyncingRef.current =
          false;

      }
    }

    /*
     * Jangan langsung sync bersamaan dengan
     * initial load.
     */
    const initialTimer =
      setTimeout(() => {

        runAutoSync();

      }, 1000);

    /*
     * AUTO SYNC SETIAP 3 DETIK
     */
    const interval =
      setInterval(() => {

        runAutoSync();

      }, AUTO_SYNC_INTERVAL);

    return () => {

      cancelled = true;

      clearTimeout(
        initialTimer
      );

      clearInterval(
        interval
      );

    };

  }, [syncing]);

  /* ==========================================================
     ESC MODAL
  ========================================================== */

  useEffect(() => {

    function handleKeyDown(event) {

      if (
        event.key === "Escape"
      ) {
        setSelectedComponent(
          null
        );
      }

    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

    };

  }, []);

  /* ==========================================================
     BODY LOCK
  ========================================================== */

  useEffect(() => {

    if (
      selectedComponent
    ) {

      document.body.classList.add(
        "modal-open"
      );

    } else {

      document.body.classList.remove(
        "modal-open"
      );

    }

    return () => {

      document.body.classList.remove(
        "modal-open"
      );

    };

  }, [
    selectedComponent,
  ]);

  /* ==========================================================
     SYNC GOOGLE SHEET MANUAL
  ========================================================== */

  async function handleSync() {

    if (
      syncing ||
      autoSyncingRef.current
    ) {
      return;
    }

    setSyncing(true);
    setSyncMessage("");
    setSyncType("");
    setSyncResult(null);

    try {

      console.log(
        "========================================"
      );

      console.log(
        "START GOOGLE SHEET MANUAL SYNC"
      );

      console.log(
        "========================================"
      );

      /* ------------------------------------------------------
         CHECK SERVICE
      ------------------------------------------------------ */

      const serviceStatus =
        await checkSyncService();

      console.log(
        "SYNC SERVICE STATUS:",
        serviceStatus
      );

      if (
        serviceStatus &&
        serviceStatus.success === false
      ) {
        throw new Error(
          serviceStatus.message ||
            "Google Sync Service tidak dapat diakses."
        );
      }

      /* ------------------------------------------------------
         EXECUTE SYNC
      ------------------------------------------------------ */

      const result =
        await syncSpreadsheet({
          direction: "both",

          tables: [
            "bicycles",
            "components",
          ],
        });

      console.log(
        "GOOGLE SHEET SYNC RESULT:",
        result
      );

      if (
        result &&
        result.success === false
      ) {
        throw new Error(
          result.message ||
            result.error ||
            "Sinkronisasi gagal."
        );
      }

      setSyncResult(
        result
      );

      setSyncType(
        "success"
      );

      setSyncMessage(
        result?.message ||
          "Sinkronisasi Google Spreadsheet ke Supabase berhasil."
      );

      /* ------------------------------------------------------
         REFRESH DATABASE
      ------------------------------------------------------ */

      await loadData();

    } catch (error) {

      console.error(
        "SYNC ERROR:",
        error
      );

      setSyncType(
        "error"
      );

      setSyncMessage(
        error?.message ||
          "Gagal melakukan sinkronisasi Google Spreadsheet."
      );

    } finally {

      setSyncing(false);

    }
  }

  /* ==========================================================
     LOAD STORAGE FILES
  ========================================================== */

  async function loadStorageFiles() {

    try {

      const allFiles = [];

      let offset = 0;

      const limit = 100;

      while (true) {

        const {
          data,
          error,
        } =
          await supabase.storage
            .from(
              BUCKET_NAME
            )
            .list(
              "",
              {
                limit,
                offset,
                sortBy: {
                  column: "name",
                  order: "asc",
                },
              }
            );

        if (error) {

          console.error(
            "STORAGE ERROR:",
            error
          );

          break;
        }

        if (
          !Array.isArray(data) ||
          data.length === 0
        ) {
          break;
        }

        allFiles.push(
          ...data
        );

        if (
          data.length < limit
        ) {
          break;
        }

        offset += limit;
      }

      if (
        mountedRef.current
      ) {

        setStorageFiles(
          allFiles
        );

      }

      console.log(
        "SUPABASE STORAGE FILES:",
        allFiles
      );

      return allFiles;

    } catch (error) {

      console.error(
        "LOAD STORAGE ERROR:",
        error
      );

      if (
        mountedRef.current
      ) {

        setStorageFiles(
          []
        );

      }

      return [];

    }

  }

  /* ==========================================================
     LOAD DATABASE
  ========================================================== */

  async function loadData() {

    /*
     * Jangan menjalankan loadData terlalu banyak
     * secara bersamaan.
     */
    try {

      setLoadError(null);

      const [
        bicycleResult,
        componentResult,
      ] =
        await Promise.all([

          supabase
            .from("bicycles")
            .select("*")
            .order(
              "bicycleset",
              {
                ascending: true,
              }
            )
            .order(
              "no_unit",
              {
                ascending: true,
              }
            ),

          supabase
            .from("components")
            .select("*")
            .order(
              "component_type",
              {
                ascending: true,
              }
            ),

        ]);

      /* --------------------------------------------------------
         BICYCLE ERROR
      -------------------------------------------------------- */

      if (
        bicycleResult.error
      ) {
        throw bicycleResult.error;
      }

      /* --------------------------------------------------------
         COMPONENT ERROR
      -------------------------------------------------------- */

      if (
        componentResult.error
      ) {
        throw componentResult.error;
      }

      const bikes =
        Array.isArray(
          bicycleResult.data
        )
          ? bicycleResult.data
          : [];

      const comps =
        Array.isArray(
          componentResult.data
        )
          ? componentResult.data
          : [];

      console.log(
        "BICYCLES:",
        bikes
      );

      console.log(
        "COMPONENTS:",
        comps
      );

      if (
        !mountedRef.current
      ) {
        return;
      }

      setBicycles(
        bikes
      );

      setComponents(
        comps
      );

      /* --------------------------------------------------------
         SELECTED BIKE
      -------------------------------------------------------- */

      if (
        bikes.length > 0
      ) {

        setSelectedBike(
          (current) => {

            if (
              current &&
              bikes.some(
                (bike) =>
                  String(
                    bike.id
                  ) ===
                  String(
                    current.id
                  )
              )
            ) {

              return bikes.find(
                (bike) =>
                  String(
                    bike.id
                  ) ===
                  String(
                    current.id
                  )
              );

            }

            return bikes[0];

          }
        );

      } else {

        setSelectedBike(
          null
        );

      }

      /* --------------------------------------------------------
         STORAGE
      -------------------------------------------------------- */

      await loadStorageFiles();

    } catch (error) {

      console.error(
        "DASHBOARD LOAD ERROR:",
        error
      );

      if (
        mountedRef.current
      ) {

        setLoadError(
          error?.message ||
            "Data dashboard gagal dimuat."
        );

        setBicycles(
          []
        );

        setComponents(
          []
        );

        setStorageFiles(
          []
        );

        setSelectedBike(
          null
        );

      }

    } finally {

      if (
        mountedRef.current
      ) {

        setLoading(
          false
        );

      }

    }
  }

  /* ==========================================================
     GET COMPONENTS BY BIKE
  ========================================================== */

  function getBikeComponents(
    bikeId
  ) {

    return components.filter(
      (component) =>
        String(
          component.bicycle_id
        ) ===
        String(
          bikeId
        )
    );

  }

  /* ==========================================================
     GET ONE COMPONENT
  ========================================================== */

  function getComponent(
    bikeId,
    type
  ) {

    return components.find(
      (component) => {

        const componentType =
          component.component_type ??
          component.komponen ??
          "";

        return (
          String(
            component.bicycle_id
          ) ===
            String(
              bikeId
            ) &&

          String(
            componentType
          )
            .trim()
            .toUpperCase() ===
            String(type)
              .trim()
              .toUpperCase()
        );

      }
    );

  }

  /* ==========================================================
     SEARCH
  ========================================================== */

  const filteredBicycles =
    useMemo(
      () => {

        const keyword =
          search
            .trim()
            .toLowerCase();

        if (!keyword) {
          return bicycles;
        }

        return bicycles.filter(
          (bike) => {

            const values = [

              bike.bicycleset,

              bike.no_unit,

              bike.bike_brand,

              bike.bike_model,

              bike.status_sepeda,

              bike.status,

            ];

            return values
              .filter(
                (value) =>
                  value !== null &&
                  value !== undefined
              )
              .some(
                (value) =>
                  String(value)
                    .toLowerCase()
                    .includes(
                      keyword
                    )
              );

          }
        );

      },
      [
        bicycles,
        search,
      ]
    );

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {

    return (
      <div className="dashboard-page">

        <Navbar />

        <main className="dashboard-container">

          <div className="dashboard-loading">

            <div className="loading-spinner" />

            <h2>
              Memuat data sepeda
            </h2>

            <p>
              Mengambil data sepeda,
              komponen, dan GIF...
            </p>

          </div>

        </main>

      </div>
    );

  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <div className="dashboard-page">

      <Navbar />

      <main className="dashboard-container">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <section className="dashboard-header">

          <div className="dashboard-heading">

            <span className="dashboard-label">
              BIKE DATABASE
            </span>

            <h1>
              Dashboard{" "}
              <span>
                Sepeda
              </span>
            </h1>

            <p className="dashboard-description">
              Data sepeda dan seluruh
              komponen tersimpan di
              Supabase.
            </p>

          </div>

          <div className="dashboard-header-actions">

            {/* ==================================================
                SYNC BUTTON
            ================================================== */}

            <button
              type="button"
              className={`sync-button ${
                syncing
                  ? "syncing"
                  : ""
              }`}
              onClick={
                handleSync
              }
              disabled={
                syncing ||
                autoSyncingRef.current
              }
            >

            </button>

            {/* ==================================================
                BIKE COUNT
            ================================================== */}

            <div className="bike-count">

              <strong>
                {
                  bicycles.length
                }
              </strong>

              <span>
                Unit Sepeda
              </span>

            </div>

          </div>

        </section>

        {/* ====================================================
            AUTO SYNC STATUS
        ==================================================== */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            fontSize: "12px",
            opacity: 0.65,
          }}
        >

          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background:
                "#22c55e",
              display: "inline-block",
            }}
          />

          <span>
            Sinkronisasi otomatis aktif
          </span>

        </div>

        {/* ====================================================
            SYNC MESSAGE
        ==================================================== */}

        {syncMessage && (

          <div
            className={`sync-message ${
              syncType ===
              "success"
                ? "success"
                : "error"
            }`}
          >

            <span className="sync-message-icon">

              {syncType ===
              "success"
                ? "✓"
                : "!"}

            </span>

            <div>

              <strong>

                {syncType ===
                "success"
                  ? "Sinkronisasi berhasil"
                  : "Sinkronisasi gagal"}

              </strong>

              <p>
                {
                  syncMessage
                }
              </p>

              {/* =================================================
                  SYNC DETAIL
              ================================================= */}

              {syncType ===
                "success" &&
                syncResult && (

                  <div className="sync-result">

                    <span>
                      +{" "}
                      {
                        syncResult.insertedBicycles ??
                        0
                      }{" "}
                      sepeda
                    </span>

                    <span>
                      ↻{" "}
                      {
                        syncResult.updatedBicycles ??
                        0
                      }{" "}
                      sepeda
                    </span>

                    <span>
                      −{" "}
                      {
                        syncResult.deletedBicycles ??
                        0
                      }{" "}
                      sepeda
                    </span>

                    <span>
                      +{" "}
                      {
                        syncResult.insertedComponents ??
                        0
                      }{" "}
                      komponen
                    </span>

                    <span>
                      ↻{" "}
                      {
                        syncResult.updatedComponents ??
                        0
                      }{" "}
                      komponen
                    </span>

                    <span>
                      −{" "}
                      {
                        syncResult.deletedComponents ??
                        0
                      }{" "}
                      komponen
                    </span>

                  </div>

                )}

            </div>

            <button
              type="button"
              onClick={() => {

                setSyncMessage(
                  ""
                );

                setSyncType(
                  ""
                );

                setSyncResult(
                  null
                );

              }}
              aria-label="Tutup pesan"
            >
              ×
            </button>

          </div>

        )}

        {/* ====================================================
            ERROR
        ==================================================== */}

        {loadError && (

          <div className="dashboard-error">

            <div className="error-icon">
              !
            </div>

            <div className="error-content">

              <strong>
                Gagal memuat data
              </strong>

              <p>
                {
                  loadError
                }
              </p>

            </div>

            <button
              type="button"
              onClick={
                loadData
              }
            >
              Coba Lagi
            </button>

          </div>

        )}

        {/* ====================================================
            SEARCH
        ==================================================== */}

        {bicycles.length > 0 && (

          <section className="dashboard-search">

            <div className="search-box">

              <span className="search-icon">
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Cari nomor unit, merek, model, atau bike set..."
              />

              {search && (

                <button
                  type="button"
                  className="search-clear"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Hapus pencarian"
                >
                  ×
                </button>

              )}

            </div>

          </section>

        )}

        {/* ====================================================
            BIKE LIST
        ==================================================== */}

        {bicycles.length > 0 && (

          <section className="bike-selector">

            <div className="section-title">

              <div>

                <span className="section-kicker">
                  DATABASE
                </span>

                <h2>
                  Daftar Sepeda
                </h2>

                <p>
                  Pilih unit untuk
                  melihat seluruh
                  komponennya.
                </p>

              </div>

              <span className="data-count">

                {
                  filteredBicycles.length
                }

                {" "}dari{" "}

                {
                  bicycles.length
                }

                {" "}unit

              </span>

            </div>

            <div className="bike-list">

              {filteredBicycles.length ===
              0 ? (

                <div className="empty-dashboard">

                  <div className="empty-dashboard-icon">
                    ⌕
                  </div>

                  <h2>
                    Sepeda tidak
                    ditemukan
                  </h2>

                  <p>
                    Tidak ada data yang
                    cocok dengan
                    pencarian.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                  >
                    Reset Pencarian
                  </button>

                </div>

              ) : (

                filteredBicycles.map(
                  (bike) => {

                    const isActive =
                      String(
                        selectedBike?.id
                      ) ===
                      String(
                        bike.id
                      );

                    const bikeComponents =
                      getBikeComponents(
                        bike.id
                      );

                    const bikeStatus =
                      getComponentField(
                        bike,
                        "status_sepeda",
                        "status"
                      );

                    return (

                      <button
                        type="button"
                        key={
                          bike.id
                        }
                        className={
                          isActive
                            ? "bike-card active"
                            : "bike-card"
                        }
                        onClick={() =>
                          setSelectedBike(
                            bike
                          )
                        }
                      >

                        <div className="bike-card-number">

                          {
                            displayValue(
                              bike.bicycleset
                            )
                          }

                        </div>

                        <div className="bike-card-info">

                          <strong>
                            {
                              displayValue(
                                bike.no_unit
                              )
                            }
                          </strong>

                          <span>

                            {[
                              bike.bike_brand,
                              bike.bike_model,
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                " "
                              )}

                          </span>

                          {bikeStatus && (

                            <small
                              className={`bike-status-badge status-${normalizeStatus(
                                bikeStatus
                              ).toLowerCase()}`}
                            >
                              {
                                getStatusLabel(
                                  bikeStatus
                                )
                              }
                            </small>

                          )}

                        </div>

                        <div className="bike-card-component-count">

                          {
                            bikeComponents.length
                          }

                          {" "}komponen

                        </div>

                        <div className="bike-card-arrow">
                          →
                        </div>

                      </button>

                    );

                  }
                )

              )}

            </div>

          </section>

        )}

        {/* ====================================================
            DETAIL
        ==================================================== */}

        {selectedBike && (

          <section className="bike-detail">

            {/* ==================================================
                DETAIL HEADER
            ================================================== */}

            <div className="detail-header">

              <div className="detail-heading">

                <span className="detail-label">

                  {
                    displayValue(
                      selectedBike.bicycleset,
                      "BIKE"
                    )
                  }

                </span>

                <h2>

                  {[
                    selectedBike.bike_brand,
                    selectedBike.bike_model,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " "
                    )}

                </h2>

                <p>

                  Nomor unit{" "}

                  <strong>

                    {
                      displayValue(
                        selectedBike.no_unit
                      )
                    }

                  </strong>

                </p>

              </div>

              <div className="detail-header-right">

                <div className="detail-id">

                  ID #

                  {
                    selectedBike.id
                  }

                </div>

                {getComponentField(
                  selectedBike,
                  "status_sepeda",
                  "status"
                ) && (

                  <span
                    className={`bike-detail-status status-${normalizeStatus(
                      getComponentField(
                        selectedBike,
                        "status_sepeda",
                        "status"
                      )
                    ).toLowerCase()}`}
                  >

                    {
                      getStatusLabel(
                        getComponentField(
                          selectedBike,
                          "status_sepeda",
                          "status"
                        )
                      )
                    }

                  </span>

                )}

              </div>

            </div>

            {/* ==================================================
                META
            ================================================== */}

            <div className="bike-meta-grid">

              <DetailMeta
                label="BIKE SET"
                value={
                  selectedBike.bicycleset
                }
              />

              <DetailMeta
                label="NO UNIT"
                value={
                  selectedBike.no_unit
                }
              />

              <DetailMeta
                label="MEREK"
                value={
                  selectedBike.bike_brand
                }
              />

              <DetailMeta
                label="MODEL"
                value={
                  selectedBike.bike_model
                }
              />

              <DetailMeta
                label="STATUS"
                value={getComponentField(
                  selectedBike,
                  "status_sepeda",
                  "status"
                )}
                status
              />

              <DetailMeta
                label="TANGGAL MULAI"
                value={getComponentField(
                  selectedBike,
                  "tanggal_mulai",
                  "start_date"
                )}
                date
              />

              <DetailMeta
                label="TANGGAL SELESAI"
                value={getComponentField(
                  selectedBike,
                  "tanggal_selesai",
                  "end_date"
                )}
                date
              />

            </div>

            {/* ==================================================
                COMPONENTS
            ================================================== */}

            <div className="component-section">

              <div className="section-title">

                <div>

                  <span className="section-kicker">
                    COMPONENTS
                  </span>

                  <h2>
                    Komponen Sepeda
                  </h2>

                  <p>
                    Klik komponen untuk
                    membuka detail lengkap.
                  </p>

                </div>

                <span className="data-count">

                  {
                    getBikeComponents(
                      selectedBike.id
                    ).length
                  }

                  {" "}komponen

                </span>

              </div>

              <div className="component-grid">

                {COMPONENT_TYPES.map(
                  (type) => {

                    const component =
                      getComponent(
                        selectedBike.id,
                        type
                      );

                    /* ----------------------------------------
                       COMPONENT BELUM ADA
                    ---------------------------------------- */

                    if (
                      !component
                    ) {

                      return (

                        <div
                          className="component-card empty"
                          key={type}
                        >

                          <div className="component-top">

                            <span className="component-type">

                              {
                                type
                              }

                            </span>

                          </div>

                          <div className="no-component">

                            <span className="empty-icon">
                              —
                            </span>

                            <span>
                              Data tidak
                              tersedia
                            </span>

                          </div>

                        </div>

                      );

                    }

                    /* ----------------------------------------
                       IMAGE SOURCES
                    ---------------------------------------- */

                    const imageSources =
                      getComponentImageSources(
                        component,
                        selectedBike,
                        storageFiles
                      );

                    return (

                      <ComponentCard
                        key={
                          component.id ||
                          `${selectedBike.id}-${type}`
                        }
                        component={
                          component
                        }
                        bike={
                          selectedBike
                        }
                        imageSources={
                          imageSources
                        }
                        onClick={() =>
                          setSelectedComponent(
                            component
                          )
                        }
                      />

                    );

                  }
                )}

              </div>

            </div>

          </section>

        )}

        {/* ====================================================
            EMPTY DATABASE
        ==================================================== */}

        {bicycles.length === 0 &&
          !loadError && (

            <div className="empty-dashboard">

              <div className="empty-dashboard-icon">
                🚲
              </div>

              <h2>
                Belum ada data sepeda
              </h2>

              <p>
                Data bicycles belum
                tersedia di Supabase.
              </p>

              <button
                type="button"
                onClick={
                  loadData
                }
              >
                Muat Ulang
              </button>

            </div>

          )}

      </main>

      {/* ======================================================
          COMPONENT DETAIL MODAL
      ====================================================== */}

      {selectedComponent && (

        <ComponentDetailModal
          component={
            selectedComponent
          }
          bike={
            selectedBike
          }
          imageSources={
            getComponentImageSources(
              selectedComponent,
              selectedBike,
              storageFiles
            )
          }
          onClose={() =>
            setSelectedComponent(
              null
            )
          }
        />

      )}

    </div>
  );
}

/* ============================================================
   DETAIL META
============================================================ */

function DetailMeta({
  label,
  value,
  status = false,
  date = false,
}) {

  let display =
    displayValue(
      value
    );

  if (
    date &&
    value
  ) {
    display =
      formatDate(
        value
      );
  }

  return (

    <div className="bike-meta-item">

      <span>
        {
          label
        }
      </span>

      {status ? (

        <strong
          className={`meta-status status-${normalizeStatus(
            value
          ).toLowerCase()}`}
        >

          {
            getStatusLabel(
              value
            )
          }

        </strong>

      ) : (

        <strong>
          {
            display
          }
        </strong>

      )}

    </div>

  );
}