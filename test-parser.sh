
#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Running StarCraft Replay Parser Test...${NC}"

# Run the test with ts-node
# Pass any command line arguments to the test script
npx ts-node ./src/test/parserTest.ts $@

# Check if the command succeeded
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Test completed successfully!${NC}"
else
  echo -e "${RED}Test failed!${NC}"
  exit 1
fi
