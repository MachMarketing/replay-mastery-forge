/**
 * Universal Parameter Extractor for StarCraft: Remastered
 * Step 2: Intelligent parameter extraction for BWRemastered parser
 */

export interface ExtractedParameters {
  unitId: number | null;
  unitType: 'unit' | 'building' | 'tech' | 'upgrade' | 'unknown';
  confidence: number; // 0-100
  extractionMethod: string;
  allCandidates: Array<{
    id: number;
    source: string;
    confidence: number;
  }>;
  rawParameters: any;
}

export class UniversalParameterExtractor {
  
  /**
   * Extract unit ID with high confidence from any command structure
   */
  public static extractUnitId(cmd: any, source: 'bwremastered' = 'bwremastered'): ExtractedParameters {
    const commandType = cmd.commandType || cmd.typeString || cmd.typeName || cmd.kind || '';
    const parameters = cmd.parameters || {};
    
    console.log(`[UniversalExtractor] 🔧 Extracting from ${source} command:`, {
      type: commandType,
      parameters: JSON.stringify(parameters, null, 2)
    });

    const candidates: Array<{ id: number; source: string; confidence: number }> = [];

    // Method 1: Direct parameter field access (highest confidence)
    this.extractFromDirectFields(parameters, candidates);

    // Method 2: Command type name parsing
    this.extractFromCommandTypeName(commandType, candidates);

    // Method 3: Array parameter analysis
    this.extractFromArrayParameters(parameters, candidates);

    // Method 4: Nested structure analysis
    this.extractFromNestedStructures(parameters, candidates);

    // Method 5: Parser-specific extraction
    if (source === 'bwremastered') {
      this.extractBWRemasteredSpecific(cmd, candidates);
    }

    // Method 6: Heuristic analysis
    this.extractWithHeuristics(cmd, candidates);

    // Select best candidate
    const bestCandidate = this.selectBestCandidate(candidates, commandType);
    
    const result: ExtractedParameters = {
      unitId: bestCandidate?.id || null,
      unitType: this.determineUnitType(bestCandidate?.id, commandType),
      confidence: bestCandidate?.confidence || 0,
      extractionMethod: bestCandidate?.source || 'none',
      allCandidates: candidates,
      rawParameters: parameters
    };

    console.log(`[UniversalExtractor] 🎯 Extraction result:`, result);
    return result;
  }

  /**
   * Extract from direct parameter fields
   */
  private static extractFromDirectFields(parameters: any, candidates: Array<{ id: number; source: string; confidence: number }>): void {
    const directFields = [
      { field: 'unitTypeId', confidence: 95 },
      { field: 'unitType', confidence: 90 },
      { field: 'buildingType', confidence: 90 },
      { field: 'unit', confidence: 85 },
      { field: 'unitId', confidence: 85 },
      { field: 'type', confidence: 80 },
      { field: 'id', confidence: 75 },
      { field: 'targetType', confidence: 70 },
      { field: 'buildType', confidence: 85 },
      { field: 'trainType', confidence: 85 },
      { field: 'morphType', confidence: 85 },
      { field: 'researchType', confidence: 80 },
      { field: 'upgradeType', confidence: 80 }
    ];

    directFields.forEach(({ field, confidence }) => {
      if (parameters[field] !== undefined && typeof parameters[field] === 'number') {
        const id = parameters[field];
        if (this.isValidUnitId(id)) {
          candidates.push({
            id,
            source: `direct.${field}`,
            confidence
          });
        }
      }
    });
  }

