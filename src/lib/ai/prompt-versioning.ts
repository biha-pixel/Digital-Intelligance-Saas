import { ModelTier } from "./types";

/**
 * Definition and metadata for a versioned prompt template.
 */
export interface PromptTemplateDefinition<TVariables extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  version: string;
  description: string;
  template: string;
  systemTemplate?: string;
  defaultTier?: ModelTier;
  defaultModel?: string;
  requiredVariables?: (keyof TVariables)[];
  metadata?: Record<string, unknown>;
}

/**
 * Immutable, strongly-typed Prompt Template with versioning and variable interpolation.
 */
export class PromptTemplate<TVariables extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly version: string;
  readonly description: string;
  readonly template: string;
  readonly systemTemplate?: string;
  readonly defaultTier?: ModelTier;
  readonly defaultModel?: string;
  readonly requiredVariables: (keyof TVariables)[];
  readonly metadata: Record<string, unknown>;

  constructor(definition: PromptTemplateDefinition<TVariables>) {
    this.id = definition.id;
    this.version = definition.version;
    this.description = definition.description;
    this.template = definition.template;
    this.systemTemplate = definition.systemTemplate;
    this.defaultTier = definition.defaultTier;
    this.defaultModel = definition.defaultModel;
    this.requiredVariables = definition.requiredVariables ?? [];
    this.metadata = definition.metadata ?? {};
  }

  /**
   * Formats the user prompt template with the provided variables.
   * Supports both `{{variable}}` and `{variable}` syntax.
   */
  format(variables: TVariables): string {
    this.validateVariables(variables);
    return this.interpolate(this.template, variables);
  }

  /**
   * Formats the system prompt template with the provided variables if defined.
   */
  formatSystem(variables: TVariables): string | undefined {
    if (!this.systemTemplate) {
      return undefined;
    }
    return this.interpolate(this.systemTemplate, variables);
  }

  /**
   * Returns prompt version identifier formatted for observability logs (e.g. `cx-sentiment@v1.2.0`).
   */
  getVersionTag(): string {
    return `${this.id}@${this.version}`;
  }

  private validateVariables(variables: TVariables): void {
    const missing: string[] = [];
    for (const req of this.requiredVariables) {
      const key = String(req);
      if (variables[key] === undefined || variables[key] === null) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `PromptTemplate [${this.id}@${this.version}] missing required variables: ${missing.join(", ")}`
      );
    }
  }

  private interpolate(str: string, variables: Record<string, unknown>): string {
    return str.replace(/\{\{?([a-zA-Z0-9_]+)\}?\}/g, (match, key) => {
      if (key in variables) {
        const value = variables[key];
        if (typeof value === "object" && value !== null) {
          return JSON.stringify(value, null, 2);
        }
        return String(value);
      }
      return match;
    });
  }
}

/**
 * In-memory registry for versioned prompt templates across the system.
 */
export class PromptRegistry {
  private static instance: PromptRegistry;
  private templates: Map<string, Map<string, PromptTemplate<any>>> = new Map();
  private defaultVersions: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): PromptRegistry {
    if (!PromptRegistry.instance) {
      PromptRegistry.instance = new PromptRegistry();
    }
    return PromptRegistry.instance;
  }

  /**
   * Registers a versioned prompt template.
   */
  register<T extends Record<string, unknown>>(
    template: PromptTemplate<T> | PromptTemplateDefinition<T>,
    isDefault: boolean = false
  ): PromptTemplate<T> {
    const instance =
      template instanceof PromptTemplate
        ? template
        : new PromptTemplate<T>(template);

    if (!this.templates.has(instance.id)) {
      this.templates.set(instance.id, new Map());
    }

    const versionMap = this.templates.get(instance.id)!;
    versionMap.set(instance.version, instance);

    if (isDefault || !this.defaultVersions.has(instance.id)) {
      this.defaultVersions.set(instance.id, instance.version);
    }

    return instance;
  }

  /**
   * Retrieves a prompt template by ID and optional version (falls back to registered default).
   */
  get<T extends Record<string, unknown> = Record<string, unknown>>(
    id: string,
    version?: string
  ): PromptTemplate<T> | undefined {
    const versionMap = this.templates.get(id);
    if (!versionMap) {
      return undefined;
    }

    const targetVersion = version || this.defaultVersions.get(id);
    if (!targetVersion) {
      return undefined;
    }

    return versionMap.get(targetVersion) as PromptTemplate<T> | undefined;
  }

  /**
   * Retrieves all registered versions for a given prompt ID.
   */
  getVersions(id: string): string[] {
    const versionMap = this.templates.get(id);
    return versionMap ? Array.from(versionMap.keys()) : [];
  }

  /**
   * Lists all registered prompt IDs in the registry.
   */
  listRegisteredPromptIds(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Clears the registry (useful for test isolation).
   */
  clear(): void {
    this.templates.clear();
    this.defaultVersions.clear();
  }
}
