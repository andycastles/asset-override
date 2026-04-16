export type RuleType = "redirect_origin";

export interface RedirectRule {
  id: string;
  type: RuleType;
  /** Wildcard URL pattern for assets to intercept, e.g. https://cdn.example.com/assets/* */
  urlPattern: string;
  /**
   * URL patterns that should NOT be redirected even if they match urlPattern.
   * e.g. https://cdn.example.com/assets/components/navigation/*
   */
  exceptions: string[];
}

export interface Group {
  id: string;
  name: string;
  enabled: boolean;
  /**
   * Optional URL pattern for the current tab. When set, rules in this group
   * only fire when the initiating page's URL matches this pattern.
   * e.g. "https://staging.example.com/*"
   */
  tabUrlPattern?: string;
  /**
   * The destination origin (scheme + host + optional port) that matched asset
   * URLs will be redirected to. e.g. "http://localhost:3000"
   */
  defaultRedirectOriginDestination: string;
  rules: RedirectRule[];
}

export interface Config {
  groups: Group[];
}

export const EMPTY_CONFIG: Config = { groups: [] };
