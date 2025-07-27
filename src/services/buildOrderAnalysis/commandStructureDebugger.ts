/**
 * Command Structure Debugger for StarCraft: Remastered
 * Step 1: Analyzes command structures from both screparsed and native parsers
 */

export interface CommandDebugInfo {
  commandType: string;
  playerId: number;
  frame: number;
  parameters: Record<string, any>;
  parameterKeys: string[];
  numericValues: number[];
  potentialUnitIds: number[];
  source: 'bwremastered';
  rawStructure: any;
}

export interface DebugSession {
  totalCommands: number;
  commandTypes: string[];
  parameterStructures: Record<string, any>;
  potentialUnitIdSources: string[];
  buildCommands: CommandDebugInfo[];
  trainCommands: CommandDebugInfo[];
  morphCommands: CommandDebugInfo[];
  researchCommands: CommandDebugInfo[];
  upgradeCommands: CommandDebugInfo[];
}

export class CommandStructureDebugger {
  private static debugSession: DebugSession | null = null;

  /**
   * Start debug session for comprehensive command analysis
   */
  public static startDebugSession(): void {
    this.debugSession = {
      totalCommands: 0,
      commandTypes: [],
      parameterStructures: {},
      potentialUnitIdSources: [],
      buildCommands: [],
      trainCommands: [],
      morphCommands: [],
      researchCommands: [],
      upgradeCommands: []
    };
    
    console.log('[CommandDebugger] 🔍 Starting comprehensive command structure analysis...');
  }

  /**
   * Analyze a single command structure
   */
  public static analyzeCommand(cmd: any, source: 'bwremastered'): CommandDebugInfo {
    if (!this.debugSession) this.startDebugSession();

    const commandType = cmd.commandType || cmd.typeString || cmd.typeName || cmd.kind || 'Unknown';
    const playerId = cmd.playerId !== undefined ? cmd.playerId : cmd.playerID || 0;
    const frame = cmd.frame || 0;
    const parameters = cmd.parameters || {};

    // Extract all parameter keys and numeric values
    const parameterKeys = Object.keys(parameters);
    const numericValues = this.extractNumericValues(parameters);
    const potentialUnitIds = this.findPotentialUnitIds(parameters, commandType);

    const debugInfo: CommandDebugInfo = {
      commandType,
      playerId,
      frame,
      parameters,
      parameterKeys,
      numericValues,
      potentialUnitIds,
      source,
      rawStructure: { ...cmd }
    };

    // Log detailed analysis
    console.log(`[CommandDebugger] 🔍 Command Analysis:`, {
      type: commandType,
      source,
      frame,
      playerId,
      parameterKeys,
      numericValues,
      potentialUnitIds,
      parameters: JSON.stringify(parameters, null, 2)
    });

    // Update debug session
    this.updateDebugSession(debugInfo);

    return debugInfo;
  }

  /**
   * Analyze all commands in replay data
   */
  public static analyzeReplayCommands(replayData: any, source: 'bwremastered'): DebugSession {
    this.startDebugSession();

    const commands = replayData.commands || [];
    console.log(`[CommandDebugger] 🔍 Analyzing ${commands.length} commands from ${source} parser`);

    commands.forEach((cmd: any, index: number) => {
      if (index < 50 || this.isRelevantForBuildOrder(cmd)) { // Debug first 50 + all build order commands
        this.analyzeCommand(cmd, source);
      }
    });

    console.log(`[CommandDebugger] 🔍 Analysis complete:`, this.debugSession);
    return this.debugSession!;
  }

  /**
   * Extract all numeric values from parameters recursively
   */
  private static extractNumericValues(obj: any): number[] {
    const values: number[] = [];
    
    const extract = (item: any) => {
      if (typeof item === 'number') {
        values.push(item);
      } else if (Array.isArray(item)) {
        item.forEach(extract);
      } else if (typeof item === 'object' && item !== null) {
        Object.values(item).forEach(extract);
      }
    };

    extract(obj);
    return values;
  }

