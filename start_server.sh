#!/bin/bash
# Kill any process running on port 4000 (often a zombie Jekyll or python server)
lsof -ti:4000 | xargs kill -9 2>/dev/null
# Wait a moment for the port to free up
sleep 1
# Start Jekyll explicitly on port 4000
bundle exec jekyll serve --livereload --port 4000
