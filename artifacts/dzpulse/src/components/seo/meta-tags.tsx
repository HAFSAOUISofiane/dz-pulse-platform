import { Helmet } from "react-helmet-async";

const SITE_NAME = "DzPulse";
const SITE_URL = "https://dzpulse.replit.app";
const DEFAULT_DESCRIPTION =
  "Algeria's live civic polling platform. Vote anonymously on politics, economy, health, and society — real opinions, transparent results.";
const DEFAULT_IMAGE = `${SITE_URL}/opengraph.jpg`;

interface MetaTagsProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  noindex?: boolean;
  structuredData?: object;
}

export function MetaTags({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  noindex = false,
  structuredData,
}: MetaTagsProps) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} · Algeria's Civic Pulse`;
  const canonicalUrl = url ? `${SITE_URL}${url}` : SITE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content="en_DZ" />
      <meta property="og:locale:alternate" content="ar_DZ" />
      <meta property="og:locale:alternate" content="fr_DZ" />

      {/* Twitter / X card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@DzPulse" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
