const CONFIG = {
  repositoryName: "Pyrrhic Press Publishing OAI-PMH Repository",
  baseURL: "https://pyrrhic-oai.YOUR-SUBDOMAIN.workers.dev/",
  adminEmail: "editor@pyrrhicpress.org",
  earliestDatestamp: "2025-01-01",
  deletedRecord: "no",
  granularity: "YYYY-MM-DD"
};

const SETS = [
  {
    setSpec: "openaire",
    setName: "OpenAIRE"
  },
  {
    setSpec: "pibj",
    setName: "Professionals in Business Journal"
  },
  {
    setSpec: "acta",
    setName: "Acta Eruditorum"
  },
  {
    setSpec: "usjeel",
    setName: "United States Journal of Excellence in Education and Leadership"
  }
];

const RECORDS = [
  {
    identifier: "oai:pyrrhicpress.org:pibj-test-001",
    datestamp: "2026-09-16",
    sets: ["openaire", "pibj"],
    title: "Pyrrhic Press OAI-PMH Test Record",
    creators: ["Dr. Nicholas J. Pirro"],
    subject: [
      "Business",
      "Management",
      "Leadership",
      "Open Access Scholarly Publishing"
    ],
    description:
      "Technical test record used to validate the Pyrrhic Press Publishing OAI-PMH metadata service.",
    publisher: "Pyrrhic Press Publishing",
    date: "2026-09-16",
    type: "Text",
    format: "application/pdf",
    source: "Professionals in Business Journal",
    language: "en",
    relation: "ISSN 2998-9019",
    rights:
      "Creative Commons CC0 1.0 Universal Public Domain Dedication",
    url: "https://www.pyrrhicpress.org/"
  }
];

