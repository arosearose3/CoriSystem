// propertyResolver.js

/**
 * PropertyResolver handles finding and resolving values needed during workflow execution.
 * It understands different data sources like events, context, and previous activity results,
 * and knows how to navigate their structure to find specific values. It's like having
 * a skilled researcher who knows exactly where to find any piece of information needed.
 */

import  fhirpath  from 'fhirpath';


class ValidationResult {
  constructor() {
      this.errors = [];
      this.warnings = [];
      this.missingRequired = [];
      this.invalidExpressions = [];
  }

  addError(property, message) {
      this.errors.push({ property, message });
  }

  addWarning(property, message) {
      this.warnings.push({ property, message });
  }

  addMissingRequired(property) {
      this.missingRequired.push(property);
  }

  addInvalidExpression(property, expression, reason) {
      this.invalidExpressions.push({ property, expression, reason });
  }

  hasIssues() {
      return this.errors.length > 0 || this.missingRequired.length > 0;
  }
}

export class ContextProvider {
    async getContext(requestContext) {
      // This needs to be implemented based on your system's
      // authentication and session management
      throw new Error('Not implemented');
    }
  }


export class PropertyResolver {

  static URL_PATTERNS = {
    API_PREFIX: '/api/',
    ALLOWED_PROTOCOLS: [ 'https:'],
    REQUIRED_BASE_URLS: [
        'https://localhost:3001',
        process.env.CLIENT_URL
    ].filter(Boolean)
 };

  static PATH_TYPES = {
    API_ENDPOINT: '/Task/apiPath',
    INPUT_VALUE: '/value',
    INPUT_TYPE: '/type',
    INPUT_MAPPING: '/mappingSource',
    INPUT_DEFINITION: '/definedAt'
  };

  constructor(contextProvider) {
    this.contextProvider = contextProvider;
    this.systemContext = {
      user: {
        id: 'SYSTEM',
        name: 'System Process',
        roles: ['system']
      },
      practitioner: null
    };
  }
  
      async getCurrentContext(requestContext) {
        const contextData = await this.contextProvider.getContext(requestContext);
        
        // Structure matches our client-side store format
        return {
          user: {
            id: contextData.user?.id,
            email: contextData.user?.email,
            name: contextData.user?.name,
            picture: contextData.user?.picture
          },
          practitioner: {
            PRid: contextData.practitioner?.PRid,
            Pid: contextData.practitioner?.Pid,
            name: contextData.practitioner?.name,
            organizationId: contextData.practitioner?.organizationId,
            organizationName: contextData.practitioner?.organizationName,
            roles: contextData.practitioner?.roles || [],
            practitionerRoles: contextData.practitioner?.practitionerRoles || [],
            localOrgArray: contextData.practitioner?.localOrgArray || []
          }
        };
      }


      // temporary out of flow Dec 16 '24
      validateCrossPropertyConstraints(resolvedValues, validationResult) {
        if (resolvedValues.configuration.async?.type === 'approval') {
          if (!resolvedValues.configuration.async.validResponses) {
              validationResult.addError('async', 'validResponses required for approval type');
          }
      }
/*         // Example: If "to" email exists, "subject" must exist
        if (resolvedValues.inputs.to && !resolvedValues.inputs.subject) {
            validationResult.addError('subject', 'Subject is required when "to" address is specified');
        }
    
        // Example: If using template reference, template must exist
        if (resolvedValues.inputs.templateRef && !resolvedValues.inputs.templateId) {
            validationResult.addError('templateId', 'Template ID is required when using template reference');
        } */
    }

      isPropertyRequired(dynamicValue) {
        return dynamicValue.extension?.some(ext => 
            ext.url === 'http://your-system/property-required' && 
            ext.valueBoolean === true
        ) ?? false;
    }

