import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

/* ============================================================
   ENV
============================================================ */

const GOOGLE_SCRIPT_URL =
  process.env.GOOGLE_SCRIPT_URL;

if (!GOOGLE_SCRIPT_URL) {
  console.warn(
    "WARNING: GOOGLE_SCRIPT_URL belum diisi di .env"
  );
}

/* ============================================================
   HELPER
============================================================ */

async function callGoogleScript(
  method = "GET",
  body = null
) {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error(
      "GOOGLE_SCRIPT_URL belum dikonfigurasi."
    );
  }

  const options = {
    method,
    headers: {
      Accept: "application/json",
    },
  };

  if (body !== null) {
    options.headers["Content-Type"] =
      "application/json";

    options.body = JSON.stringify(body);
  }

  const response = await fetch(
    GOOGLE_SCRIPT_URL,
    options
  );

  const text =
    await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      success:
        response.ok,
      raw: text,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      message:
        data?.message ||
        data?.error ||
        `Google Apps Script HTTP ${response.status}`,
      data,
    };
  }

  return data;
}

/* ============================================================
   GET /api/google-sync
============================================================ */

app.get(
  "/api/google-sync",
  async (req, res) => {
    try {
      const isCheck =
        req.query.check === "1";

      console.log(
        "========================================"
      );

      console.log(
        "GOOGLE SYNC REQUEST"
      );

      console.log(
        "CHECK:",
        isCheck
      );

      console.log(
        "========================================"
      );

      /* --------------------------------------------------------
         CHECK
      -------------------------------------------------------- */

      if (isCheck) {
        return res.json({
          success: true,
          status: 200,
          message:
            "Google Sync Service aktif.",
          service:
            "google-sync",
        });
      }

      /* --------------------------------------------------------
         SYNC
      -------------------------------------------------------- */

      const result =
        await callGoogleScript(
          "GET"
        );

      return res.status(
        result?.success === false
          ? 500
          : 200
      ).json(result);

    } catch (error) {
      console.error(
        "GOOGLE SYNC GET ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Google Sync gagal.",
      });
    }
  }
);

/* ============================================================
   POST /api/google-sync
============================================================ */

app.post(
  "/api/google-sync",
  async (req, res) => {
    try {
      console.log(
        "========================================"
      );

      console.log(
        "GOOGLE SYNC POST REQUEST"
      );

      console.log(
        "BODY:",
        req.body
      );

      console.log(
        "========================================"
      );

      const result =
        await callGoogleScript(
          "POST",
          req.body
        );

      return res.status(
        result?.success === false
          ? 500
          : 200
      ).json(result);

    } catch (error) {
      console.error(
        "GOOGLE SYNC POST ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Google Sync gagal.",
      });
    }
  }
);

/* ============================================================
   HEALTH CHECK
============================================================ */

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "Backend API aktif.",
      timestamp:
        new Date().toISOString(),
    });
  }
);

/* ============================================================
   START
============================================================ */

const PORT =
  Number(
    process.env.API_PORT
  ) || 3001;

app.listen(
  PORT,
  () => {
    console.log(
      "========================================"
    );

    console.log(
      `GOOGLE SYNC API RUNNING`
    );

    console.log(
      `http://localhost:${PORT}`
    );

    console.log(
      `http://localhost:${PORT}/api/google-sync`
    );

    console.log(
      "========================================"
    );
  }
);