  /**
   * Extract from command type name patterns
   */
  private static extractFromCommandTypeName(commandType: string, candidates: Array<{ id: number; source: string; confidence: number }>): void {
    // Pattern: TypeID[Action][Number] (e.g., \"TypeIDTrain121\")
    const typeIdMatch = commandType.match(/TypeID\w*(\d+)/);
    if (typeIdMatch) {
      const id = parseInt(typeIdMatch[1]);
      if (this.isValidUnitId(id)) {
        candidates.push({
          id,
          source: 'commandTypeName.typeId',
          confidence: 85
        });
      }
    }

    // Pattern: [Action][Number] (e.g., \"Train121\", \"Build042\")
    const actionIdMatch = commandType.match(/(Build|Train|Morph|Research|Upgrade)(\d+)/);
    if (actionIdMatch) {
      const id = parseInt(actionIdMatch[2]);
      if (this.isValidUnitId(id)) {
        candidates.push({
          id,
          source: 'commandTypeName.actionId',
          confidence: 75
        });
      }
    }
  }

  /**
   * Extract from array parameters
   */
  private static extractFromArrayParameters(parameters: any, candidates: Array<{ id: number; source: string; confidence: number }>): void {
    // Check if parameters itself is an array
    if (Array.isArray(parameters) && parameters.length > 0) {
      const firstParam = parameters[0];
      if (typeof firstParam === 'number' && this.isValidUnitId(firstParam)) {
        candidates.push({
          id: firstParam,
          source: 'arrayParameters.first',
          confidence: 70
        });
      }
    }

    // Check array fields within parameters
    Object.entries(parameters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'number' && this.isValidUnitId(first)) {
          candidates.push({
            id: first,
            source: `arrayField.${key}.first`,
            confidence: 65
          });
        }
      }
    });
  }

  /**
   * Extract from nested structures
   */
  private static extractFromNestedStructures(parameters: any, candidates: Array<{ id: number; source: string; confidence: number }>): void {
    const searchNested = (obj: any, path: string = '', depth: number = 0) => {
      if (depth > 3) return; // Prevent infinite recursion

      if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'number' && this.isValidUnitId(value)) {
            candidates.push({
              id: value,
              source: `nested.${currentPath}`,
              confidence: Math.max(40, 60 - depth * 10)
            });
          } else if (typeof value === 'object') {
            searchNested(value, currentPath, depth + 1);
          }
        });
      }
    };

    searchNested(parameters);
  }

  /**
   * BWRemastered-specific extraction
   */
  private static extractBWRemasteredSpecific(cmd: any, candidates: Array<{ id: number; source: string; confidence: number }>): void {
    // BWRemastered often puts unit IDs in specific structures
    const bwRemasteredFields = [
      'data.unitId',
      'data.type',
      'parameters.data',
      'parameters.unit',
      'typeString'
    ];

    bwRemasteredFields.forEach(fieldPath => {
      const value = this.getNestedValue(cmd, fieldPath);
      if (typeof value === 'number' && this.isValidUnitId(value)) {
        candidates.push({
          id: value,
          source: `bwremastered.${fieldPath}`,
          confidence: 80
        });
      }
    });
  }

  /**
   * Native parser-specific extraction
   */
  private static extractNativeSpecific(cmd: any, candidates: Array<{ id: number; source: string; confidence: number }>): void {
    // Native parser often uses different field names
    const nativeFields = [
      'unitID',
      'buildingID',
      'typeID',
      'commandData.unitType'
    ];

    nativeFields.forEach(fieldPath => {
      const value = this.getNestedValue(cmd, fieldPath);
      if (typeof value === 'number' && this.isValidUnitId(value)) {
        candidates.push({
          id: value,
          source: `native.${fieldPath}`,
          confidence: 80
        });
      }
    });
  }

  /**
   * Heuristic-based extraction
   */
  private static extractWithHeuristics(cmd: any, candidates: Array<{ id: number; source: string; confidence: number }>): void {
    const commandType = cmd.commandType || cmd.typeString || cmd.typeName || cmd.kind || '';
    
    // Look for reasonable unit IDs in all numeric values
    const allNumbers = this.getAllNumbers(cmd);
    
    allNumbers.forEach(num => {
      if (this.isValidUnitId(num)) {
        let confidence = 30;
        
        // Boost confidence based on command type context
        if (commandType.includes('Build') && this.isBuildingId(num)) confidence += 20;
        if (commandType.includes('Train') && this.isUnitId(num)) confidence += 20;
        if (commandType.includes('Research') && this.isTechId(num)) confidence += 15;
        if (commandType.includes('Upgrade') && this.isUpgradeId(num)) confidence += 15;
        
        candidates.push({
          id: num,
          source: 'heuristic.numeric',
          confidence
        });
      }
    });
  }

  /**
   * Select the best candidate based on confidence and context
   */
  private static selectBestCandidate(
    candidates: Array<{ id: number; source: string; confidence: number }>,
    commandType: string
  ): { id: number; source: string; confidence: number } | null {
    if (candidates.length === 0) return null;

    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Filter out duplicates, keeping highest confidence
    const uniqueCandidates = candidates.reduce((acc, candidate) => {
      const existing = acc.find(c => c.id === candidate.id);
      if (!existing || existing.confidence < candidate.confidence) {
        return acc.filter(c => c.id !== candidate.id).concat(candidate);
      }
      return acc;
    }, [] as typeof candidates);

    return uniqueCandidates[0];
  }

  /**
   * Determine unit type based on ID and command context
   */
  private static determineUnitType(unitId: number | null, commandType: string): 'unit' | 'building' | 'tech' | 'upgrade' | 'unknown' {
    if (unitId === null) return 'unknown';

    if (commandType.includes('Build')) return 'building';
    if (commandType.includes('Train')) return 'unit';
    if (commandType.includes('Research')) return 'tech';
    if (commandType.includes('Upgrade')) return 'upgrade';

    // Heuristic based on ID ranges (approximate SC:R ranges)
    if (unitId >= 106 && unitId <= 171) return 'building'; // Most buildings
    if (unitId >= 0 && unitId <= 105) return 'unit'; // Most units
    if (unitId >= 172 && unitId <= 255) return 'tech'; // Tech/upgrades

    return 'unknown';
  }

  /**
   * Check if ID is in valid SC unit range
   */
  private static isValidUnitId(id: number): boolean {
    return typeof id === 'number' && id >= 0 && id < 300 && Number.isInteger(id);
  }

  /**
   * Check if ID looks like a building ID
   */
  private static isBuildingId(id: number): boolean {
    return (id >= 106 && id <= 171) || // Common building range
           [0x6A, 0x6B, 0x6D, 0x6E, 0x9A, 0x9C, 0x82, 0x83].includes(id); // Essential buildings
  }

  /**
   * Check if ID looks like a unit ID
   */
  private static isUnitId(id: number): boolean {
    return (id >= 0 && id <= 105) || // Common unit range
           [0x07, 0x00, 0x40, 0x25, 0x2A].includes(id); // Essential units
  }

  /**
   * Check if ID looks like a tech ID
   */
  private static isTechId(id: number): boolean {
    return id >= 172 && id <= 255;
  }

  /**
   * Check if ID looks like an upgrade ID
   */
  private static isUpgradeId(id: number): boolean {
    return id >= 200 && id <= 255;
  }

  /**
   * Get nested object value by dot notation path
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Get all numeric values from an object recursively
   */
  private static getAllNumbers(obj: any, visited = new Set()): number[] {
    if (visited.has(obj)) return [];
    if (obj === null || obj === undefined) return [];
    
    const numbers: number[] = [];
    
    if (typeof obj === 'number') {
      numbers.push(obj);
    } else if (Array.isArray(obj)) {
      visited.add(obj);
      obj.forEach(item => {
        numbers.push(...this.getAllNumbers(item, visited));
      });
    } else if (typeof obj === 'object') {
      visited.add(obj);
      Object.values(obj).forEach(value => {
        numbers.push(...this.getAllNumbers(value, visited));
      });
    }
    
    return numbers;
  }
}
