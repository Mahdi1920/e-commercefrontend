// Global type declarations for CSS and other non-TS assets

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

