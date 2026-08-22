import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeFileName } from "@/lib/utils";
import { logActivity } from "@/lib/activity";
import { notifyCarrier } from "@/lib/notifications";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 12 * 1024 * 1024;

type ForgeMetadata = {
  schemaVersion?: string;
  source?: {
    system?: string;
    jobId?: string;
  };
  carrier?: {
    carrierCode?: string | null;
    companyName?: string | null;
    mcNumber?: string | null;
    dotNumber?: string | null;
    portalCarrierId?: string | null;
    registryMatch?: string | null;
    registryCreated?: boolean | null;
    resolved?: boolean | null;
  };
  document?: {
    type?: string | null;
    confidence?: number | null;
    fileName?: string | null;
    localPath?: string | null;
    hash?: string | null;
  };
  load?: {
    loadNumber?: string | null;
    carrier?: string | null;
    broker?: string | null;
    origin?: string | null;
    destination?: string | null;
    rate?: string | null;
    pickupDate?: string | null;
    deliveryDate?: string | null;
    equipment?: string | null;
  };
  action?: {
    attachDocument?: boolean | null;
    createTimeline?: boolean | null;
    matchCarrierByCode?: boolean | null;
    autoCreateCarrier?: boolean | null;
    source?: string | null;
  };
  createdAt?: string | null;
};

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, { status });
}

function cleanString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeCarrierCode(value: unknown) {
  return cleanString(value).toUpperCase();
}

function normalizeJobId(value: unknown) {
  const raw = cleanString(value);
  const cleaned = raw.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || `FORGE-${Date.now()}`;
}