    /**
     * When an activity needs to execute, we need to gather all its input values.
     * This method examines the activity's input definitions and resolves each one
     * from its specified source. It's like filling out a form where each answer
     * might come from a different place.
     */
      /**
   * When resolving activity inputs, we need to consider that the mappingPath
   * might be a complex FHIRPath expression. This is especially important when
   * working with FHIR resources where we need to filter arrays, navigate complex
   * structures, or apply conditions to find the right value.
   */
async resolveActivityInputs(activityDefinition, executionContext) {
  const validationResult = new ValidationResult();
    const resolvedValues = {
        inputs: {},
        endpoint: null,
        configuration: {}
    };

    try {
            const endpointValue = activityDefinition.dynamicValue?.find(
              dv => dv.path === '/Task/apiPath'
          );

          if (endpointValue) {
              try {
                  resolvedValues.endpoint = await this.resolveEndpoint(endpointValue, executionContext);
              } catch (error) {
                  validationResult.addError('endpoint', `Invalid endpoint: ${error.message}`);
              }
          }
        // First pass: Validate all expressions and collect required properties
        const requiredProperties = new Set();
        
        for (const dynamicValue of activityDefinition.dynamicValue || []) {
            // Check if property is required
            if (this.isPropertyRequired(dynamicValue)) {
                const pathResult = this.parseDynamicValuePath(dynamicValue.path);
                if (pathResult?.property) {
                    requiredProperties.add(pathResult.property);
                }
            }

            // Validate expression
            if (dynamicValue.expression) {
                const expressionError = await this.validateExpression(
                    dynamicValue.expression.expression,
                    dynamicValue.expression.language,
                    executionContext
                );
                
                if (expressionError) {
                    validationResult.addInvalidExpression(
                        dynamicValue.path,
                        dynamicValue.expression.expression,
                        expressionError
                    );
                }
            }
        }

        // second pass - resolve values and validate
        console.log("Resolving values for activity:", activityDefinition.id);

        for (const dynamicValue of activityDefinition.dynamicValue || []) {
            console.log("Processing dynamic value:", dynamicValue);

            // Extract path components
            const pathResult = this.parseDynamicValuePath(dynamicValue.path);
            if (!pathResult) {
              validationResult.addError(dynamicValue.path, 'Invalid path structure');
              continue;
          }

          try {
            const resolvedValue = await this.resolveDynamicValue(
                dynamicValue,
                pathResult.type,
                executionContext
            );
         
            // Track resolved required properties
            if (requiredProperties.has(pathResult.property) && !resolvedValue) {
                validationResult.addMissingRequired(pathResult.property);
            }
         
            // Pass the attribute from pathResult if it exists
            this.storeResolvedValue(
                resolvedValues, 
                pathResult.type, 
                pathResult.property, 
                resolvedValue,
                pathResult.attribute // From our updated parseDynamicValuePath
            );
         
         } catch (error) {
            validationResult.addError(dynamicValue.path, error.message);
         }
        }
        // Cross-property validation
        this.validateCrossPropertyConstraints(resolvedValues, validationResult);

        // If there are critical issues, throw error
        if (validationResult.hasIssues()) {
            throw new Error('Property resolution failed validation', { cause: validationResult });
        }

        if (!resolvedValues.endpoint) {
            validationResult.addError('endpoint', 'No valid endpoint specified for activity');
        }
        console.log('Final resolved values:', {
          endpoint: resolvedValues.endpoint,
          inputs: resolvedValues.inputs,
          configuration: resolvedValues.configuration
        });
      
        return resolvedValues;

    } catch (error) {
        if (error.cause instanceof ValidationResult) {
            throw error; // Rethrow validation errors
        }
        // Handle unexpected errors
        validationResult.addError('system', `Unexpected error: ${error.message}`);
        throw new Error('Property resolution failed', { cause: validationResult });
    }
  }

  parseDynamicValuePath(path) {
    console.log("Parsing path:", path);

    // First check for API endpoint path
    if (path === PropertyResolver.PATH_TYPES.API_ENDPOINT) {
        return { type: 'endpoint' };
    }

    // Handle async/response paths
    if (path.startsWith('/Task/async/')) {
        const asyncPath = path.replace('/Task/async/', '');
        return {
            type: 'async',
            property: asyncPath,  // 'type', 'validResponses', etc.
            attribute: 'value'
        };
    }

    // Parse input property paths with metadata
    // Example: /Task/input[to]/name or /Task/input[subject]/value
    const propertyMatch = path.match(/\/Task\/input\[([^\]]+)\]\/(\w+)/);
    if (propertyMatch) {
        const [_, property, attribute] = propertyMatch;
        
        // Map attributes to types
        switch (attribute) {
            case 'value':
                return { 
                    type: 'input', 
                    property,
                    attribute: 'value'
                };

            case 'name':
            case 'type':
            case 'definedAt':
            case 'mappingSource':
            case 'mappingPath':
                return { 
                    type: 'metadata',
                    property,
                    attribute
                };

            default:
                console.warn(`Unknown attribute type: ${attribute}`);
                return null;
        }
    }