function escapeXML(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function oaiEnvelope(content, requestURL, verb = "") {
  const responseDate = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH
 xmlns="http://www.openarchives.org/OAI/2.0/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/
 http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">

 <responseDate>${responseDate}</responseDate>
 <request${verb ? ` verb="${escapeXML(verb)}"` : ""}>${escapeXML(requestURL)}</request>

 ${content}

</OAI-PMH>`;
}

function errorResponse(code, message, requestURL, verb = "") {
  return oaiEnvelope(
    `<error code="${escapeXML(code)}">${escapeXML(message)}</error>`,
    requestURL,
    verb
  );
}

function identify(requestURL) {
  return oaiEnvelope(
    `<Identify>
      <repositoryName>${escapeXML(CONFIG.repositoryName)}</repositoryName>
      <baseURL>${escapeXML(CONFIG.baseURL)}</baseURL>
      <protocolVersion>2.0</protocolVersion>
      <adminEmail>${escapeXML(CONFIG.adminEmail)}</adminEmail>
      <earliestDatestamp>${escapeXML(CONFIG.earliestDatestamp)}</earliestDatestamp>
      <deletedRecord>${escapeXML(CONFIG.deletedRecord)}</deletedRecord>
      <granularity>${escapeXML(CONFIG.granularity)}</granularity>
    </Identify>`,
    requestURL,
    "Identify"
  );
}

function listMetadataFormats(requestURL) {
  return oaiEnvelope(
    `<ListMetadataFormats>
      <metadataFormat>
        <metadataPrefix>oai_dc</metadataPrefix>
        <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
        <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
      </metadataFormat>
    </ListMetadataFormats>`,
    requestURL,
    "ListMetadataFormats"
  );
}

function listSets(requestURL) {
  const setXML = SETS.map(
    set => `<set>
      <setSpec>${escapeXML(set.setSpec)}</setSpec>
      <setName>${escapeXML(set.setName)}</setName>
    </set>`
  ).join("\n");

  return oaiEnvelope(
    `<ListSets>
      ${setXML}
    </ListSets>`,
    requestURL,
    "ListSets"
  );
}

function recordHeader(record) {
  return `<header>
    <identifier>${escapeXML(record.identifier)}</identifier>
    <datestamp>${escapeXML(record.datestamp)}</datestamp>
    ${record.sets
      .map(set => `<setSpec>${escapeXML(set)}</setSpec>`)
      .join("\n")}
  </header>`;
}

function recordMetadata(record) {
  const creators = record.creators
    .map(name => `<dc:creator>${escapeXML(name)}</dc:creator>`)
    .join("\n");

  const subjects = record.subject
    .map(subject => `<dc:subject>${escapeXML(subject)}</dc:subject>`)
    .join("\n");

  return `<metadata>
    <oai_dc:dc
      xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/
      http://www.openarchives.org/OAI/2.0/oai_dc.xsd">

      <dc:title>${escapeXML(record.title)}</dc:title>
      ${creators}
      ${subjects}
      <dc:description>${escapeXML(record.description)}</dc:description>
      <dc:publisher>${escapeXML(record.publisher)}</dc:publisher>
      <dc:date>${escapeXML(record.date)}</dc:date>
      <dc:type>${escapeXML(record.type)}</dc:type>
      <dc:format>${escapeXML(record.format)}</dc:format>
      <dc:identifier>${escapeXML(record.url)}</dc:identifier>
      <dc:source>${escapeXML(record.source)}</dc:source>
      <dc:language>${escapeXML(record.language)}</dc:language>
      <dc:relation>${escapeXML(record.relation)}</dc:relation>
      <dc:rights>${escapeXML(record.rights)}</dc:rights>

    </oai_dc:dc>
  </metadata>`;
}

function listIdentifiers(requestURL, set) {
  let records = RECORDS;

  if (set) {
    records = records.filter(record => record.sets.includes(set));
  }

  if (records.length === 0) {
    return errorResponse(
      "noRecordsMatch",
      "No records match the request.",
      requestURL,
      "ListIdentifiers"
    );
  }

  const headers = records.map(recordHeader).join("\n");

  return oaiEnvelope(
    `<ListIdentifiers>
      ${headers}
    </ListIdentifiers>`,
    requestURL,
    "ListIdentifiers"
  );
}

function listRecords(requestURL, set) {
  let records = RECORDS;

  if (set) {
    records = records.filter(record => record.sets.includes(set));
  }

  if (records.length === 0) {
    return errorResponse(
      "noRecordsMatch",
      "No records match the request.",
      requestURL,
      "ListRecords"
    );
  }

  const recordsXML = records
    .map(
      record => `<record>
        ${recordHeader(record)}
        ${recordMetadata(record)}
      </record>`
    )
    .join("\n");

  return oaiEnvelope(
    `<ListRecords>
      ${recordsXML}
    </ListRecords>`,
    requestURL,
    "ListRecords"
  );
}

function getRecord(requestURL, identifier) {
  const record = RECORDS.find(
    item => item.identifier === identifier
  );

  if (!record) {
    return errorResponse(
      "idDoesNotExist",
      "The requested identifier does not exist.",
      requestURL,
      "GetRecord"
    );
  }

  return oaiEnvelope(
    `<GetRecord>
      <record>
        ${recordHeader(record)}
        ${recordMetadata(record)}
      </record>
    </GetRecord>`,
    requestURL,
    "GetRecord"
  );
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const verb = url.searchParams.get("verb");
    const metadataPrefix = url.searchParams.get("metadataPrefix");
    const set = url.searchParams.get("set");
    const identifier = url.searchParams.get("identifier");

    let xml;

    if (!verb) {
      xml = errorResponse(
        "badVerb",
        "An OAI-PMH verb is required.",
        request.url
      );
    } else if (verb === "Identify") {
      xml = identify(request.url);
    } else if (verb === "ListMetadataFormats") {
      xml = listMetadataFormats(request.url);
    } else if (verb === "ListSets") {
      xml = listSets(request.url);
    } else if (verb === "ListIdentifiers") {
      if (metadataPrefix !== "oai_dc") {
        xml = errorResponse(
          "cannotDisseminateFormat",
          "Only oai_dc is currently supported.",
          request.url,
          verb
        );
      } else {
        xml = listIdentifiers(request.url, set);
      }
    } else if (verb === "ListRecords") {
      if (metadataPrefix !== "oai_dc") {
        xml = errorResponse(
          "cannotDisseminateFormat",
          "Only oai_dc is currently supported.",
          request.url,
          verb
        );
      } else {
        xml = listRecords(request.url, set);
      }
    } else if (verb === "GetRecord") {
      if (metadataPrefix !== "oai_dc") {
        xml = errorResponse(
          "cannotDisseminateFormat",
          "Only oai_dc is currently supported.",
          request.url,
          verb
        );
      } else if (!identifier) {
        xml = errorResponse(
          "badArgument",
          "GetRecord requires an identifier.",
          request.url,
          verb
        );
      } else {
        xml = getRecord(request.url, identifier);
      }
    } else {
      xml = errorResponse(
        "badVerb",
        "The requested OAI-PMH verb is not supported.",
        request.url,
        verb
      );
    }

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=UTF-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
