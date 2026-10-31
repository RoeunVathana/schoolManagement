import { useEffect } from "react";

export const SITE_URL = "https://campusflowlms.xyz";
export const SITE_NAME = "CampusFlow LMS";
export const DEFAULT_DESCRIPTION =
  "CampusFlow LMS helps students in Cambodia learn practical skills through guided online courses, local teachers, KHQR payment, and a supportive learning community.";
export const DEFAULT_IMAGE = `${SITE_URL}/campusflow-logo.jpg`;

function absoluteUrl(path = "/") {
  const url = new URL(path, SITE_URL);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function upsertMeta(key, content, attribute = "name") {
  let node = document.head.querySelector(`meta[data-seo-key="${key}"], meta[${attribute}="${key}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.dataset.seoKey = key;
    document.head.appendChild(node);
  }
  node.setAttribute(attribute, key);
  node.setAttribute("content", content);
}

function upsertCanonical(href) {
  let node = document.head.querySelector('link[data-seo-canonical="true"], link[rel="canonical"]');
  if (!node) {
    node = document.createElement("link");
    node.dataset.seoCanonical = "true";
    node.rel = "canonical";
    document.head.appendChild(node);
  }
  node.href = href;
}

export default function Seo({
  title = SITE_NAME,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  language = "en",
  noindex = false,
  jsonLd = null,
}) {
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const canonical = absoluteUrl(path);
    const imageUrl = absoluteUrl(image);
    const robots = noindex
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

    document.title = title;
    document.documentElement.lang = language;
    upsertMeta("description", description);
    upsertMeta("robots", robots);
    upsertMeta("og:title", title, "property");
    upsertMeta("og:description", description, "property");
    upsertMeta("og:type", type, "property");
    upsertMeta("og:url", canonical, "property");
    upsertMeta("og:site_name", SITE_NAME, "property");
    upsertMeta("og:locale", language === "km" ? "km_KH" : "en_US", "property");
    upsertMeta("og:locale:alternate", language === "km" ? "en_US" : "km_KH", "property");
    upsertMeta("og:image", imageUrl, "property");
    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", title);
    upsertMeta("twitter:description", description);
    upsertMeta("twitter:image", imageUrl);
    upsertCanonical(canonical);

    const existingSchema = document.head.querySelector("#seo-jsonld");
    existingSchema?.remove();
    if (jsonLdText) {
      const schema = document.createElement("script");
      schema.id = "seo-jsonld";
      schema.type = "application/ld+json";
      schema.textContent = jsonLdText;
      document.head.appendChild(schema);
    }
  }, [description, image, jsonLdText, language, noindex, path, title, type]);

  return null;
}