    // Handle output paths
    const outputMatch = path.match(/\/Task\/output\[([^\]]+)\]\/(\w+)/);
    if (outputMatch) {
        const [_, property, attribute] = outputMatch;
        return {
            type: 'output',
            property,
            attribute
        };
    }

    console.warn(`Unable to parse path: ${path}`);
    return null;
}

async resolveDynamicValue(dynamicValue, type, context) {
  console.log("Resolving dynamic value:", {
      type,
      expression: dynamicValue.expression,
      returnValue: dynamicValue.expression?.expression
  });

  if (!dynamicValue.expression?.expression) {
      return null;
  }

  // Clean up the expression
  const expression = dynamicValue.expression.expression;
  const language = dynamicValue.expression.language || 'text/plain';

  switch (type) {
        case 'async':
            // Handle async/response path values
            switch (dynamicValue.path.replace('/Task/async/', '')) {
                case 'type':
                    return expression || 'approval';
                case 'validResponses':
                    try {
                        return JSON.parse(expression);
                    } catch {
                        return ['approved', 'rejected'];
                    }
                case 'tracking/requestId':
                    return context.task?.identifier?.find(id => 
                        id.system === 'urn:uuid'
                    )?.value || crypto.randomUUID();
                case 'responseHandler':
                    return expression || 'Task.output.responseResult';
                default:
                    return expression;
            }

        case 'endpoint':
            return expression;

        case 'input':
            return expression;

        case 'mapping':
        case 'definition':
        case 'type':
        case 'metadata':
            return expression;

        default:
            console.warn(`Unknown value type: ${type}`);
            return null;
    }
}