  /**
   * Find potential unit IDs in command parameters
   */
  private static findPotentialUnitIds(parameters: any, commandType: string): number[] {
    const potentialIds: Set<number> = new Set();

    // Common unit ID field names
    const unitIdFields = [
      'unitTypeId', 'unitType', 'buildingType', 'unit', 'unitId', 
      'type', 'id', 'targetType', 'buildType', 'trainType',
      'morphType', 'researchType', 'upgradeType'
    ];

    // Check direct field access
    unitIdFields.forEach(field => {
      if (parameters[field] !== undefined && typeof parameters[field] === 'number') {
        potentialIds.add(parameters[field]);
      }
    });

    // Check nested structures
    Object.values(parameters).forEach(value => {
      if (typeof value === 'object' && value !== null) {
        unitIdFields.forEach(field => {
          if ((value as any)[field] !== undefined && typeof (value as any)[field] === 'number') {
            potentialIds.add((value as any)[field]);
          }
        });
      }
    });

    // Extract from command type name (e.g., "TypeIDTrain121" -> 121)
    const typeIdMatch = commandType.match(/TypeID\w*(\d+)/);
    if (typeIdMatch) {
      potentialIds.add(parseInt(typeIdMatch[1]));
    }

    // Extract from array parameters (first element often unit ID)
    if (Array.isArray(parameters)) {
      const firstParam = parameters[0];
      if (typeof firstParam === 'number' && firstParam > 0 && firstParam < 300) {
        potentialIds.add(firstParam);
      }
    }

    // Check for raw parameter arrays
    Object.values(parameters).forEach(value => {
      if (Array.isArray(value) && value.length > 0) {
        const first = value[0];
        if (typeof first === 'number' && first > 0 && first < 300) {
          potentialIds.add(first);
        }
      }
    });

    return Array.from(potentialIds).filter(id => id > 0 && id < 300); // Valid SC unit ID range
  }

  /**
   * Check if command is relevant for build order analysis
   */
  private static isRelevantForBuildOrder(cmd: any): boolean {
    const commandType = cmd.commandType || cmd.typeString || cmd.typeName || cmd.kind || '';
    
    return commandType.includes('Build') || 
           commandType.includes('Train') || 
           commandType.includes('Morph') ||
           commandType.includes('Research') ||
           commandType.includes('Upgrade') ||
           commandType.includes('TypeIDBuild') ||
           commandType.includes('TypeIDTrain') ||
           commandType.includes('TypeIDUnitMorph') ||
           commandType.includes('TypeIDResearch') ||
           commandType.includes('TypeIDUpgrade');
  }

  /**
   * Update debug session with analyzed command
   */
  private static updateDebugSession(debugInfo: CommandDebugInfo): void {
    if (!this.debugSession) return;

    this.debugSession.totalCommands++;
    
    // Track unique command types
    if (!this.debugSession.commandTypes.includes(debugInfo.commandType)) {
      this.debugSession.commandTypes.push(debugInfo.commandType);
    }

    // Track parameter structures
    if (!this.debugSession.parameterStructures[debugInfo.commandType]) {
      this.debugSession.parameterStructures[debugInfo.commandType] = {
        commonKeys: new Set(debugInfo.parameterKeys),
        sampleParameters: debugInfo.parameters,
        potentialUnitIdSources: []
      };
    } else {
      // Find common parameter keys
      const existing = this.debugSession.parameterStructures[debugInfo.commandType].commonKeys;
      this.debugSession.parameterStructures[debugInfo.commandType].commonKeys = 
        new Set([...existing].filter(key => debugInfo.parameterKeys.includes(key)));
    }

    // Track potential unit ID sources
    debugInfo.parameterKeys.forEach(key => {
      if (!this.debugSession!.potentialUnitIdSources.includes(key)) {
        this.debugSession!.potentialUnitIdSources.push(key);
      }
    });

    // Categorize commands
    const commandType = debugInfo.commandType.toLowerCase();
    if (commandType.includes('build')) {
      this.debugSession.buildCommands.push(debugInfo);
    } else if (commandType.includes('train')) {
      this.debugSession.trainCommands.push(debugInfo);
    } else if (commandType.includes('morph')) {
      this.debugSession.morphCommands.push(debugInfo);
    } else if (commandType.includes('research')) {
      this.debugSession.researchCommands.push(debugInfo);
    } else if (commandType.includes('upgrade')) {
      this.debugSession.upgradeCommands.push(debugInfo);
    }
  }

  /**
   * Get comprehensive debug report
   */
  public static getDebugReport(): DebugSession | null {
    return this.debugSession;
  }

  /**
   * Reset debug session
   */
  public static resetDebugSession(): void {
    this.debugSession = null;
  }
}