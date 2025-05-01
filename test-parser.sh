
#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  StarCraft Replay Parser Test Utility  ${NC}"
echo -e "${BLUE}========================================${NC}"

# Check for debug mode
DEBUG_MODE=0
if [[ "$*" == *"--debug"* ]]; then
  DEBUG_MODE=1
  echo -e "${YELLOW}Debug mode enabled${NC}"
fi

# Check for file path argument
FILE_PATH=""
for arg in "$@"; do
  if [[ "$arg" != "--debug" && "$arg" == *.rep ]]; then
    FILE_PATH="$arg"
    break
  fi
done

echo -e "${CYAN}Running parser test with the following configuration:${NC}"
echo -e "- File path: ${FILE_PATH:-"Auto-detect from fixtures"}"
echo -e "- Debug mode: $([ $DEBUG_MODE -eq 1 ] && echo "Enabled" || echo "Disabled")"
echo

# Set debug environment variable if debug mode is enabled
if [ $DEBUG_MODE -eq 1 ]; then
  export DEBUG_SCREP=1
fi

# Check if running in browser environment
if [ -n "$BROWSER_ENV" ]; then
  echo -e "${YELLOW}Detected browser environment. Please use the web interface at /parser-test instead.${NC}"
  exit 0
fi

# Run the test with ts-node
# Pass any command line arguments to the test script
echo -e "${BLUE}Starting test...${NC}"
npx ts-node ./src/test/parserTest.ts $FILE_PATH

# Check if the command succeeded
if [ $? -eq 0 ]; then
  echo
  echo -e "${GREEN}Test completed successfully!${NC}"
else
  echo
  echo -e "${RED}Test failed!${NC}"
  exit 1
fi