storeResolvedValue(resolvedValues, type, property, value, attribute) {
  console.log("Storing resolved value:", {
      type,
      property,
      value,
      attribute,
      currentResolvedValues: JSON.stringify(resolvedValues)
  });

  if (!value) return;

  // Initialize required objects if they don't exist
  if (!resolvedValues.inputs) {
      resolvedValues.inputs = {};
  }
  if (!resolvedValues.configuration) {
      resolvedValues.configuration = {};
  }

  switch (type) {
    case 'async':
      // Initialize async configuration if needed
      if (!resolvedValues.configuration.async) {
          resolvedValues.configuration.async = {};
      }
      resolvedValues.configuration.async[property] = value;
      break;

      case 'endpoint':
          // Ensure endpoint is a full URL
          resolvedValues.endpoint = value.startsWith('http')
              ? value
              : `https://localhost:3001/${value.replace(/^\/+/, '')}`;
          console.log('Stored endpoint URL:', resolvedValues.endpoint);
          break;

      case 'input':
          // Store input value directly under its property name
          resolvedValues.inputs[property] = value;
          console.log(`Stored input value for ${property}:`, resolvedValues.inputs[property]);
          break;

      case 'metadata':
          // Initialize configuration object for this property if needed
          if (!resolvedValues.configuration[property]) {
              resolvedValues.configuration[property] = {};
          }
          if (attribute) {
              resolvedValues.configuration[property][attribute] = value;
          }
          break;

      case 'mapping':
      case 'definition':
      case 'type':
          if (!resolvedValues.configuration[property]) {
              resolvedValues.configuration[property] = {};
          }
          resolvedValues.configuration[property][type] = value;
          break;

      default:
          console.warn(`Unhandled value type: ${type}, property: ${property}`);
  }

  console.log('Updated resolvedValues:', {
      type,
      property,
      attribute,
      currentValue: value,
      allValues: JSON.stringify(resolvedValues)
  });
}

    /**
     * Given a source type (like "Context" or "Event") and a path to a value,
     * this method knows how to navigate to that value. It's like following
     * a map to find a specific treasure in different locations.
     */
      /**
   * This enhanced version of resolveValue knows how to handle both simple
   * property paths and complex FHIRPath expressions. For example:
   * - Simple path: "user.email"
   * - FHIRPath: "Patient.name.given.first()"
   */
      async resolveValue(source, path, language, executionContext) {
        // Get the appropriate source data first
        const sourceData = this.getSourceData(source, executionContext);
        
        if (!sourceData) return null;
      
        if (language === 'text/fhirpath') {
          try {
            const results = await fhirpath.evaluate(sourceData, path);
            return results[0];
          } catch (error) {
            throw new Error(`FHIRPath evaluation failed for ${path}: ${error.message}`);
          }
        } else {
          return this.resolvePath(path, sourceData);
        }
      }
        

    
    

    /**
     * Navigate a path like "user.email" to find a value in an object.
     * This is like following breadcrumbs through nested data structures
     * to find exactly what we're looking for.
     */
    resolvePath(path, source) {
      return path.split('.').reduce((obj, key) => obj?.[key], source);
    }
  
    prepareContextForEvaluation(contextData) {
      const context = {
        context: {}
      };
    
      // Only add user data if it exists
      if (contextData.user?.id) {
        context.context.user = {
          resourceType: 'Person',
          id: contextData.user.id,
          identifier: contextData.user.email ? [{
            system: 'email',
            value: contextData.user.email
          }] : [],
          name: contextData.user.name ? [{
            text: contextData.user.name
          }] : []
        };
      }
    
      // Only add practitioner data if it exists
      if (contextData.practitioner?.PRid) {
        context.context.practitioner = {
          resourceType: 'PractitionerRole',
          id: contextData.practitioner.PRid,
          practitioner: contextData.practitioner.Pid ? {
            reference: `Practitioner/${contextData.practitioner.Pid}`,
            display: contextData.practitioner.name
          } : undefined,
          organization: contextData.practitioner.organizationId ? {
            reference: `Organization/${contextData.practitioner.organizationId}`,
            display: contextData.practitioner.organizationName
          } : undefined,
          code: (contextData.practitioner.roles || []).map(role => ({
            coding: [{
              system: 'http://your-system/roles',
              code: role
            }]
          }))
        };
      }
    
      return context;
    }

    getSourceData(source, context) {
        switch (source) {
          case 'Context':
            return context.context;
            
          case 'Event':
            // If this is a FHIR resource, return it directly
            if (context.event?.resourceType) {
              return context.event;
            }
            // Otherwise wrap it in a structure FHIRPath can evaluate
            return { event: context.event };
            
          case 'System':
            return { system: this.systemContext };
            
          case 'Parent':
            if (context.parent?.output) {
              // Format task outputs into a structure suitable for FHIRPath
              return {
                output: this.formatTaskOutputs(context.parent.output)
              };
            }
            return null;
            
            case 'Previous':
              // The full execution context should include a map of completed activities
              if (context.completedActivities) {
                return {
                  // Make all activity outputs available by activity name
                  activities: Object.fromEntries(
                    Object.entries(context.completedActivities).map(([name, task]) => [
                      name,
                      this.formatTaskOutputs(task.output)
                    ])
                  ),
                  // Also make latest output available directly
                  output: context.parent ? 
                    this.formatTaskOutputs(context.parent.output) : 
                    null
                };
              }
              return null;

          default:
            throw new Error(`Unknown property source: ${source}`);
        }
      }

    /**
     * Helper method to find a specific configuration value from the 
     * property's dynamic value entries.
     */
    findConfigValue(propertyConfig, type) {
      const entry = propertyConfig.find(pc => pc.path.endsWith(type));
      return entry?.expression?.expression;
    }
  
    /**
     * Convert task outputs into a more easily navigable object structure.
     */
  formatTaskOutputs(outputs) {
      return outputs.reduce((acc, output) => {
        acc[output.type.text] = output.valueString;
        return acc;
      }, {});
    }
  
    validateActivityEndpoint(url) {
      try {
          this.validateEndpointUrl(url);
          return true;
      } catch (error) {
          return false;
      }
   }

  validateExecutionContext(executionContext) {
    if (!executionContext) {
      throw new Error('Execution context is required');
    }
    
    // Check required properties based on source requirements
    if (executionContext.requestInfo === undefined) {
      throw new Error('Execution context must include requestInfo');
    }
    
    if (executionContext.event === undefined) {
      throw new Error('Execution context must include event data');
    }
  }

  async validateExpression(expression, language, context) {
    if (!expression) {
        return "Expression is empty";
    }

    if (language === 'text/fhirpath') {
        try {
            // Try parsing the FHIRPath expression without executing
            await fhirpath.compile(expression);
            
            // Validate context requirements
            const contextRequirements = this.getExpressionContextRequirements(expression);
            const missingContext = this.validateContextAvailability(contextRequirements, context);
            
            if (missingContext.length > 0) {
                return `Missing required context: ${missingContext.join(', ')}`;
            }
        } catch (error) {
            return `Invalid FHIRPath expression: ${error.message}`;
        }
    }

    return null; // Expression is valid
}