function keysMatch(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

function portalDocumentType(forgeType: string) {
  const map: Record<string, string> = {
    FFS_RATE_CONFIRMATION: "Rate Confirmation",
    FFS_POD_BOL: "POD/BOL",
    FFS_CARRIER_W9: "W-9",
    FFS_CARRIER_COI: "COI",
    FFS_CARRIER_NOA: "NOA",
    FFS_CARRIER_POA: "POA",
    FFS_CARRIER_FILE: "Carrier Document",
    FFS_CARRIER_SIGNING_PACKET: "Carrier Signing Packet",
    FFS_DOCUSIGN_CERTIFICATE: "DocuSign Certificate",
    FFS_CARRIER_AGREEMENT: "Carrier Agreement",
    FFS_CARRIER_AGREEMENT_TEMPLATE: "Carrier Agreement Template",
    FFS_INVOICE_BILLING: "Invoice/Billing",
    FFS_OPERATIONS: "Operations",
  };

  return map[forgeType] || forgeType || "Forge Document";
}


const AUTO_CREATE_CARRIER_DOCUMENT_TYPES = new Set([
  "FFS_CARRIER_W9",
  "FFS_CARRIER_COI",
  "FFS_CARRIER_NOA",
  "FFS_CARRIER_POA",
  "FFS_CARRIER_FILE",
  "FFS_CARRIER_SIGNING_PACKET",
  "FFS_DOCUSIGN_CERTIFICATE",
  "FFS_CARRIER_AGREEMENT",
]);

function canAutoCreateCarrier(
  metadata: ForgeMetadata,
  forgeType: string,
  carrierCode: string,
  companyName: string,
) {
  if (!carrierCode || !companyName) return false;
  if (metadata.carrier?.resolved !== true) return false;

  // Explicit false is a hard stop. Otherwise trusted onboarding documents
  // may create the basic carrier shell automatically.
  if (metadata.action?.autoCreateCarrier === false) return false;

  return AUTO_CREATE_CARRIER_DOCUMENT_TYPES.has(forgeType);
}

export async function POST(request: NextRequest) {
  const expectedKey = process.env.FORGE_API_KEY;

  if (!expectedKey) {
    return json(
      {
        ok: false,
        error: "FORGE_API_KEY is not configured on the portal server.",
        code: "FORGE_API_KEY_MISSING",
      },
      500,
    );
  }

  const providedKey = request.headers.get("X-Forge-Key") || "";

  if (!providedKey || !keysMatch(providedKey, expectedKey)) {
    return json(
      {
        ok: false,
        error: "Unauthorized Forge request.",
        code: "FORGE_UNAUTHORIZED",
      },
      401,
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return json(
      {
        ok: false,
        error: "Request must be multipart/form-data.",
        code: "INVALID_FORM_DATA",
      },
      400,
    );
  }

  const metadataPart = formData.get("metadata");
  const filePart = formData.get("file");

  if (typeof metadataPart !== "string" || !metadataPart.trim()) {
    return json(
      {
        ok: false,
        error: "Missing Forge metadata.",
        code: "METADATA_REQUIRED",
      },
      400,
    );
  }

  if (!(filePart instanceof File) || filePart.size === 0) {
    return json(
      {
        ok: false,
        error: "Missing original business document.",
        code: "FILE_REQUIRED",
      },
      400,
    );
  }

  if (filePart.size > MAX_FILE_BYTES) {
    return json(
      {
        ok: false,
        error: "Files must be 12MB or smaller.",
        code: "FILE_TOO_LARGE",
      },
      413,
    );
  }

  let metadata: ForgeMetadata;

  try {
    metadata = JSON.parse(metadataPart) as ForgeMetadata;
  } catch {
    return json(
      {
        ok: false,
        error: "Forge metadata is not valid JSON.",
        code: "INVALID_METADATA_JSON",
      },
      400,
    );
  }

  const jobId = normalizeJobId(metadata.source?.jobId);
  const carrierCode = normalizeCarrierCode(metadata.carrier?.carrierCode);
  const companyName =
    cleanString(metadata.carrier?.companyName) ||
    cleanString(metadata.load?.carrier);
  const forgeType = cleanString(metadata.document?.type) || "FORGE_DOCUMENT";

  if (!carrierCode && !companyName) {
    return json(
      {
        ok: false,
        error: "Carrier identity is required.",
        code: "CARRIER_IDENTITY_REQUIRED",
        jobId,
      },
      422,
    );
  }

  const admin = createAdminClient();

  let carrier:
    | {
        id: string;
        company_name: string | null;
        carrier_code: string | null;
      }
    | null = null;

  let carrierMatchedBy = "";

  // 1. Strongest match: Forge carrier code.
  if (carrierCode) {
    const { data, error } = await admin
      .from("carriers")
      .select("id, company_name, carrier_code")
      .ilike("carrier_code", carrierCode)
      .limit(2);

    if (error) {
      return json(
        {
          ok: false,
          error: error.message,
          code: "CARRIER_LOOKUP_FAILED",
          jobId,
        },
        500,
      );
    }

    if ((data || []).length > 1) {
      return json(
        {
          ok: false,
          error: `More than one portal carrier uses code ${carrierCode}.`,
          code: "DUPLICATE_PORTAL_CARRIER_CODE",
          jobId,
          carrierCode,
        },
        409,
      );
    }

    if ((data || []).length === 1) {
      carrier = data![0];
      carrierMatchedBy = "carrier_code";
    }
  }

  // 2. Fallback: exact case-insensitive company name.
  if (!carrier && companyName) {
    const { data, error } = await admin
      .from("carriers")
      .select("id, company_name, carrier_code")
      .ilike("company_name", companyName)
      .limit(2);

    if (error) {
      return json(
        {
          ok: false,
          error: error.message,
          code: "CARRIER_LOOKUP_FAILED",
          jobId,
        },
        500,
      );
    }

    if ((data || []).length > 1) {
      return json(
        {
          ok: false,
          error: `More than one portal carrier matches ${companyName}.`,
          code: "AMBIGUOUS_PORTAL_CARRIER",
          jobId,
          companyName,
        },
        409,
      );
    }

    if ((data || []).length === 1) {
      carrier = data![0];
      carrierMatchedBy = "company_name";
    }
  }

  let carrierCreated = false;

  if (!carrier) {
    if (!canAutoCreateCarrier(metadata, forgeType, carrierCode, companyName)) {
      return json(
        {
          ok: false,
          error: "Carrier does not exist in the FFS Carrier Portal.",
          code: "PORTAL_CARRIER_NOT_FOUND",
          jobId,
          carrierCode: carrierCode || null,
          companyName: companyName || null,
          autoCreateEligible: false,
        },
        404,
      );
    }

    const { data: createdCarrier, error: createCarrierError } = await admin
      .from("carriers")
      .insert({
        company_name: companyName,
        carrier_code: carrierCode,
      })
      .select("id, company_name, carrier_code")
      .single();

    if (createCarrierError || !createdCarrier) {
      return json(
        {
          ok: false,
          error:
            createCarrierError?.message ||
            "Carrier could not be created in the portal.",
          code: "PORTAL_CARRIER_CREATE_FAILED",
          jobId,
          carrierCode,
          companyName,
        },
        500,
      );
    }

    carrier = createdCarrier;
    carrierMatchedBy = "auto_created";
    carrierCreated = true;
  }

  // If Forge matched by name and the portal has no carrier code yet,
  // permanently link the Forge code to the portal carrier.
  if (carrierCode && carrierMatchedBy === "company_name") {
    const portalCode = normalizeCarrierCode(carrier.carrier_code);

    if (portalCode && portalCode !== carrierCode) {
      return json(
        {
          ok: false,
          error: `Portal carrier already uses code ${portalCode}, but Forge sent ${carrierCode}.`,
          code: "CARRIER_CODE_CONFLICT",
          jobId,
          portalCarrierId: carrier.id,
          portalCarrierCode: portalCode,
          forgeCarrierCode: carrierCode,
        },
        409,
      );
    }

    if (!portalCode) {
      const { error: updateError } = await admin
        .from("carriers")
        .update({ carrier_code: carrierCode })
        .eq("id", carrier.id);

      if (updateError) {
        return json(
          {
            ok: false,
            error: updateError.message,
            code: "CARRIER_CODE_LINK_FAILED",
            jobId,
            portalCarrierId: carrier.id,
            carrierCode,
          },
          500,
        );
      }

      carrier = {
        ...carrier,
        carrier_code: carrierCode,
      };
    }
  }

  const loadNumber = cleanString(metadata.load?.loadNumber);
  let loadId: string | null = null;
  let loadCreated = false;
  let portalLoadNumber: string | null = null;

  let loadMatchedBy:
    | "load_number"
    | "broker_load_number"
    | "auto_created"
    | null = null;

  if (loadNumber) {
    // Forge usually sees the broker's printed PO/load number first.
    // Try the portal internal load number, then broker_load_number.
    const { data: internalLoad, error: internalLoadError } = await admin
      .from("loads")
      .select("id, load_number, broker_load_number, carrier_id")
      .eq("carrier_id", carrier.id)
      .eq("load_number", loadNumber)
      .maybeSingle();

    if (internalLoadError) {
      return json(
        {
          ok: false,
          error: internalLoadError.message,
          code: "LOAD_LOOKUP_FAILED",
          jobId,
          carrierCode: carrier.carrier_code || carrierCode || null,
          loadNumber,
        },
        500,
      );
    }

    if (internalLoad) {
      loadId = internalLoad.id;
      portalLoadNumber = internalLoad.load_number;
      loadMatchedBy = "load_number";
    } else {
      const { data: brokerLoads, error: brokerLoadError } = await admin
        .from("loads")
        .select("id, load_number, broker_load_number, carrier_id")
        .eq("carrier_id", carrier.id)
        .eq("broker_load_number", loadNumber)
        .limit(2);

      if (brokerLoadError) {
        return json(
          {
            ok: false,
            error: brokerLoadError.message,
            code: "LOAD_LOOKUP_FAILED",
            jobId,
            carrierCode: carrier.carrier_code || carrierCode || null,
            loadNumber,
          },
          500,
        );
      }

      if ((brokerLoads || []).length > 1) {
        return json(
          {
            ok: false,
            error: `More than one portal load uses broker load number ${loadNumber} for this carrier.`,
            code: "AMBIGUOUS_BROKER_LOAD_NUMBER",
            jobId,
            portalCarrierId: carrier.id,
            carrierCode: carrier.carrier_code || carrierCode || null,
            loadNumber,
          },
          409,
        );
      }

      if ((brokerLoads || []).length === 1) {
        loadId = brokerLoads![0].id;
        portalLoadNumber = brokerLoads![0].load_number;
        loadMatchedBy = "broker_load_number";
      }
    }

    // A trusted, resolved rate confirmation may create a missing portal load.
    // Other document types still refuse to invent loads.
    if (!loadId && forgeType === "FFS_RATE_CONFIRMATION") {
      const resolvedCarrier =
        metadata.carrier?.resolved === true ||
        carrierMatchedBy === "carrier_code" ||
        carrierMatchedBy === "company_name";

      const confidence =
        typeof metadata.document?.confidence === "number"
          ? metadata.document.confidence
          : 0;

      const codeForLoad = normalizeCarrierCode(
        carrier.carrier_code || carrierCode,
      );

      if (!resolvedCarrier || confidence < 70 || !codeForLoad) {
        return json(
          {
            ok: false,
            error:
              "Rate confirmation was recognized, but Forge did not provide enough trusted carrier identity to auto-create the load.",
            code: "AUTO_LOAD_CREATE_NOT_ELIGIBLE",
            jobId,
            portalCarrierId: carrier.id,
            carrierCode: codeForLoad || null,
            brokerLoadNumber: loadNumber,
            confidence,
          },
          422,
        );
      }

      const { data: existingLoadNumbers, error: sequenceError } = await admin
        .from("loads")
        .select("load_number")
        .eq("carrier_id", carrier.id);

      if (sequenceError) {
        return json(
          {
            ok: false,
            error: sequenceError.message,
            code: "LOAD_SEQUENCE_LOOKUP_FAILED",
            jobId,
          },
          500,
        );
      }

      let highest = 0;
      const sequencePattern = new RegExp(
        `^${codeForLoad.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}-(\\d+)$`,
        "i",
      );

      for (const row of existingLoadNumbers || []) {
        const match = cleanString(row.load_number).match(sequencePattern);
        if (!match) continue;

        const value = Number.parseInt(match[1], 10);
        if (Number.isFinite(value) && value > highest) {
          highest = value;
        }
      }

      portalLoadNumber = `${codeForLoad}-${String(highest + 1).padStart(3, "0")}`;

      const brokerName =
        cleanString(metadata.load?.broker) || "Unknown Broker";

      const createPayload = {
        carrier_id: carrier.id,
        load_number: portalLoadNumber,
        broker_load_number: loadNumber,
        broker: brokerName,
        status: "booked",
        date_booked: new Date().toISOString().slice(0, 10),
      };

      const { data: createdLoad, error: createLoadError } = await admin
        .from("loads")
        .insert(createPayload)
        .select("id, load_number, broker_load_number")
        .single();

      if (createLoadError || !createdLoad) {
        return json(
          {
            ok: false,
            error:
              createLoadError?.message ||
              "Portal load could not be created from the rate confirmation.",
            code: "PORTAL_LOAD_CREATE_FAILED",
            jobId,
            portalCarrierId: carrier.id,
            carrierCode: codeForLoad,
            portalLoadNumber,
            brokerLoadNumber: loadNumber,
          },
          500,
        );
      }

      loadId = createdLoad.id;
      portalLoadNumber = createdLoad.load_number;
      loadMatchedBy = "auto_created";
      loadCreated = true;

      try {
        await logActivity({
          carrierId: carrier.id,
          actorId: null,
          loadId,
          action: `Load ${portalLoadNumber} created from Forge rate confirmation`,
          entityType: "load",
          entityId: loadId,
          details: {
            source: metadata.source?.system || "FORGE-NODE-02",
            forgeJobId: jobId,
            brokerLoadNumber: loadNumber,
            broker: metadata.load?.broker || null,
            origin: metadata.load?.origin || null,
            destination: metadata.load?.destination || null,
            rate: metadata.load?.rate || null,
            pickupDate: metadata.load?.pickupDate || null,
            deliveryDate: metadata.load?.deliveryDate || null,
            equipment: metadata.load?.equipment || null,
          },
        });
      } catch (error) {
        console.error("Forge auto-load activity log failed:", error);
      }

      try {
        await notifyCarrier({
          carrierId: carrier.id,
          title: `${portalLoadNumber} added`,
          message: `A new load was added from a Forge rate confirmation. Broker load: ${loadNumber}.`,
          type: "load",
          link: `/loads/${loadId}`,
          email: false,
        });
      } catch (error) {
        console.error("Forge auto-load notification failed:", error);
      }
    }

    if (!loadId) {
      return json(
        {
          ok: false,
          error: `Load ${loadNumber} does not exist for this carrier in the portal as either an internal or broker load number.`,
          code: "PORTAL_LOAD_NOT_FOUND",
          jobId,
          portalCarrierId: carrier.id,
          carrierCode: carrier.carrier_code || carrierCode || null,
          loadNumber,
        },
        404,
      );
    }
  }

  const documentType = portalDocumentType(forgeType);

  const actualFileName = safeFileName(filePart.name);
  const storageFolder = `${carrier.id}/${loadId || "company"}/forge`;
  const storagePath = `${storageFolder}/${jobId}-${actualFileName}`;

  // Idempotency: same Forge job + same file path returns success instead
  // of creating duplicate portal records.
  const { data: existingDocument, error: existingError } = await admin
    .from("documents")
    .select("id, storage_path")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (existingError) {
    return json(
      {
        ok: false,
        error: existingError.message,
        code: "DOCUMENT_DUPLICATE_CHECK_FAILED",
        jobId,
      },
      500,
    );
  }

  if (existingDocument) {
    return json({
      ok: true,
      duplicate: true,
      jobId,
      documentId: existingDocument.id,
      portalCarrierId: carrier.id,
      carrierCode: carrier.carrier_code || carrierCode || null,
      carrierMatchedBy,
      carrierCreated,
      loadId,
      loadNumber: loadNumber || null,
      portalLoadNumber,
      loadMatchedBy,
      loadCreated,
      storagePath: existingDocument.storage_path,
    });
  }

  const bytes = new Uint8Array(await filePart.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("carrier-documents")
    .upload(storagePath, bytes, {
      contentType: filePart.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return json(
      {
        ok: false,
        error: uploadError.message,
        code: "STORAGE_UPLOAD_FAILED",
        jobId,
        storagePath,
      },
      500,
    );
  }

  const { data: document, error: documentError } = await admin
    .from("documents")
    .insert({
      carrier_id: carrier.id,
      load_id: loadId,
      document_type: documentType,
      title: filePart.name,
      storage_path: storagePath,
      expires_on: null,
      visibility: "carrier",
      status: "active",
      uploaded_by: null,
    })
    .select("id")
    .single();

  if (documentError || !document) {
    // Do not leave an orphaned object in Storage if the DB write fails.
    await admin.storage.from("carrier-documents").remove([storagePath]);

    return json(
      {
        ok: false,
        error: documentError?.message || "Document record could not be created.",
        code: "DOCUMENT_RECORD_FAILED",
        jobId,
      },
      500,
    );
  }

  try {
    await logActivity({
      carrierId: carrier.id,
      actorId: null,
      loadId,
      action: `${documentType} received from Forge`,
      entityType: "document",
      entityId: document.id,
      details: {
        title: filePart.name,
        source: metadata.source?.system || "FORGE-NODE-02",
        forgeJobId: jobId,
        forgeDocumentType: forgeType,
        carrierCode: carrier.carrier_code || carrierCode || null,
        confidence: metadata.document?.confidence ?? null,
        hash: metadata.document?.hash || null,
      },
    });
  } catch (error) {
    console.error("Forge activity log failed:", error);
  }

  try {
    await notifyCarrier({
      carrierId: carrier.id,
      title: `${documentType} received`,
      message: `${filePart.name} is available in Documents.`,
      type: "document",
      link: loadId ? `/loads/${loadId}` : "/documents",
      email: false,
    });
  } catch (error) {
    console.error("Forge notification failed:", error);
  }

  return json(
    {
      ok: true,
      duplicate: false,
      jobId,
      documentId: document.id,
      portalCarrierId: carrier.id,
      carrierCode: carrier.carrier_code || carrierCode || null,
      carrierMatchedBy,
      carrierCreated,
      loadId,
      loadNumber: loadNumber || null,
      portalLoadNumber,
      loadMatchedBy,
      loadCreated,
      broker: cleanString(metadata.load?.broker) || "Unknown Broker",
      documentType,
      storagePath,
      originalFileName: filePart.name,
    },
    201,
  );
}
