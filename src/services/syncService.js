// ============================================================
// GOOGLE SHEET SYNC SERVICE
// ============================================================

const LOCAL_SYNC_URL = "/api/google-sync";

// ============================================================
// PARSE RESPONSE
// ============================================================

async function parseResponse(response) {
  const raw = await response.text();

  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    raw,
    data,
  };
}

// ============================================================
// CHECK SERVICE
// ============================================================

export async function checkSyncService() {
  console.log("========================================");
  console.log("CHECK GOOGLE SYNC SERVICE...");
  console.log("========================================");

  const url =
    `${LOCAL_SYNC_URL}?check=1&t=${Date.now()}`;

  console.log("CHECK URL:", url);

  try {
    const response = await fetch(url, {
      method: "GET",

      headers: {
        Accept: "application/json",
      },

      cache: "no-store",
    });

    const result =
      await parseResponse(response);

    console.log(
      "CHECK HTTP STATUS:",
      result.status
    );

    console.log(
      "CHECK RAW RESPONSE:",
      result.raw
    );

    if (!result.ok) {
      console.error(
        "SYNC SERVICE HTTP ERROR:",
        result.status
      );

      return {
        success: false,
        status: result.status,
        message:
          `Sync service mengembalikan HTTP ${result.status}.`,
        raw: result.raw,
      };
    }

    if (result.data) {
      return {
        success:
          result.data.success !== false,

        status: result.status,

        ...result.data,
      };
    }

    return {
      success: true,
      status: result.status,
      message:
        "Google Sync Service aktif.",
      raw: result.raw,
    };
  } catch (error) {
    console.error(
      "SYNC SERVICE CONNECTION ERROR:",
      error
    );

    return {
      success: false,
      status: 0,

      message:
        error?.message ||
        "Tidak dapat terhubung ke Google Sync Service.",

      raw: "",
      error,
    };
  }
}

// ============================================================
// SYNC SPREADSHEET
// ============================================================

export async function syncSpreadsheet(
  options = {}
) {
  console.log("========================================");
  console.log("START GOOGLE SHEET SYNC");
  console.log("========================================");

  const {
    direction = "both",

    tables = [
      "bicycles",
      "components",
    ],

    ...extra
  } = options;

  const params =
    new URLSearchParams();

  params.set(
    "action",
    "sync"
  );

  params.set(
    "direction",
    direction
  );

  params.set(
    "tables",
    JSON.stringify(tables)
  );

  Object.entries(extra).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null
      ) {
        return;
      }

      if (
        typeof value === "object"
      ) {
        params.set(
          key,
          JSON.stringify(value)
        );
      } else {
        params.set(
          key,
          String(value)
        );
      }
    }
  );

  params.set(
    "t",
    String(Date.now())
  );

  const url =
    `${LOCAL_SYNC_URL}?${params.toString()}`;

  console.log(
    "SYNC URL:",
    url
  );

  try {
    const response = await fetch(
      url,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",
        },

        cache: "no-store",
      }
    );

    const result =
      await parseResponse(response);

    console.log(
      "SYNC HTTP STATUS:",
      result.status
    );

    console.log(
      "SYNC RAW RESPONSE:",
      result.raw
    );

    if (!result.ok) {
      console.error(
        "SYNC SERVICE HTTP ERROR:",
        result.status
      );

      return {
        success: false,
        status: result.status,

        message:
          `Sync service mengembalikan HTTP ${result.status}.`,

        raw: result.raw,
      };
    }

    if (!result.data) {
      return {
        success: true,
        status: result.status,

        message:
          "Sync berhasil.",

        raw: result.raw,
      };
    }

    return {
      success:
        result.data.success !== false,

      status: result.status,

      ...result.data,
    };
  } catch (error) {
    console.error(
      "SYNC SERVICE CONNECTION ERROR:",
      error
    );

    return {
      success: false,
      status: 0,

      message:
        error?.message ||
        "Gagal terhubung ke Google Sync Service.",

      raw: "",
      error,
    };
  }
}

// ============================================================
// TEST GOOGLE SYNC
// ============================================================

export async function testGoogleSync() {
  console.log("========================================");
  console.log("TEST GOOGLE SYNC");
  console.log("========================================");

  const url =
    `${LOCAL_SYNC_URL}?action=test&t=${Date.now()}`;

  console.log(
    "TEST URL:",
    url
  );

  try {
    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",
          },

          cache: "no-store",
        }
      );

    const result =
      await parseResponse(response);

    console.log(
      "TEST HTTP STATUS:",
      result.status
    );

    console.log(
      "TEST RAW RESPONSE:",
      result.raw
    );

    if (!result.ok) {
      return {
        success: false,
        status: result.status,

        message:
          `Google Sync HTTP ${result.status}.`,

        raw: result.raw,
      };
    }

    return {
      success:
        result.data?.success !== false,

      status: result.status,

      ...(result.data || {}),

      raw: result.raw,
    };
  } catch (error) {
    console.error(
      "TEST GOOGLE SYNC ERROR:",
      error
    );

    return {
      success: false,
      status: 0,

      message:
        error?.message ||
        "Tidak dapat menghubungi Google Sync.",

      raw: "",
      error,
    };
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

const googleSyncService = {
  checkSyncService,
  syncSpreadsheet,
  testGoogleSync,

  LOCAL_SYNC_URL,
};

export default googleSyncService;