getExpressionContextRequirements(expression) {
    // Extract context references from FHIRPath expression
    const requirements = new Set();
    
    // Look for common patterns like Patient.name, %context.user
    const matches = expression.match(/(%?\w+)\.[\w.]+/g) || [];
    
    matches.forEach(match => {
        const base = match.split('.')[0].replace('%', '');
        requirements.add(base);
    });
    
    return Array.from(requirements);
}

validateContextAvailability(requirements, context) {
    const missing = [];
    
    requirements.forEach(req => {
        if (!this.hasContextPath(context, req)) {
            missing.push(req);
        }
    });
    
    return missing;
}

hasContextPath(context, path) {
    const parts = path.split('.');
    let current = context;
    
    for (const part of parts) {
        if (!current || !current.hasOwnProperty(part)) {
            return false;
        }
        current = current[part];
    }
    
    return true;
}

resolveEndpoint(dynamicValue, context) {
  console.log('Resolving endpoint:', dynamicValue);

  // Get raw endpoint value
  const rawEndpoint = dynamicValue.expression?.expression?.replace(/^['"](.+)['"]$/, '$1');
  if (!rawEndpoint) {
      throw new Error('No endpoint expression provided');
  }

  // First normalize the path
  const normalizedPath = this.normalizePath(rawEndpoint);

  // Then build and validate the full URL
  const fullUrl = this.buildEndpointUrl(normalizedPath);
  
  // Validate the constructed URL
  this.validateEndpointUrl(fullUrl);

  return fullUrl;
}

normalizePath(path) {
  console.log('Normalizing path:', path);

  // Remove any leading/trailing slashes
  let normalized = path.replace(/^\/+|\/+$/g, '');

  // Handle api prefix
  if (!normalized.startsWith('api/')) {
      normalized = `api/${normalized}`;
  }

  // Remove any double slashes
  normalized = normalized.replace(/\/+/g, '/');

  console.log('Normalized path:', normalized);
  return normalized;
}

buildEndpointUrl(path) {
  console.log('Building endpoint URL from path:', path);

  // If it's already a full URL, return it
  if (path.startsWith('http')) {
      return path;
  }

  // Clean the path/endpoint
  const cleanEndpoint = path.startsWith('/') ? path.slice(1) : path;
  
  // Clean the base URL from environment
  const baseUrl = process.env.CLIENT_URL || 'https://localhost:3001';
  const cleanBaseUrl = baseUrl.endsWith('/') 
      ? baseUrl.slice(0, -1) 
      : baseUrl;

  // Combine them
  const fullEndpoint = `${cleanBaseUrl}/${cleanEndpoint}`;

  console.log('Built full URL:', fullEndpoint);
  return fullEndpoint;
}

validateEndpointUrl(url) {
  console.log('Validating endpoint URL:', url);

  try {
      const parsed = new URL(url);

      // Check protocol
      if (!PropertyResolver.URL_PATTERNS.ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
          throw new Error(`Invalid protocol: ${parsed.protocol}. Must be http or https`);
      }

      // Check base URL
      const baseUrl = `${parsed.protocol}//${parsed.host}`;
      if (!PropertyResolver.URL_PATTERNS.REQUIRED_BASE_URLS.includes(baseUrl)) {
          throw new Error(`Invalid base URL: ${baseUrl}. Must match configured base URLs`);
      }

      // Check path starts with /api/
      if (!parsed.pathname.startsWith('/api/')) {
          throw new Error('URL path must start with /api/');
      }

      // Validate path segments (no empty or invalid characters)
      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      pathSegments.forEach(segment => {
          if (!/^[\w-]+$/.test(segment)) {
              throw new Error(`Invalid path segment: ${segment}`);
          }
      });

  } catch (error) {
      if (error instanceof TypeError) {
          throw new Error(`Invalid URL format: ${url}`);
      }
      throw error;
  }
}

}

