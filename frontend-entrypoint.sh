#!/bin/sh
set -ex

echo "--- Frontend Entrypoint Start ---"

INDEX_HTML="/app/dist/index.html"

if [ ! -f "$INDEX_HTML" ]; then
    echo "ERROR: index.html not found at $INDEX_HTML!"
    exit 1
fi

echo "--- Environment Variables ---"
echo "VITE_API_BASE_URL: ${VITE_API_BASE_URL}"
echo "VITE_WS_URL: ${VITE_WS_URL}"
echo "VITE_SIGNALING_URL: ${VITE_SIGNALING_URL}"
echo "VITE_SENTRY_DSN: ${VITE_SENTRY_DSN}"
echo "VITE_DEBUG_PANELS: ${VITE_DEBUG_PANELS}"
echo "---------------------------"

echo "Replacing placeholders in $INDEX_HTML..."

# Use a single sed command for efficiency and clarity.
# The -i flag edits the file in-place.
sed -i \
    -e "s|__VITE_API_BASE_URL__|${VITE_API_BASE_URL}|g" \
    -e "s|__VITE_WS_URL__|${VITE_WS_URL}|g" \
    -e "s|__VITE_SIGNALING_URL__|${VITE_SIGNALING_URL}|g" \
    -e "s|__VITE_SENTRY_DSN__|${VITE_SENTRY_DSN}|g" \
    -e "s|__VITE_DEBUG_PANELS__|${VITE_DEBUG_PANELS}|g" \
    "$INDEX_HTML"

echo "Replacement complete. Verifying content:"
grep "window.runtimeConfig" "$INDEX_HTML"

echo "Starting server..."
echo "Executing command: $@"

# Execute the CMD from the Dockerfile
exec "$@"
