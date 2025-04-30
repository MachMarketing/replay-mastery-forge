
# StarCraft Replay Parser Test Utility

This directory contains utilities for testing the StarCraft replay parser.

## Running the Test

You can run the test in one of the following ways:

### Using the Shell Script

```bash
# Make the script executable
chmod +x ./test-parser.sh

# Run with default test file
./test-parser.sh

# Or specify a file path
./test-parser.sh path/to/your/replay.rep
```

### Using npx Directly

```bash
# Run with default test file
npx ts-node ./src/test/parserTest.ts

# Or specify a file path
npx ts-node ./src/test/parserTest.ts path/to/your/replay.rep
```

## Test Fixtures

Place your test replay files (.rep) in the `fixtures` directory to have them automatically discovered by the test script.
