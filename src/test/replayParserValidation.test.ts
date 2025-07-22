/**
 * Comprehensive SC:BW Remastered Replay Parser Tests
 * Validates all extracted fields against real .rep files
 */

// Test framework types (will be available when Jest is configured)
import { SCRemasteredParser, SCRParseResult } from '../services/nativeReplayParser/scremasteredParser';
import * as fs from 'fs';
import * as path from 'path';

describe('SC:BW Remastered Parser Validation', () => {
  const testReplaysDir = path.join(__dirname, '../../test/replays');
  
  // Helper to load replay file
  const loadReplayFile = async (filename: string): Promise<ArrayBuffer> => {
    const filepath = path.join(testReplaysDir, filename);
    if (!fs.existsSync(filepath)) {
      throw new Error(`Test replay file not found: ${filename}`);
    }
    
    const buffer = fs.readFileSync(filepath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  };

  // Test case for Fighting Spirit replay
  test('Fighting Spirit replay parsing', async () => {
    const buffer = await loadReplayFile('150037,(4)Fighting_Spirit 1.4.rep');
    const parser = new SCRemasteredParser(buffer);
    const result = await parser.parseReplay();
    
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    
    // Validate metadata
    expect(result.metadata.mapName).toContain('Fighting Spirit');
    expect(result.metadata.duration).toMatch(/^\d+:\d{2}$/);
    expect(result.metadata.durationSeconds).toBeGreaterThan(0);
    
    // Validate players
    expect(result.players).toHaveLength(2);
    result.players.forEach(player => {
      expect(player.name).toBeTruthy();
      expect(player.name).not.toBe('Unknown');
      expect(['Terran', 'Protoss', 'Zerg', 'Random']).toContain(player.race);
    });
    
    // Validate APM data
    result.players.forEach(player => {
      expect(result.apmData[player.id]).toBeDefined();
      expect(result.apmData[player.id].apm).toBeGreaterThan(0);
      expect(result.apmData[player.id].eapm).toBeGreaterThan(0);
      expect(result.apmData[player.id].apm).toBeGreaterThanOrEqual(result.apmData[player.id].eapm);
    });
    
    // Validate build orders
    result.players.forEach(player => {
      expect(result.buildOrders[player.id]).toBeDefined();
      expect(result.buildOrders[player.id].length).toBeGreaterThan(0);
      
      // Check build order structure
      result.buildOrders[player.id].forEach(item => {
        expect(item.frame).toBeGreaterThanOrEqual(0);
        expect(item.gameTime).toMatch(/^\d+:\d{2}$/);
        expect(item.supply).toBeTruthy();
        expect(['Build', 'Train']).toContain(item.action);
        expect(item.unitOrBuilding).toBeTruthy();
        expect(item.unitOrBuilding).not.toBe('Unknown');
      });
    });
    
    // Validate action stream
    expect(result.actionStream.length).toBeGreaterThan(100);
    result.actionStream.forEach(action => {
      expect(action.frame).toBeGreaterThanOrEqual(0);
      expect(action.playerId).toBeGreaterThanOrEqual(-1); // -1 for frame sync
      expect(action.commandId).toBeGreaterThanOrEqual(0);
      expect(action.commandName).toBeTruthy();
      expect(action.rawData).toBeInstanceOf(Uint8Array);
    });
    
    // Validate key events
    expect(result.keyEvents.length).toBeGreaterThan(0);
    result.keyEvents.forEach(event => {
      expect(event.frame).toBeGreaterThanOrEqual(0);
      expect(event.gameTime).toMatch(/^\d+:\d{2}$/);
      expect(['scouting', 'upgrade', 'combat', 'hotkey', 'expansion']).toContain(event.type);
      expect(event.description).toBeTruthy();
      expect(event.playerId).toBeGreaterThanOrEqual(0);
    });
    
    console.log('✅ Fighting Spirit test passed:', {
      map: result.metadata.mapName,
      duration: result.metadata.duration,
      players: result.players.map(p => `${p.name} (${p.race})`),
      apm: result.players.map(p => result.apmData[p.id]?.apm),
      buildOrderLengths: result.players.map(p => result.buildOrders[p.id]?.length),
      actionCount: result.actionStream.length,
      keyEvents: result.keyEvents.length
    });
  });

  // Test international replay support
  test('International replay parsing', async () => {
    const replayFiles = fs.readdirSync(testReplaysDir)
      .filter(file => file.endsWith('.rep'))
      .slice(0, 5); // Test first 5 replays
    
    for (const filename of replayFiles) {
      console.log(`Testing: ${filename}`);
      
      const buffer = await loadReplayFile(filename);
      const parser = new SCRemasteredParser(buffer);
      const result = await parser.parseReplay();
      
      // Basic validation for all replays
      expect(result.success).toBe(true);
      expect(result.players.length).toBeGreaterThanOrEqual(2);
      expect(result.metadata.mapName).toBeTruthy();
      expect(result.metadata.durationSeconds).toBeGreaterThan(0);
      
      // Each player should have data
      result.players.forEach(player => {
        expect(player.name).toBeTruthy();
        expect(player.race).toBeTruthy();
        expect(result.apmData[player.id]).toBeDefined();
        expect(result.buildOrders[player.id]).toBeDefined();
      });
      
      console.log(`✅ ${filename}: ${result.metadata.mapName} - ${result.players.map(p => p.name).join(' vs ')}`);
    }
  });

  // Performance test
  test('Parser performance', async () => {
    const buffer = await loadReplayFile('150037,(4)Fighting_Spirit 1.4.rep');
    
    const startTime = Date.now();
    const parser = new SCRemasteredParser(buffer);
    const result = await parser.parseReplay();
    const endTime = Date.now();
    
    const parseTime = endTime - startTime;
    
    expect(result.success).toBe(true);
    expect(parseTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    console.log(`✅ Parse time: ${parseTime}ms`);
  });

  // Edge case tests
  test('Corrupted replay handling', async () => {
    // Create a corrupted buffer
    const corruptedBuffer = new ArrayBuffer(1000);
    const view = new Uint8Array(corruptedBuffer);
    view.fill(0xFF); // Fill with invalid data
    
    const parser = new SCRemasteredParser(corruptedBuffer);
    const result = await parser.parseReplay();
    
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.players.length).toBeGreaterThanOrEqual(0);
    expect(result.actionStream.length).toBeGreaterThanOrEqual(0);
  });

  // Validation helper tests
  describe('Data validation helpers', () => {
    test('APM calculation accuracy', async () => {
      const buffer = await loadReplayFile('150037,(4)Fighting_Spirit 1.4.rep');
      const parser = new SCRemasteredParser(buffer);
      const result = await parser.parseReplay();
      
      if (result.success) {
        result.players.forEach(player => {
          const apm = result.apmData[player.id];
          
          // APM should be reasonable (10-400 range)
          expect(apm.apm).toBeGreaterThan(10);
          expect(apm.apm).toBeLessThan(400);
          
          // EAPM should be less than or equal to APM
          expect(apm.eapm).toBeLessThanOrEqual(apm.apm);
          expect(apm.eapm).toBeGreaterThan(0);
        });
      }
    });

    test('Build order chronological ordering', async () => {
      const buffer = await loadReplayFile('150037,(4)Fighting_Spirit 1.4.rep');
      const parser = new SCRemasteredParser(buffer);
      const result = await parser.parseReplay();
      
      if (result.success) {
        result.players.forEach(player => {
          const buildOrder = result.buildOrders[player.id];
          
          // Build order should be chronologically ordered
          for (let i = 1; i < buildOrder.length; i++) {
            expect(buildOrder[i].frame).toBeGreaterThanOrEqual(buildOrder[i-1].frame);
          }
          
          // Should start with worker or building units
          if (buildOrder.length > 0) {
            const firstItem = buildOrder[0];
            expect(['SCV', 'Probe', 'Drone', 'Supply Depot', 'Pylon', 'Overlord']).toContain(firstItem.unitOrBuilding);
          }
        });
      }
    });
  });
});

// Test runner configuration
export const testConfig = {
  testTimeout: 30000, // 30 seconds per test
  setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/services/nativeReplayParser/**/*.ts',
    '!src/services/nativeReplayParser/**/*.d.ts',
  ],
};